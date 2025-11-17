// REQ-FN-007: E2E tests for Cache Invalidation Admin Endpoint
// Tests POST /admin/cache/invalidate with real Redis and authorization

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { CacheService } from '../src/data-access/services/cache.service';
import { generateCacheKey } from '../src/data-access/utils/cache-key.util';
import { authenticatedPost, getTestHttpServer } from './helpers/request.helper';
import { generateTokenWithoutScopes } from './helpers/auth.helper';

const TEST_INSTANCE_ID = 'test-instance';
const API_PREFIX = process.env.API_PREFIX ?? 'api/v1';
const ADMIN_CACHE_ENDPOINT = `/${API_PREFIX}/admin/cache/invalidate`;
const GLOBAL_PREFIX_EXCLUDE = [
  '/',
  'health',
  'health/liveness',
  'health/readiness',
  'prometheus',
] as const;

describe('REQ-FN-007: Cache Invalidation Admin Endpoint (e2e)', () => {
  let app: INestApplication;
  let cacheService: CacheService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.setGlobalPrefix(API_PREFIX, {
      exclude: [...GLOBAL_PREFIX_EXCLUDE],
    });
    await app.init();

    cacheService = app.get<CacheService>(CacheService);
  });

  afterAll(async () => {
    // Clean up all test keys
    await cacheService.invalidatePattern('cache:test-*');
    await app.close();
  });

  afterEach(async () => {
    // Clean up test keys after each test
    await cacheService.invalidatePattern('cache:test-*');
  });

  describe('POST /admin/cache/invalidate', () => {
    describe('Authorization', () => {
      it('should return 403 without admin:cache scope', async () => {
        const response = await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          { key: 'cache:test:key' },
          { scopes: ['analytics:read'] },
        );

        expect(response.status).toBe(403);
      });

      it('should return 403 with no scopes', async () => {
        const token = generateTokenWithoutScopes();
        const response = await getTestHttpServer(app)
          .post(ADMIN_CACHE_ENDPOINT)
          .set('Authorization', `Bearer ${token}`)
          .send({ key: 'cache:test:key' });

        expect(response.status).toBe(403);
      });

      it('should return 401 without authentication', async () => {
        const response = await getTestHttpServer(app)
          .post(ADMIN_CACHE_ENDPOINT)
          .send({ key: 'cache:test:key' });

        expect(response.status).toBe(401);
      });

      it('should return 200 with admin:cache scope', async () => {
        const response = await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          { key: 'cache:test:nonexistent' },
          { scopes: ['admin:cache'] },
        );

        expect(response.status).toBe(200);
      });
    });

    describe('Single Key Invalidation', () => {
      it('should invalidate a single cache key', async () => {
        const key = generateCacheKey({
          metricId: 'test-invalidate-single',
          instanceId: TEST_INSTANCE_ID,
          scope: 'course',
          filters: { id: '123' },
        });

        // Store a value
        await cacheService.set(key, { test: 'data' });

        // Verify it exists
        let value = await cacheService.get(key);
        expect(value).not.toBeNull();

        // Invalidate via endpoint
        const response = await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          { key },
          { scopes: ['admin:cache'] },
        );

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          status: 'success',
          invalidatedCount: 1,
        });
        expect(response.body.message).toContain(key);
        expect(response.body.timestamp).toBeDefined();

        // Verify it's deleted
        value = await cacheService.get(key);
        expect(value).toBeNull();
      });

      it('should return count 0 for non-existent key', async () => {
        const key = 'cache:test-nonexistent:key';

        const response = await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          { key },
          { scopes: ['admin:cache'] },
        );

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          status: 'success',
          invalidatedCount: 0,
        });
        expect(response.body.message).toContain('not found');
      });
    });

    describe('Pattern-based Invalidation', () => {
      it('should invalidate multiple keys matching pattern', async () => {
        // Create multiple test keys
        const keys = [
          generateCacheKey({
            metricId: 'test-pattern-metrics',
            instanceId: TEST_INSTANCE_ID,
            scope: 'course',
            filters: { id: '1' },
          }),
          generateCacheKey({
            metricId: 'test-pattern-metrics',
            instanceId: TEST_INSTANCE_ID,
            scope: 'course',
            filters: { id: '2' },
          }),
          generateCacheKey({
            metricId: 'test-pattern-metrics',
            instanceId: TEST_INSTANCE_ID,
            scope: 'topic',
            filters: { id: '3' },
          }),
          generateCacheKey({
            metricId: 'test-other',
            instanceId: TEST_INSTANCE_ID,
            scope: 'course',
            filters: { id: '4' },
          }),
        ];

        // Store all
        for (const key of keys) {
          await cacheService.set(key, { test: 'data' });
        }

        // Invalidate pattern
        const pattern = 'cache:test-pattern-metrics:*';
        const response = await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          { pattern },
          { scopes: ['admin:cache'] },
        );

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.invalidatedCount).toBeGreaterThanOrEqual(3);
        expect(response.body.message).toContain(pattern);

        // Verify pattern keys are deleted
        const value1 = await cacheService.get(keys[0]);
        const value2 = await cacheService.get(keys[1]);
        const value3 = await cacheService.get(keys[2]);
        expect(value1).toBeNull();
        expect(value2).toBeNull();
        expect(value3).toBeNull();

        // Verify other key still exists
        const value4 = await cacheService.get(keys[3]);
        expect(value4).not.toBeNull();
      });

      it('should return count 0 for pattern with no matches', async () => {
        const pattern = 'cache:test-nonexistent-pattern:*';

        const response = await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          { pattern },
          { scopes: ['admin:cache'] },
        );

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          status: 'success',
          invalidatedCount: 0,
        });
        expect(response.body.message).toContain('No cache entries found');
      });
    });

    describe('All Entries Invalidation', () => {
      it('should invalidate all cache entries when all is true', async () => {
        // Create test keys
        await cacheService.set(
          generateCacheKey({
            metricId: 'test-all-1',
            instanceId: TEST_INSTANCE_ID,
            scope: 'course',
          }),
          { test: '1' },
        );
        await cacheService.set(
          generateCacheKey({
            metricId: 'test-all-2',
            instanceId: TEST_INSTANCE_ID,
            scope: 'topic',
          }),
          { test: '2' },
        );

        const response = await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          { all: true },
          { scopes: ['admin:cache'] },
        );

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.invalidatedCount).toBeGreaterThanOrEqual(2);
        expect(response.body.message).toContain('all');
      });
    });

    describe('Request Validation', () => {
      it('should return 400 when no operation is specified', async () => {
        const response = await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          {},
          { scopes: ['admin:cache'] },
        );

        expect(response.status).toBe(400);
        expect(response.body.message).toContain(
          'At least one of key, pattern, or all must be specified',
        );
      });

      it('should return 400 when pattern has invalid characters', async () => {
        const response = await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          { pattern: 'cache:test:invalid!@#' },
          { scopes: ['admin:cache'] },
        );

        expect(response.status).toBe(400);
      });

      it('should validate mutual exclusivity (handled by DTO validation)', async () => {
        // This test verifies that DTO validation prevents multiple operations
        // The actual validation happens at the DTO level before reaching the controller
        const response = await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          { key: 'cache:test:key', pattern: 'cache:test:*' },
          { scopes: ['admin:cache'] },
        );

        expect(response.status).toBe(400);
      });
    });

    describe('Response Format', () => {
      it('should return response with all required fields', async () => {
        const response = await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          { key: 'cache:test:format' },
          { scopes: ['admin:cache'] },
        );

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('invalidatedCount');
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('timestamp');

        expect(['success', 'error']).toContain(response.body.status);
        expect(typeof response.body.invalidatedCount).toBe('number');
        expect(typeof response.body.message).toBe('string');
        expect(typeof response.body.timestamp).toBe('string');
      });

      it('should return ISO8601 timestamp', async () => {
        const response = await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          { key: 'cache:test:timestamp' },
          { scopes: ['admin:cache'] },
        );

        expect(response.status).toBe(200);
        expect(response.body.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
      });
    });

    describe('Integration with Cache Service', () => {
      it('should actually delete keys from Redis', async () => {
        const key1 = generateCacheKey({
          metricId: 'test-redis-integration-1',
          instanceId: TEST_INSTANCE_ID,
          scope: 'course',
        });
        const key2 = generateCacheKey({
          metricId: 'test-redis-integration-2',
          instanceId: TEST_INSTANCE_ID,
          scope: 'course',
        });

        // Store values
        await cacheService.set(key1, { value: 'test1' });
        await cacheService.set(key2, { value: 'test2' });

        // Verify they exist
        expect(await cacheService.get(key1)).not.toBeNull();
        expect(await cacheService.get(key2)).not.toBeNull();

        // Invalidate via pattern
        await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          { pattern: 'cache:test-redis-integration-*' },
          { scopes: ['admin:cache'] },
        );

        // Verify they're deleted
        expect(await cacheService.get(key1)).toBeNull();
        expect(await cacheService.get(key2)).toBeNull();
      });

      it('should return accurate count of deleted keys', async () => {
        // Create exactly 3 keys
        const keys = [
          generateCacheKey({
            metricId: 'test-count-accuracy',
            instanceId: TEST_INSTANCE_ID,
            scope: 'course',
            filters: { id: '1' },
          }),
          generateCacheKey({
            metricId: 'test-count-accuracy',
            instanceId: TEST_INSTANCE_ID,
            scope: 'course',
            filters: { id: '2' },
          }),
          generateCacheKey({
            metricId: 'test-count-accuracy',
            instanceId: TEST_INSTANCE_ID,
            scope: 'course',
            filters: { id: '3' },
          }),
        ];

        for (const key of keys) {
          await cacheService.set(key, { test: 'data' });
        }

        const response = await authenticatedPost(
          app,
          ADMIN_CACHE_ENDPOINT,
          { pattern: 'cache:test-count-accuracy:*' },
          { scopes: ['admin:cache'] },
        );

        expect(response.status).toBe(200);
        expect(response.body.invalidatedCount).toBe(3);
      });
    });
  });
});
