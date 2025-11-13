// REQ-FN-006: Unit tests for cache key utilities
// REQ-FN-017: Tests for instance-aware cache keys
// Tests deterministic cache key generation and pattern matching

import {
  generateCacheKey,
  generateCacheKeyPattern,
  parseCacheKey,
  CacheKeyParams,
} from './cache-key.util';

describe('REQ-FN-006 + REQ-FN-017: Cache Key Utilities', () => {
  describe('generateCacheKey', () => {
    it('should generate basic cache key without filters', () => {
      const params: CacheKeyParams = {
        metricId: 'course-completion',
        instanceId: 'hs-ke',
        scope: 'course',
      };

      const key = generateCacheKey(params);

      expect(key).toBe('cache:course-completion:hs-ke:course:v1');
    });

    it('should generate cache key with filters', () => {
      const params: CacheKeyParams = {
        metricId: 'course-completion',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {
          courseId: '101',
          start: '2025-01-01',
        },
      };

      const key = generateCacheKey(params);

      expect(key).toBe(
        'cache:course-completion:hs-ke:course:courseId=101,start=2025-01-01:v1',
      );
    });

    it('should generate cache key with custom version', () => {
      const params: CacheKeyParams = {
        metricId: 'engagement-score',
        instanceId: 'hs-rv',
        scope: 'topic',
        version: 'v2',
      };

      const key = generateCacheKey(params);

      expect(key).toBe('cache:engagement-score:hs-rv:topic:v2');
    });

    it('should generate deterministic keys with sorted filters', () => {
      const params1: CacheKeyParams = {
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'element',
        filters: { z: 'last', a: 'first', m: 'middle' },
      };

      const params2: CacheKeyParams = {
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'element',
        filters: { a: 'first', m: 'middle', z: 'last' },
      };

      const key1 = generateCacheKey(params1);
      const key2 = generateCacheKey(params2);

      expect(key1).toBe(key2);
      expect(key1).toBe(
        'cache:test-metric:hs-ke:element:a=first,m=middle,z=last:v1',
      );
    });

    it('should handle numeric filter values', () => {
      const params: CacheKeyParams = {
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {
          courseId: 123,
          limit: 50,
        },
      };

      const key = generateCacheKey(params);

      expect(key).toBe(
        'cache:test-metric:hs-ke:course:courseId=123,limit=50:v1',
      );
    });

    it('should handle boolean filter values', () => {
      const params: CacheKeyParams = {
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {
          includeInactive: true,
          showDetails: false,
        },
      };

      const key = generateCacheKey(params);

      expect(key).toBe(
        'cache:test-metric:hs-ke:course:includeInactive=true,showDetails=false:v1',
      );
    });

    it('should handle empty filters object', () => {
      const params: CacheKeyParams = {
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {},
      };

      const key = generateCacheKey(params);

      expect(key).toBe('cache:test-metric:hs-ke:course:v1');
    });

    it('should URL-encode filter values containing colons', () => {
      const params: CacheKeyParams = {
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {
          url: 'http://example.com:8080',
          timestamp: '2025-01-01T12:00:00',
        },
      };

      const key = generateCacheKey(params);

      // Colon in URL should be encoded as %3A
      expect(key).toContain('url=http%3A%2F%2Fexample.com%3A8080');
      expect(key).toContain('timestamp=2025-01-01T12%3A00%3A00');
    });

    it('should not encode filter values without special characters', () => {
      const params: CacheKeyParams = {
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {
          simple: 'value123',
          date: '2025-01-01',
        },
      };

      const key = generateCacheKey(params);

      // No encoding needed for these values
      expect(key).toBe(
        'cache:test-metric:hs-ke:course:date=2025-01-01,simple=value123:v1',
      );
    });

    it('should handle different instance IDs', () => {
      const params1: CacheKeyParams = {
        metricId: 'course-completion',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: { courseId: '101' },
      };

      const params2: CacheKeyParams = {
        metricId: 'course-completion',
        instanceId: 'hs-rv',
        scope: 'course',
        filters: { courseId: '101' },
      };

      const key1 = generateCacheKey(params1);
      const key2 = generateCacheKey(params2);

      // Same metric and filters but different instances should have different keys
      expect(key1).not.toBe(key2);
      expect(key1).toBe('cache:course-completion:hs-ke:course:courseId=101:v1');
      expect(key2).toBe('cache:course-completion:hs-rv:course:courseId=101:v1');
    });
  });

  describe('generateCacheKeyPattern', () => {
    it('should generate pattern with all wildcards', () => {
      const pattern = generateCacheKeyPattern({});

      expect(pattern).toBe('cache:*:*:*:*:*');
    });

    it('should generate pattern with specific metricId', () => {
      const pattern = generateCacheKeyPattern({
        metricId: 'course-completion',
      });

      expect(pattern).toBe('cache:course-completion:*:*:*:*');
    });

    it('should generate pattern with metricId and instanceId', () => {
      const pattern = generateCacheKeyPattern({
        metricId: 'course-completion',
        instanceId: 'hs-ke',
      });

      expect(pattern).toBe('cache:course-completion:hs-ke:*:*:*');
    });

    it('should generate pattern with metricId, instanceId and scope', () => {
      const pattern = generateCacheKeyPattern({
        metricId: 'course-completion',
        instanceId: 'hs-ke',
        scope: 'course',
      });

      expect(pattern).toBe('cache:course-completion:hs-ke:course:*:*');
    });

    it('should generate pattern with wildcard scope', () => {
      const pattern = generateCacheKeyPattern({
        metricId: 'engagement-score',
        instanceId: 'hs-ke',
        scope: '*',
      });

      expect(pattern).toBe('cache:engagement-score:hs-ke:*:*:*');
    });

    it('should generate pattern for all instances of a metric', () => {
      const pattern = generateCacheKeyPattern({
        metricId: 'course-completion',
        instanceId: '*',
      });

      expect(pattern).toBe('cache:course-completion:*:*:*:*');
    });
  });

  describe('parseCacheKey', () => {
    it('should parse basic cache key', () => {
      const key = 'cache:course-completion:hs-ke:course:v1';
      const parsed = parseCacheKey(key);

      expect(parsed).toEqual({
        metricId: 'course-completion',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: undefined,
        version: 'v1',
      });
    });

    it('should parse cache key with filters', () => {
      const key =
        'cache:course-completion:hs-ke:course:courseId=101,start=2025-01-01:v1';
      const parsed = parseCacheKey(key);

      expect(parsed).toEqual({
        metricId: 'course-completion',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {
          courseId: 101, // Parsed as number
          start: '2025-01-01',
        },
        version: 'v1',
      });
    });

    it('should parse numeric filter values', () => {
      const key = 'cache:test-metric:hs-ke:course:courseId=123,limit=50:v1';
      const parsed = parseCacheKey(key);

      expect(parsed).toEqual({
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {
          courseId: 123,
          limit: 50,
        },
        version: 'v1',
      });
    });

    it('should parse boolean filter values', () => {
      const key = 'cache:test-metric:hs-ke:course:active=true,hidden=false:v1';
      const parsed = parseCacheKey(key);

      expect(parsed).toEqual({
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {
          active: true,
          hidden: false,
        },
        version: 'v1',
      });
    });

    it('should return null for invalid cache key prefix', () => {
      const key = 'invalid:test-metric:hs-ke:course:v1';
      const parsed = parseCacheKey(key);

      expect(parsed).toBeNull();
    });

    it('should return null for malformed cache key', () => {
      const key = 'cache:too:short';
      const parsed = parseCacheKey(key);

      expect(parsed).toBeNull();
    });

    it('should handle complex filter values with colons', () => {
      const key =
        'cache:test-metric:hs-ke:course:timestamp=2025-01-01T12:00:00:v1';
      const parsed = parseCacheKey(key);

      expect(parsed).toEqual({
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {
          timestamp: '2025-01-01T12:00:00',
        },
        version: 'v1',
      });
    });

    it('should decode URL-encoded filter values with colons', () => {
      const key =
        'cache:test-metric:hs-ke:course:url=http%3A%2F%2Fexample.com%3A8080:v1';
      const parsed = parseCacheKey(key);

      expect(parsed).toEqual({
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {
          url: 'http://example.com:8080',
        },
        version: 'v1',
      });
    });

    it('should not parse empty strings as numbers', () => {
      const key = 'cache:test-metric:hs-ke:course:empty=:v1';
      const parsed = parseCacheKey(key);

      expect(parsed).toEqual({
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {
          empty: '',
        },
        version: 'v1',
      });
    });
  });

  describe('Round-trip key generation and parsing', () => {
    it('should successfully round-trip basic keys', () => {
      const params: CacheKeyParams = {
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'course',
        version: 'v1',
      };

      const key = generateCacheKey(params);
      const parsed = parseCacheKey(key);

      expect(parsed).toEqual({
        ...params,
        filters: undefined,
      });
    });

    it('should successfully round-trip keys with filters', () => {
      const params: CacheKeyParams = {
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {
          courseId: 101, // Use number to match parser behavior
          active: true,
          limit: 50,
        },
        version: 'v2',
      };

      const key = generateCacheKey(params);
      const parsed = parseCacheKey(key);

      expect(parsed).toEqual(params);
    });

    it('should successfully round-trip keys with URL-encoded special characters', () => {
      const params: CacheKeyParams = {
        metricId: 'test-metric',
        instanceId: 'hs-ke',
        scope: 'course',
        filters: {
          url: 'http://example.com:8080',
          timestamp: '2025-01-01T12:00:00',
          id: 101,
        },
        version: 'v2',
      };

      const key = generateCacheKey(params);
      const parsed = parseCacheKey(key);

      expect(parsed).toEqual(params);
    });
  });
});
