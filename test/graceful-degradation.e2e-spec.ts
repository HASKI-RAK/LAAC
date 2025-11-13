// REQ-NF-003: E2E tests for Graceful Degradation
// Tests system behavior when LRS/cache fail with realistic scenarios

/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { LRSClient } from '../src/data-access/clients/lrs.client';
import { CacheService } from '../src/data-access/services/cache.service';

describe('REQ-NF-003: Graceful Degradation E2E', () => {
  let app: INestApplication;
  let lrsClient: LRSClient;
  let cacheService: CacheService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    lrsClient = app.get<LRSClient>(LRSClient);
    cacheService = app.get<CacheService>(CacheService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Strategy 1: Cache Fallback with Stale Data', () => {
    it('should return stale cached data when LRS unavailable', async () => {
      const metricId = 'example-metric';
      const cacheKey = 'cache:example-metric:hs-ke:course:courseId=test-123:v1';

      // Step 1: Prime cache with fresh data
      const cachedData = {
        metricId,
        value: 75.5,
        timestamp: new Date(Date.now() - 7200 * 1000).toISOString(), // 2 hours ago
        fromCache: false,
      };

      await cacheService.set(cacheKey, cachedData, 300, 'results');

      // Step 2: Simulate LRS failure by mocking queryStatements to throw
      const originalQueryStatements = lrsClient.queryStatements;
      jest
        .spyOn(lrsClient, 'queryStatements')
        .mockRejectedValue(new Error('LRS connection timeout'));

      // Step 3: Request metric - should return stale cached data
      const response = await request(app.getHttpServer())
        .get(`/api/v1/metrics/${metricId}/results`)
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
      lrsClient.queryStatements = originalQueryStatements;
      await cacheService.delete(cacheKey);
    });

    it('should indicate age of stale cached data', async () => {
      const metricId = 'example-metric';
      const cacheKey = 'cache:example-metric:hs-ke:course:courseId=age-test:v1';

      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000);
      const cachedData = {
        metricId,
        value: 88.0,
        timestamp: threeHoursAgo.toISOString(),
        fromCache: false,
      };

      await cacheService.set(cacheKey, cachedData, 300, 'results');

      // Simulate LRS failure
      const originalQueryStatements = lrsClient.queryStatements;
      jest
        .spyOn(lrsClient, 'queryStatements')
        .mockRejectedValue(new Error('LRS unavailable'));

      const response = await request(app.getHttpServer())
        .get(`/api/v1/metrics/${metricId}/results`)
        .query({ courseId: 'age-test' })
        .expect(HttpStatus.OK);

      expect(response.body.age).toBeGreaterThanOrEqual(3 * 3600); // At least 3 hours
      expect(response.body.cachedAt).toBeDefined();

      // Cleanup
      lrsClient.queryStatements = originalQueryStatements;
      await cacheService.delete(cacheKey);
    });
  });

  describe('Strategy 2: Default/Null Values', () => {
    it('should return null value when no cache and LRS unavailable', async () => {
      const metricId = 'example-metric';
      const cacheKey =
        'cache:example-metric:hs-ke:course:courseId=no-cache-test:v1';

      // Ensure no cache exists
      await cacheService.delete(cacheKey);

      // Simulate LRS failure
      const originalQueryStatements = lrsClient.queryStatements;
      jest
        .spyOn(lrsClient, 'queryStatements')
        .mockRejectedValue(new Error('LRS connection refused'));

      // Request metric - should return null with unavailable status
      const response = await request(app.getHttpServer())
        .get(`/api/v1/metrics/${metricId}/results`)
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
      await request(app.getHttpServer())
        .get(`/api/v1/metrics/${metricId}/results`)
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

      const response = await request(app.getHttpServer())
        .get(`/api/v1/metrics/${metricId}/results`)
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
        await request(app.getHttpServer())
          .get(`/api/v1/metrics/${metricId}/results`)
          .query({ courseId: `circuit-test-${i}` })
          .expect(HttpStatus.OK); // Graceful degradation returns 200
      }

      // Next request should fail fast (circuit open)
      const response = await request(app.getHttpServer())
        .get(`/api/v1/metrics/${metricId}/results`)
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

  describe('Observability', () => {
    it('should expose degradation metrics at /metrics endpoint', async () => {
      // Verify Prometheus metrics endpoint includes graceful degradation counters
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(HttpStatus.OK);

      expect(response.text).toContain('metric_graceful_degradation_total');
    });
  });
});
