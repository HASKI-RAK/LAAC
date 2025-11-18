// REQ-FN-006: E2E tests for Cache Service with real Redis
// Tests cache operations with actual Redis instance

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { CacheService } from '../src/data-access/services/cache.service';
import {
  generateCacheKey,
  generateCacheKeyPattern,
} from '../src/data-access/utils/cache-key.util';

const TEST_INSTANCE_ID = 'test-instance';

describe('REQ-FN-006: Cache Service (e2e)', () => {
  let app: INestApplication;
  let cacheService: CacheService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    cacheService = app.get<CacheService>(CacheService);
  });

  afterAll(async () => {
    // Clean up all test keys
    await cacheService.invalidatePattern('cache:test-*');
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test keys before each test to ensure isolation
    await cacheService.invalidatePattern('cache:test-*');
  });

  afterEach(async () => {
    // Clean up test keys after each test
    await cacheService.invalidatePattern('cache:test-*');
  });

  describe('Cache Operations', () => {
    it('should store and retrieve a value', async () => {
      const key = generateCacheKey({
        metricId: 'test-metric',
        instanceId: TEST_INSTANCE_ID,
        scope: 'course',
        filters: { courseId: '123' },
      });

      const testData = { value: 'test', count: 42 };

      // Store value
      const setResult = await cacheService.set(key, testData);
      expect(setResult).toBe(true);

      // Retrieve value
      const getValue = await cacheService.get<typeof testData>(key);
      expect(getValue).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      const key = generateCacheKey({
        metricId: 'test-nonexistent',
        instanceId: TEST_INSTANCE_ID,
        scope: 'course',
      });

      const result = await cacheService.get(key);
      expect(result).toBeNull();
    });

    it('should delete a key', async () => {
      const key = generateCacheKey({
        metricId: 'test-delete',
        instanceId: TEST_INSTANCE_ID,
        scope: 'topic',
      });

      // Store value
      await cacheService.set(key, { test: 'data' });

      // Verify stored
      let value = await cacheService.get(key);
      expect(value).not.toBeNull();

      // Delete
      const deleteResult = await cacheService.delete(key);
      expect(deleteResult).toBe(true);

      // Verify deleted
      value = await cacheService.get(key);
      expect(value).toBeNull();
    });

    it('should return false when deleting non-existent key', async () => {
      const key = generateCacheKey({
        metricId: 'test-nonexistent-delete',
        instanceId: TEST_INSTANCE_ID,
        scope: 'element',
      });

      const result = await cacheService.delete(key);
      expect(result).toBe(false);
    });

    it('should handle custom TTL', async () => {
      const key = generateCacheKey({
        metricId: 'test-ttl',
        instanceId: TEST_INSTANCE_ID,
        scope: 'course',
      });

      // Store with 1 second TTL
      await cacheService.set(key, { test: 'ttl' }, 1);

      // Should exist immediately
      let value = await cacheService.get(key);
      expect(value).not.toBeNull();

      // Wait for expiration (add buffer for CI timing variations)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Should be expired
      value = await cacheService.get(key);
      expect(value).toBeNull();
    }, 3000); // Increase timeout for this test
  });

  describe('Pattern-based Invalidation', () => {
    it('should invalidate keys matching pattern', async () => {
      // Create multiple test keys
      const keys = [
        generateCacheKey({
          metricId: 'test-pattern-1',
          instanceId: TEST_INSTANCE_ID,
          scope: 'course',
          filters: { id: '1' },
        }),
        generateCacheKey({
          metricId: 'test-pattern-2',
          instanceId: TEST_INSTANCE_ID,
          scope: 'course',
          filters: { id: '2' },
        }),
        generateCacheKey({
          metricId: 'test-other',
          instanceId: TEST_INSTANCE_ID,
          scope: 'topic',
          filters: { id: '3' },
        }),
      ];

      // Store all
      for (const key of keys) {
        await cacheService.set(key, { test: 'data' });
      }

      // Invalidate pattern
      const pattern = generateCacheKeyPattern({
        metricId: 'test-pattern-*',
        instanceId: TEST_INSTANCE_ID,
        scope: 'course',
      });
      const count = await cacheService.invalidatePattern(pattern);

      // Should have deleted 2 keys
      expect(count).toBeGreaterThanOrEqual(2);

      // Verify pattern keys are deleted
      const value1 = await cacheService.get(keys[0]);
      const value2 = await cacheService.get(keys[1]);
      expect(value1).toBeNull();
      expect(value2).toBeNull();

      // Verify other key still exists
      const value3 = await cacheService.get(keys[2]);
      expect(value3).not.toBeNull();
    });

    it('should return 0 for pattern with no matches', async () => {
      const pattern = generateCacheKeyPattern({
        metricId: 'test-nonexistent-pattern',
        instanceId: TEST_INSTANCE_ID,
      });

      const count = await cacheService.invalidatePattern(pattern);
      expect(count).toBe(0);
    });

    it('should invalidate all cache entries with wildcard', async () => {
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

      // Invalidate all test keys
      const pattern = 'cache:test-all-*';
      const count = await cacheService.invalidatePattern(pattern);

      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate deterministic keys', async () => {
      const params = {
        metricId: 'test-deterministic',
        instanceId: TEST_INSTANCE_ID,
        scope: 'course',
        filters: { a: '1', b: '2', c: '3' },
      };

      const key1 = generateCacheKey(params);
      const key2 = generateCacheKey({ ...params });

      expect(key1).toBe(key2);

      // Store with first key
      await cacheService.set(key1, { test: 'data' });

      // Retrieve with second key
      const value = await cacheService.get(key2);
      expect(value).toEqual({ test: 'data' });
    });

    it('should handle numeric and boolean filter values', async () => {
      const key = generateCacheKey({
        metricId: 'test-types',
        instanceId: TEST_INSTANCE_ID,
        scope: 'course',
        filters: {
          id: 123,
          active: true,
          limit: 50,
        },
      });

      await cacheService.set(key, { test: 'data' });
      const value = await cacheService.get(key);
      expect(value).toEqual({ test: 'data' });
    });
  });

  describe('Health Check', () => {
    it('should report healthy when Redis is available', async () => {
      const isHealthy = await cacheService.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle large values', async () => {
      const key = generateCacheKey({
        metricId: 'test-large',
        instanceId: TEST_INSTANCE_ID,
        scope: 'course',
      });

      // Create a large object
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: `Data for item ${i}`.repeat(10),
        })),
      };

      const setResult = await cacheService.set(key, largeData);
      expect(setResult).toBe(true);

      const getValue = await cacheService.get<typeof largeData>(key);
      expect(getValue).toEqual(largeData);
      expect(getValue?.items).toHaveLength(1000);
    });

    it('should handle special characters in filter values', async () => {
      const key = generateCacheKey({
        metricId: 'test-special',
        instanceId: TEST_INSTANCE_ID,
        scope: 'course',
        filters: {
          email: 'test@example.com',
          name: 'John Doe',
          url: 'http://example.com:8080', // Test colon handling
        },
      });

      await cacheService.set(key, { test: 'data' });
      const value = await cacheService.get(key);
      expect(value).toEqual({ test: 'data' });
    });
  });
});
