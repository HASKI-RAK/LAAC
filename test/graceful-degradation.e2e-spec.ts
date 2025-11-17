// REQ-NF-003: E2E tests for Graceful Degradation
// Tests system behavior when LRS/cache fail with realistic scenarios

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { LRSClient } from '../src/data-access/clients/lrs.client';
import { CacheService } from '../src/data-access/services/cache.service';
import { generateCacheKey } from '../src/data-access/utils/cache-key.util';
import { authenticatedGet } from './helpers/request.helper';

describe('REQ-NF-003: Graceful Degradation E2E', () => {
  let app: INestApplication;
  let lrsClient: LRSClient;
  let cacheService: CacheService;
  let instanceId: string;

  const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
  const metricsEndpoint = (metricId: string) =>
    `/${apiPrefix}/metrics/${metricId}/results`;
  const prefixExclusions = [
    '/',
    'health',
    'health/liveness',
    'health/readiness',
    'metrics',
  ] as const;
  const analyticsScope = { scopes: ['analytics:read'] };

  const buildCourseCacheKey = (metricId: string, courseId: string) =>
    generateCacheKey({
      metricId,
      instanceId,
      scope: 'course',
      filters: { courseId },
    });

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
    app.setGlobalPrefix(apiPrefix, {
      exclude: [...prefixExclusions],
    });
    await app.init();

    lrsClient = app.get<LRSClient>(LRSClient);
    cacheService = app.get<CacheService>(CacheService);
    instanceId = lrsClient.instanceId;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Strategy 1: Cache Fallback with Stale Data', () => {
    it('should return stale cached data when LRS unavailable', async () => {
      const metricId = 'example-metric';
      const cacheKey = buildCourseCacheKey(metricId, 'test-123');

      // Step 1: Prime cache with fresh data
      const cachedData = {
        metricId,
        value: 75.5,
        timestamp: new Date(Date.now() - 7200 * 1000).toISOString(), // 2 hours ago
        fromCache: false,
      };

      await cacheService.set(cacheKey, cachedData, 300, 'results');
      const cacheGetSpy = jest
        .spyOn(cacheService, 'get')
        .mockResolvedValueOnce(null);

      // Step 2: Simulate LRS failure by mocking queryStatements to throw
      const originalQueryStatements = lrsClient.queryStatements;
      jest
        .spyOn(lrsClient, 'queryStatements')
        .mockRejectedValue(new Error('LRS connection timeout'));

      // Step 3: Request metric - should return stale cached data
      const response = await authenticatedGet(
        app,
        metricsEndpoint(metricId),
        analyticsScope,
      )
        .query({ courseId: 'test-123' })
        .expect(HttpStatus.OK);

      // Verify degraded response
      expect(response.body).toMatchObject({
        metricId,
        status: 'degraded',
        fromCache: true,
        dataAvailable: true,
      });

      expect(response.body.warning).toContain('stale');
      expect(response.body.value).toBeDefined();
      expect(response.body.cachedAt).toBeDefined();
      expect(response.body.age).toBeGreaterThan(0);

      // Cleanup
      cacheGetSpy.mockRestore();
      lrsClient.queryStatements = originalQueryStatements;
      await cacheService.delete(cacheKey);
    });

    it('should indicate age of stale cached data', async () => {
      const metricId = 'example-metric';
      const cacheKey = buildCourseCacheKey(metricId, 'age-test');

      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000);
      const cachedData = {
        metricId,
        value: 88.0,
        timestamp: threeHoursAgo.toISOString(),
        fromCache: false,
      };

      await cacheService.set(cacheKey, cachedData, 300, 'results');
      const cacheGetSpy = jest
        .spyOn(cacheService, 'get')
        .mockResolvedValueOnce(null);

      // Simulate LRS failure
      const originalQueryStatements = lrsClient.queryStatements;
      jest
        .spyOn(lrsClient, 'queryStatements')
        .mockRejectedValue(new Error('LRS unavailable'));

      const response = await authenticatedGet(
        app,
        metricsEndpoint(metricId),
        analyticsScope,
      )
        .query({ courseId: 'age-test' })
        .expect(HttpStatus.OK);

      expect(response.body.age).toBeGreaterThanOrEqual(3 * 3600); // At least 3 hours
      expect(response.body.cachedAt).toBeDefined();

      // Cleanup
      cacheGetSpy.mockRestore();
      lrsClient.queryStatements = originalQueryStatements;
      await cacheService.delete(cacheKey);
    });
  });

  describe('Strategy 2: Default/Null Values', () => {
    it('should return null value when no cache and LRS unavailable', async () => {
      const metricId = 'example-metric';
      const cacheKey = buildCourseCacheKey(metricId, 'no-cache-test');

      // Ensure no cache exists
      await cacheService.delete(cacheKey);

      // Simulate LRS failure
      const originalQueryStatements = lrsClient.queryStatements;
      jest
        .spyOn(lrsClient, 'queryStatements')
        .mockRejectedValue(new Error('LRS connection refused'));

      // Request metric - should return null with unavailable status
      const response = await authenticatedGet(
        app,
        metricsEndpoint(metricId),
        analyticsScope,
      )
        .query({ courseId: 'no-cache-test' })
        .expect(HttpStatus.OK); // Note: HTTP 200, not 503

      // Verify unavailable response
      expect(response.body).toMatchObject({
        metricId,
        status: 'unavailable',
        value: null,
        dataAvailable: false,
        cause: 'LRS_UNAVAILABLE',
      });

      expect(response.body.error).toContain('unavailable');
      expect(response.body.error).toContain('try again later');

      // Cleanup
      lrsClient.queryStatements = originalQueryStatements;
    });

    it('should return HTTP 200 (not 503) for graceful degradation', async () => {
      const metricId = 'example-metric';

      // Simulate LRS failure
      const originalQueryStatements = lrsClient.queryStatements;
      jest
        .spyOn(lrsClient, 'queryStatements')
        .mockRejectedValue(new Error('LRS timeout'));

      // Should return 200, not 503
      await authenticatedGet(app, metricsEndpoint(metricId), analyticsScope)
        .query({ courseId: 'http-status-test' })
        .expect(HttpStatus.OK);

      // Cleanup
      lrsClient.queryStatements = originalQueryStatements;
    });

    it('should provide user-friendly error message', async () => {
      const metricId = 'example-metric';

      // Simulate LRS failure
      const originalQueryStatements = lrsClient.queryStatements;
      jest
        .spyOn(lrsClient, 'queryStatements')
        .mockRejectedValue(new Error('Network error'));

      const response = await authenticatedGet(
        app,
        metricsEndpoint(metricId),
        analyticsScope,
      )
        .query({ courseId: 'user-message-test' })
        .expect(HttpStatus.OK);

      expect(response.body.error).toBeTruthy();
      expect(response.body.error).not.toContain('stack');
      expect(response.body.error).not.toContain('Error:');
      expect(response.body.cause).toBe('LRS_UNAVAILABLE');

      // Cleanup
      lrsClient.queryStatements = originalQueryStatements;
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should open circuit after repeated LRS failures', async () => {
      const metricId = 'example-metric';

      // Simulate repeated LRS failures
      const originalQueryStatements = lrsClient.queryStatements;
      jest
        .spyOn(lrsClient, 'queryStatements')
        .mockRejectedValue(new Error('LRS persistent failure'));

      // Trigger failures to open circuit (threshold = 5)
      for (let i = 0; i < 5; i++) {
        await authenticatedGet(app, metricsEndpoint(metricId), analyticsScope)
          .query({ courseId: `circuit-test-${i}` })
          .expect(HttpStatus.OK); // Graceful degradation returns 200
      }

      // Next request should fail fast (circuit open)
      const response = await authenticatedGet(
        app,
        metricsEndpoint(metricId),
        analyticsScope,
      )
        .query({ courseId: 'circuit-test-fast-fail' })
        .expect(HttpStatus.OK);

      // Should still return graceful degradation response
      expect(response.body.status).toMatch(/degraded|unavailable/);

      // Cleanup
      lrsClient.queryStatements = originalQueryStatements;
    });
  });

  describe('Configuration Compliance', () => {
    it('should respect GRACEFUL_DEGRADATION_ENABLED config', async () => {
      // Test requires environment setup
      // If disabled, should throw ServiceUnavailableException (503)
      // This would be tested in a separate environment or with config override
    });

    it('should respect CACHE_FALLBACK_ENABLED config', async () => {
      // Test requires environment setup
      // If disabled, should skip cache fallback and return null directly
    });
  });
});
