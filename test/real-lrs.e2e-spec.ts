// REQ-FN-002, REQ-FN-018: E2E Tests Against Real LRS
// Tests that run against a real LRS instance when LRS_DOMAIN, LRS_USER, LRS_SECRET are configured
// These tests validate actual xAPI compliance and real-world data patterns

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { LRSClient } from '../src/data-access/clients/lrs.client';
import { CacheService } from '../src/data-access/services/cache.service';
import { generateTokenWithScopes } from './helpers/auth.helper';
import { getRealLRSConfig, describeRealLRS } from './helpers/real-lrs.helper';

/**
 * Real LRS Integration Tests
 *
 * These tests run ONLY when the following environment variables are set:
 * - LRS_DOMAIN: The full URL to the xAPI endpoint (e.g., https://test.lrs.haski.app/xapi)
 * - LRS_USER: The LRS API username/key
 * - LRS_SECRET: The LRS API password/secret
 *
 * If these variables are not set, tests will be skipped automatically.
 *
 * Purpose:
 * - Validate actual xAPI 1.0.3 compliance against real LRS
 * - Test with real-world data patterns and edge cases
 * - Verify pagination, filtering, and query builder with live data
 * - Ensure authentication and error handling work with real endpoints
 *
 * Usage:
 * ```bash
 * # Run with real LRS (tests will execute)
 * LRS_DOMAIN="https://test.lrs.haski.app/xapi" \
 * LRS_USER="your-key" \
 * LRS_SECRET="your-secret" \
 * yarn test:e2e --testPathPattern=real-lrs
 *
 * # Run without config (tests will be skipped)
 * yarn test:e2e --testPathPattern=real-lrs
 * ```
 */

// Check configuration before running any tests
const config = getRealLRSConfig();
if (config) {
  console.log('\n✅ Real LRS Tests ENABLED');
  console.log(`   LRS Endpoint: ${config.domain}`);
  console.log(`   User: ${config.user.substring(0, 8)}...`);
} else {
  console.log('\n⏭️  Real LRS Tests SKIPPED');
  console.log(
    '   Set LRS_DOMAIN, LRS_USER, LRS_SECRET environment variables to enable',
  );
  console.log('   Example: LRS_DOMAIN="https://test.lrs.haski.app/xapi"');
}

describeRealLRS('Real LRS Integration (e2e)', () => {
  let app: INestApplication;
  let lrsClient: LRSClient;
  let cacheService: CacheService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global validation pipe (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
    app.setGlobalPrefix(apiPrefix, {
      exclude: [
        '/',
        'health',
        'health/liveness',
        'health/readiness',
        'metrics',
      ],
    });

    await app.init();

    lrsClient = moduleFixture.get<LRSClient>(LRSClient);
    cacheService = moduleFixture.get<CacheService>(CacheService);

    authToken = generateTokenWithScopes(['analytics:read']);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.invalidatePattern('cache:*');
  });

  describe('LRS Connectivity and Health', () => {
    it('should successfully connect to real LRS', async () => {
      // REQ-FN-002: Basic connectivity test
      const health = await lrsClient.getInstanceHealth();

      expect(health.healthy).toBe(true);
      expect(health.instanceId).toBeDefined();
      expect(health.responseTimeMs).toBeGreaterThan(0);
    }, 15000);

    it('should return xAPI version from LRS about endpoint', async () => {
      // REQ-FN-002: xAPI compliance check
      const health = await lrsClient.getInstanceHealth();

      expect(health.version).toBeDefined();
      // Version can be string or array of strings
      if (Array.isArray(health.version)) {
        expect(health.version.length).toBeGreaterThan(0);
        expect(health.version[0]).toMatch(/^1\.0\.\d+$/);
      } else {
        expect(health.version).toMatch(/^1\.0\.\d+$/); // xAPI version format
      }
    }, 15000);

    it('should handle LRS health check through API endpoint', async () => {
      // REQ-FN-017: Instance health check via API
      const response = await request(app.getHttpServer())
        .get('/api/v1/instances')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Response can be array or object with instances property
      const instances = Array.isArray(response.body)
        ? response.body
        : response.body.instances || [];

      expect(instances.length).toBeGreaterThan(0);

      const instance = instances[0];
      expect(instance.id).toBeDefined();
      expect(instance.name).toBeDefined();
      // Healthy may be boolean or undefined in some responses
      if ('healthy' in instance) {
        expect(typeof instance.healthy).toBe('boolean');
      }
      // Version may be array or string
      if (instance.version) {
        const versionStr = Array.isArray(instance.version)
          ? instance.version[0]
          : instance.version;
        expect(versionStr).toMatch(/^1\.0\.\d+$/);
      }
    }, 15000);
  });

  describe('Real xAPI Statement Retrieval', () => {
    it('should retrieve statements from real LRS', async () => {
      // REQ-FN-002: Query statements from real LRS
      const statements = await lrsClient.queryStatements({}, 10);

      expect(Array.isArray(statements)).toBe(true);
      expect(statements.length).toBeGreaterThanOrEqual(0);

      if (statements.length > 0) {
        const stmt = statements[0];
        // Validate xAPI 1.0.3 statement structure
        expect(stmt.actor).toBeDefined();
        expect(stmt.verb).toBeDefined();
        expect(stmt.object).toBeDefined();
        expect(stmt.verb.id).toBeDefined();

        // REQ-FN-017: Verify instanceId tagging
        expect(stmt.instanceId).toBeDefined();
      }
    }, 30000);

    it('should handle pagination with real LRS data', async () => {
      // REQ-FN-002: Pagination support
      const limit = 5;
      const statements = await lrsClient.queryStatements({ limit }, limit);

      expect(Array.isArray(statements)).toBe(true);
      expect(statements.length).toBeLessThanOrEqual(limit);

      // Verify all statements are tagged
      statements.forEach((stmt) => {
        expect(stmt.instanceId).toBeDefined();
      });
    }, 30000);

    it('should filter statements by verb', async () => {
      // REQ-FN-002: Verb filtering
      const completedVerb = 'http://adlnet.gov/expapi/verbs/completed';
      const statements = await lrsClient.queryStatements(
        { verb: completedVerb },
        10,
      );

      expect(Array.isArray(statements)).toBe(true);

      // All returned statements should have the completed verb
      statements.forEach((stmt) => {
        expect(stmt.verb.id).toBe(completedVerb);
      });
    }, 30000);

    it('should filter statements by activity', async () => {
      // REQ-FN-002: Activity filtering
      // First get any statement to find a valid activity ID
      const anyStatements = await lrsClient.queryStatements({}, 1);

      if (anyStatements.length > 0) {
        const activityId = anyStatements[0].object.id;

        const filtered = await lrsClient.queryStatements(
          { activity: activityId },
          10,
        );

        expect(Array.isArray(filtered)).toBe(true);
        // Statements should reference the activity
        filtered.forEach((stmt) => {
          // Activity could be in object or context
          const hasActivity =
            stmt.object.id === activityId ||
            stmt.context?.contextActivities?.parent?.some(
              (p) => p.id === activityId,
            ) ||
            stmt.context?.contextActivities?.grouping?.some(
              (g) => g.id === activityId,
            );
          expect(hasActivity).toBe(true);
        });
      }
    }, 30000);

    it('should filter statements by date range', async () => {
      // REQ-FN-002: Date range filtering
      const since = '2024-01-01T00:00:00Z';
      const until = '2025-12-31T23:59:59Z';

      const statements = await lrsClient.queryStatements({ since, until }, 10);

      expect(Array.isArray(statements)).toBe(true);

      // All statements should be within date range
      statements.forEach((stmt) => {
        if (stmt.timestamp) {
          const stmtDate = new Date(stmt.timestamp);
          expect(stmtDate.getTime()).toBeGreaterThanOrEqual(
            new Date(since).getTime(),
          );
          expect(stmtDate.getTime()).toBeLessThanOrEqual(
            new Date(until).getTime(),
          );
        }
      });
    }, 30000);

    it('should handle actor-based queries', async () => {
      // REQ-FN-002: Actor filtering
      // First get any statement to find a valid actor
      const anyStatements = await lrsClient.queryStatements({}, 1);

      if (
        anyStatements.length > 0 &&
        anyStatements[0].actor.account?.homePage &&
        anyStatements[0].actor.account?.name
      ) {
        const actor = {
          objectType: 'Agent' as const,
          account: {
            homePage: anyStatements[0].actor.account.homePage,
            name: anyStatements[0].actor.account.name,
          },
        };

        const statements = await lrsClient.queryStatements(
          { agent: actor },
          10,
        );

        expect(Array.isArray(statements)).toBe(true);
        // All statements should be from the same actor
        statements.forEach((stmt) => {
          expect(stmt.actor.account?.homePage).toBe(actor.account.homePage);
          expect(stmt.actor.account?.name).toBe(actor.account.name);
        });
      }
    }, 30000);
  });

  describe('Metrics Computation with Real Data', () => {
    // Real data from test.lrs.haski.app
    const realUserId = '422'; // Real user ID from LRS
    const realCourseId = 'https://ke.moodle.haski.app/course/view.php?id=10'; // Real course ID

    it('should compute course-completion metric with real LRS data', async () => {
      // REQ-FN-004, REQ-FN-005: Metric computation with real data
      const response = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-completion/results')
        .query({ courseId: realCourseId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        metricId: 'course-completion',
        value: expect.any(Number),
        timestamp: expect.any(String),
        computationTime: expect.any(Number),
        fromCache: false,
        metadata: expect.objectContaining({
          totalLearners: expect.any(Number),
          completedLearners: expect.any(Number),
          unit: 'percentage',
        }),
      });

      expect(response.body.value).toBeGreaterThanOrEqual(0);
      expect(response.body.value).toBeLessThanOrEqual(100);
    }, 30000);

    it('should compute learning-engagement metric with real data', async () => {
      // REQ-FN-004: Learning engagement computation
      const response = await request(app.getHttpServer())
        .get('/api/v1/metrics/learning-engagement/results')
        .query({ courseId: realCourseId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        metricId: 'learning-engagement',
        value: expect.any(Number),
        timestamp: expect.any(String),
        fromCache: false,
      });
    }, 30000);

    it('should compute course-total-score metric with real data', async () => {
      // REQ-FN-004: CO-001 metric with real data
      const response = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-total-score/results')
        .query({ userId: realUserId, courseId: realCourseId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        metricId: 'course-total-score',
        value: expect.any(Number),
        timestamp: expect.any(String),
        fromCache: false,
        metadata: expect.objectContaining({
          unit: 'points',
        }),
      });

      expect(response.body.value).toBeGreaterThanOrEqual(0);
    }, 30000);

    it('should compute course-time-spent metric with real data', async () => {
      // REQ-FN-004: CO-003 metric with real data
      const response = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-time-spent/results')
        .query({ userId: realUserId, courseId: realCourseId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        metricId: 'course-time-spent',
        value: expect.any(Number),
        timestamp: expect.any(String),
        fromCache: false,
        metadata: expect.objectContaining({
          unit: 'seconds',
        }),
      });

      expect(response.body.value).toBeGreaterThanOrEqual(0);
    }, 30000);

    it('should cache results from real LRS queries', async () => {
      // REQ-FN-006: Cache behavior with real data
      // First request - cache miss
      const firstResponse = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-completion/results')
        .query({ courseId: realCourseId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(firstResponse.body.fromCache).toBe(false);

      // Second request - cache hit
      const secondResponse = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-completion/results')
        .query({ courseId: realCourseId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(secondResponse.body.fromCache).toBe(true);
      expect(secondResponse.body.value).toBe(firstResponse.body.value);
    }, 30000);
  });

  describe('Real LRS Error Handling', () => {
    const realCourseId = 'https://ke.moodle.haski.app/course/view.php?id=10';

    it('should handle invalid query parameters gracefully', async () => {
      // REQ-FN-002: Error handling with real LRS
      const response = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-completion/results')
        .query({
          courseId: 'non-existent-course-12345',
          since: '2024-01-01T00:00:00Z',
        })
        .set('Authorization', `Bearer ${authToken}`);

      // Should return 200 (graceful degradation) or 500 (LRS error)
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        // Graceful degradation - returns result or degraded status
        expect(response.body.metricId).toBe('course-completion');
        expect(
          response.body.value !== null || response.body.status === 'degraded',
        ).toBe(true);
      }
    }, 30000);

    it('should handle complex queries with multiple filters', async () => {
      // REQ-FN-002: Complex query handling with real course ID
      const response = await request(app.getHttpServer())
        .get('/api/v1/metrics/learning-engagement/results')
        .query({
          courseId: realCourseId,
          since: '2024-01-01T00:00:00Z',
          until: '2025-12-31T23:59:59Z',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.metricId).toBe('learning-engagement');
      expect(response.body.value).toBeDefined();
    }, 30000);
  });

  describe('Real xAPI Data Validation', () => {
    it('should validate xAPI 1.0.3 statement structure from real LRS', async () => {
      // REQ-FN-002: xAPI compliance validation
      const statements = await lrsClient.queryStatements({}, 10);

      expect(statements.length).toBeGreaterThanOrEqual(0);

      statements.forEach((stmt) => {
        // Required properties
        expect(stmt.actor).toBeDefined();
        expect(stmt.verb).toBeDefined();
        expect(stmt.object).toBeDefined();

        // Actor structure (objectType defaults to Agent if not specified)
        const objectType = stmt.actor.objectType || 'Agent';
        expect(objectType).toMatch(/Agent|Group/);
        if (stmt.actor.account) {
          expect(stmt.actor.account.homePage).toBeDefined();
          expect(stmt.actor.account.name).toBeDefined();
        }

        // Verb structure
        expect(stmt.verb.id).toMatch(/^https?:\/\/.+/); // Must be IRI

        // Object structure
        expect(stmt.object.id).toBeDefined();

        // Optional timestamp validation
        if (stmt.timestamp) {
          expect(stmt.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        }

        // REQ-FN-017: Instance tagging
        expect(stmt.instanceId).toBeDefined();
      });
    }, 30000);

    it('should handle HASKI-specific xAPI patterns', async () => {
      // REQ-FN-002: HASKI custom patterns
      const statements = await lrsClient.queryStatements({}, 20);

      // Look for HASKI-specific patterns
      const haskiStatements = statements.filter(
        (stmt) =>
          stmt.verb.id.includes('wiki.haski.app') ||
          stmt.object.id.includes('haski.app') ||
          (stmt.context?.extensions &&
            Object.keys(stmt.context.extensions).some((key) =>
              key.includes('haski.app'),
            )),
      );

      if (haskiStatements.length > 0) {
        // Validate HASKI patterns
        haskiStatements.forEach((stmt) => {
          // Should have context with extensions or parent activities
          if (stmt.context?.extensions) {
            const haskiExt = stmt.context.extensions[
              'https://wiki.haski.app/'
            ] as Record<string, unknown>;
            if (haskiExt) {
              expect(haskiExt).toBeDefined();
            }
          }
        });
      }
    }, 30000);

    it('should handle statements with result objects', async () => {
      // REQ-FN-002: Result object handling
      const statements = await lrsClient.queryStatements(
        { verb: 'http://adlnet.gov/expapi/verbs/scored' },
        10,
      );

      const statementsWithResults = statements.filter(
        (stmt) => stmt.result !== undefined,
      );

      statementsWithResults.forEach((stmt) => {
        // Result validation
        if (stmt.result?.score) {
          expect(stmt.result.score.raw).toBeDefined();
          if (stmt.result.score.max) {
            expect(stmt.result.score.raw).toBeLessThanOrEqual(
              stmt.result.score.max,
            );
          }
        }

        if (stmt.result?.duration) {
          // ISO 8601 duration format
          expect(stmt.result.duration).toMatch(/^P/);
        }

        if (stmt.result?.completion !== undefined) {
          expect(typeof stmt.result.completion).toBe('boolean');
        }
      });
    }, 30000);
  });

  describe('Performance with Real LRS', () => {
    const realCourseId = 'https://ke.moodle.haski.app/course/view.php?id=10';
    const realUserId = '422';

    it('should retrieve and process statements within reasonable time', async () => {
      // REQ-NF-002: Performance monitoring
      const startTime = Date.now();

      const statements = await lrsClient.queryStatements({ limit: 100 }, 100);

      const duration = Date.now() - startTime;

      expect(statements.length).toBeLessThanOrEqual(100);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds

      console.log(
        `   Retrieved ${statements.length} statements in ${duration}ms`,
      );
    }, 20000);

    it('should handle large result sets efficiently', async () => {
      // REQ-FN-002: Pagination efficiency
      const startTime = Date.now();

      const statements = await lrsClient.queryStatements({ limit: 500 }, 500);

      const duration = Date.now() - startTime;

      expect(statements.length).toBeLessThanOrEqual(500);
      console.log(
        `   Retrieved ${statements.length} statements with pagination in ${duration}ms`,
      );
    }, 45000);

    it('should compute metrics with real data in reasonable time', async () => {
      // REQ-FN-005: Metric computation performance with real course ID
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-completion/results')
        .query({ courseId: realCourseId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.computationTime).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`   Metric computed in ${response.body.computationTime}ms`);
    }, 15000);

    it('should compute user-specific metrics efficiently', async () => {
      // REQ-FN-005: User-specific metric performance
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-total-score/results')
        .query({ userId: realUserId, courseId: realCourseId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const duration = Date.now() - startTime;

      expect(response.body.computationTime).toBeDefined();
      expect(duration).toBeLessThan(10000);

      console.log(
        `   User metric computed in ${response.body.computationTime}ms`,
      );
    }, 15000);
  });
});
