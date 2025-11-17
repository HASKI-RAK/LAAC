// E2E tests for Metrics Results Endpoint
// Implements REQ-FN-005: GET /api/v1/metrics/:id/results endpoint

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CacheService } from '../src/data-access/services/cache.service';
import { LRSClient } from '../src/data-access/clients/lrs.client';
import { xAPIStatement } from '../src/data-access';
import { generateTokenWithScopes } from './helpers/auth.helper';

describe('REQ-FN-005: Metrics Results Endpoint (e2e)', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  let lrsClient: LRSClient;
  let authToken: string;

  // Mock xAPI statements
  const mockStatements: xAPIStatement[] = [
    {
      id: 'stmt-1',
      actor: {
        objectType: 'Agent',
        name: 'Student 1',
        account: { name: 'student-1', homePage: 'http://example.com' },
      },
      verb: {
        id: 'https://wiki.haski.app/variables/xapi.completed',
        display: { 'en-US': 'completed' },
      },
      object: {
        id: 'course-123',
        objectType: 'Activity',
        definition: { name: { 'en-US': 'Test Course' } },
      },
      timestamp: '2025-11-13T10:00:00Z',
    },
    {
      id: 'stmt-2',
      actor: {
        objectType: 'Agent',
        name: 'Student 2',
        account: { name: 'student-2', homePage: 'http://example.com' },
      },
      verb: {
        id: 'https://wiki.haski.app/variables/xapi.completed',
        display: { 'en-US': 'completed' },
      },
      object: {
        id: 'course-123',
        objectType: 'Activity',
        definition: { name: { 'en-US': 'Test Course' } },
      },
      timestamp: '2025-11-13T10:15:00Z',
    },
  ];

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

    cacheService = moduleFixture.get<CacheService>(CacheService);
    lrsClient = moduleFixture.get<LRSClient>(LRSClient);

    authToken = generateTokenWithScopes(['analytics:read']);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.invalidatePattern('cache:*');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/metrics/:id/results', () => {
    describe('Successful Computation', () => {
      it('should compute course-completion metric', async () => {
        // REQ-FN-005: Compute metric with cache miss
        // Mock LRS response since we're running without seed data
        const querySpy = jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
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

        querySpy.mockRestore();
      });

      it('should support time-based filtering', async () => {
        // REQ-FN-005: Time range filters
        const querySpy = jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({
            courseId: 'course-123',
            since: '2025-01-01T00:00:00Z',
            until: '2025-12-31T23:59:59Z',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.fromCache).toBe(false);
        expect(querySpy).toHaveBeenCalledWith(
          expect.objectContaining({
            since: '2025-01-01T00:00:00Z',
            until: '2025-12-31T23:59:59Z',
          }),
        );

        querySpy.mockRestore();
      });

      describe('Parameter-aware LRS filters', () => {
        it('should translate courseId to activity filter', async () => {
          const querySpy = jest
            .spyOn(lrsClient, 'queryStatements')
            .mockResolvedValue(mockStatements);

          await request(app.getHttpServer())
            .get('/api/v1/metrics/course-completion/results')
            .query({ courseId: 'course-abc' })
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(querySpy).toHaveBeenCalledWith(
            expect.objectContaining({
              activity: 'course-abc',
              related_activities: true,
            }),
          );

          querySpy.mockRestore();
        });

        it('should prefer topicId when provided', async () => {
          const querySpy = jest
            .spyOn(lrsClient, 'queryStatements')
            .mockResolvedValue(mockStatements);

          await request(app.getHttpServer())
            .get('/api/v1/metrics/topic-mastery/results')
            .query({ courseId: 'course-abc', topicId: 'topic-xyz' })
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(querySpy).toHaveBeenCalledWith(
            expect.objectContaining({
              activity: 'topic-xyz',
              related_activities: true,
            }),
          );

          querySpy.mockRestore();
        });

        it('should prefer elementId for most specific scope', async () => {
          const querySpy = jest
            .spyOn(lrsClient, 'queryStatements')
            .mockResolvedValue(mockStatements);

          await request(app.getHttpServer())
            .get('/api/v1/metrics/course-completion/results')
            .query({ courseId: 'course-abc', elementId: 'element-111' })
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(querySpy).toHaveBeenCalledWith(
            expect.objectContaining({
              activity: 'element-111',
              related_activities: false,
            }),
          );

          querySpy.mockRestore();
        });
      });
    });

    describe('Cache Behavior', () => {
      it('should serve result from cache on second request', async () => {
        // REQ-FN-006: Cache-aside pattern - cache hit
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        // First request - cache miss
        const querySpy = jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const firstResponse = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(firstResponse.body.fromCache).toBe(false);

        // Second request - cache hit
        const secondResponse = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(secondResponse.body.fromCache).toBe(true);
        expect(secondResponse.body.value).toBe(firstResponse.body.value);

        // LRS should only be called once (for first request)
        expect(querySpy).toHaveBeenCalledTimes(1);
        querySpy.mockRestore();
      });

      it('should cache results with different parameters separately', async () => {
        // REQ-FN-006: Cache key differentiation
        const querySpy = jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        // Request with courseId=course-123
        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Request with courseId=course-456 (different cache key)
        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-456' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.fromCache).toBe(false);
        expect(querySpy).toHaveBeenCalledTimes(2);
        querySpy.mockRestore();
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for nonexistent metric', async () => {
        // REQ-FN-005: Metric not found
        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/nonexistent-metric/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.message).toContain('not found in catalog');
      });

      it('should return 400 for invalid parameters', async () => {
        // REQ-FN-005: Parameter validation error
        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({}) // Missing required courseId
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.message).toContain('required');
      });

      it('should return 400 for invalid ISO 8601 timestamp', async () => {
        // REQ-FN-024: Input validation
        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({
            courseId: 'course-123',
            since: 'invalid-date',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        const message = response.body.message;
        if (Array.isArray(message)) {
          expect(message).toEqual(
            expect.arrayContaining([
              'since must be a valid ISO 8601 timestamp',
            ]),
          );
        } else {
          expect(message).toContain('ISO 8601');
        }
      });

      it('should return graceful degradation response when LRS is unavailable', async () => {
        // REQ-NF-003: Graceful degradation
        const querySpy = jest
          .spyOn(lrsClient, 'queryStatements')
          .mockRejectedValue(new Error('LRS connection failed'));

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.status).toMatch(/degraded|unavailable/);
        expect(response.body.value).toBeNull();
        expect(response.body.cause).toBe('LRS_UNAVAILABLE');
        expect(response.body.error || response.body.warning).toBeTruthy();
        querySpy.mockRestore();
      });

      it('should return 401 without authentication token', async () => {
        // REQ-FN-023: Authentication required
        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .expect(401);
      });
    });

    describe('Multiple Metrics', () => {
      it('should compute learning-engagement metric', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/learning-engagement/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          metricId: 'learning-engagement',
          value: expect.any(Number),
          fromCache: false,
        });
      });

      it('should compute topic-mastery metric', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/topic-mastery/results')
          .query({
            courseId: 'course-123',
            topicId: 'topic-456',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          metricId: 'topic-mastery',
          value: expect.any(Number),
          fromCache: false,
        });
      });
    });

    describe('Response Format', () => {
      it('should include all required fields in response', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // REQ-FN-005: Response structure
        expect(response.body).toHaveProperty('metricId');
        expect(response.body).toHaveProperty('value');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('computationTime');
        expect(response.body).toHaveProperty('fromCache');
        expect(response.body).toHaveProperty('metadata');

        // Validate timestamp format (ISO 8601)
        expect(response.body.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
      });

      it('should return computation time in milliseconds', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.computationTime).toBeGreaterThanOrEqual(0);
        expect(response.body.computationTime).toBeLessThan(10000); // Less than 10 seconds
      });
    });

    describe('CSV-Compliant Course Metrics (REQ-FN-004, Story 14.1)', () => {
      // Mock xAPI statements with scores and durations for course metrics
      const courseMetricStatements: xAPIStatement[] = [
        {
          id: 'stmt-score-1',
          actor: {
            objectType: 'Agent',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/scored',
            display: { 'en-US': 'scored' },
          },
          object: {
            id: 'element-1',
            objectType: 'Activity',
            definition: { name: { 'en-US': 'Quiz 1' } },
          },
          result: {
            score: { raw: 85, max: 100 },
            duration: 'PT15M',
          },
          timestamp: '2025-11-13T10:00:00Z',
        },
        {
          id: 'stmt-score-2',
          actor: {
            objectType: 'Agent',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/scored',
            display: { 'en-US': 'scored' },
          },
          object: {
            id: 'element-2',
            objectType: 'Activity',
            definition: { name: { 'en-US': 'Quiz 2' } },
          },
          result: {
            score: { raw: 92, max: 100 },
            duration: 'PT20M',
          },
          timestamp: '2025-11-14T10:00:00Z',
        },
        {
          id: 'stmt-completion-1',
          actor: {
            objectType: 'Agent',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
          },
          object: {
            id: 'element-1',
            objectType: 'Activity',
            definition: { name: { 'en-US': 'Quiz 1' } },
          },
          result: { completion: true },
          timestamp: '2025-11-13T10:15:00Z',
        },
      ];

      it('should compute course-total-score metric (CO-001)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-total-score/results')
          .query({ userId: 'student-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          metricId: 'course-total-score',
          value: 177, // 85 + 92
          fromCache: false,
          metadata: expect.objectContaining({
            unit: 'points',
            elementCount: 2,
          }),
        });
      });

      it('should compute course-max-score metric (CO-002)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-max-score/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          metricId: 'course-max-score',
          value: 200, // 100 + 100 (2 elements with max 100 each)
          fromCache: false,
          metadata: expect.objectContaining({
            unit: 'points',
            elementCount: 2,
          }),
        });
      });

      it('should compute course-time-spent metric (CO-003)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-time-spent/results')
          .query({ userId: 'student-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          metricId: 'course-time-spent',
          value: 2100, // PT15M (900s) + PT20M (1200s) = 2100s
          fromCache: false,
          metadata: expect.objectContaining({
            unit: 'seconds',
            activityCount: 2,
          }),
        });
      });

      it('should compute course-last-elements metric (CO-004)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-last-elements/results')
          .query({ userId: 'student-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('course-last-elements');
        expect(Array.isArray(response.body.value)).toBe(true);
        expect(response.body.fromCache).toBe(false);
        expect(response.body.metadata).toHaveProperty('count');
      });

      it('should compute course-completion-dates metric (CO-005)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion-dates/results')
          .query({ userId: 'student-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('course-completion-dates');
        expect(Array.isArray(response.body.value)).toBe(true);
        expect(response.body.fromCache).toBe(false);
        expect(response.body.value.length).toBeGreaterThanOrEqual(0);
        expect(response.body.metadata).toHaveProperty('count');
      });

      it('should validate required parameters for course metrics', async () => {
        // CO-001 requires userId and courseId
        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-total-score/results')
          .query({ courseId: 'course-123' }) // Missing userId
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        // CO-002 requires courseId only
        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-max-score/results')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should cache course metric results', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        // First request - cache miss
        const firstResponse = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-total-score/results')
          .query({ userId: 'student-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(firstResponse.body.fromCache).toBe(false);

        // Second request - cache hit
        const secondResponse = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-total-score/results')
          .query({ userId: 'student-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(secondResponse.body.fromCache).toBe(true);
        expect(secondResponse.body.value).toBe(firstResponse.body.value);
      });
    });
  });
});
