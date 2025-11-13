// Implements REQ-FN-006: Cache Key Generation Utilities
// Implements REQ-FN-017: Multi-Instance Support - Instance-aware cache keys
// Provides utilities for generating consistent, deterministic cache keys

/**
 * Cache key generation utilities
 * Implements REQ-FN-006: Deterministic cache key format
 * Implements REQ-FN-017: Instance-aware cache keys for multi-instance support
 *
 * Key format: cache:{metricId}:{instanceId}:{scope}:{filters}:{version}
 * Example: cache:course-completion:hs-ke:course:courseId=101,start=2025-01-01:v1
 */

/**
 * Parameters for generating a cache key
 */
export interface CacheKeyParams {
  /** Metric identifier (e.g., 'course-completion', 'engagement-score') */
  metricId: string;
  /** Instance identifier (e.g., 'hs-ke', 'hs-rv') - REQ-FN-017 */
  instanceId: string;
  /** Scope level (course, topic, element) */
  scope: string;
  /** Filter parameters as key-value pairs */
  filters?: Record<string, string | number | boolean>;
  /** Version identifier for cache versioning (default: 'v1') */
  version?: string;
}

/**
 * Generate a deterministic cache key from parameters
 * Implements REQ-FN-017: Instance-aware cache keys
 * @param params - Cache key parameters
 * @returns Formatted cache key string
 * @remarks
 * Filter values containing colons (:) are URL-encoded to prevent ambiguity with key delimiters
 * @example
 * ```typescript
 * generateCacheKey({
 *   metricId: 'course-completion',
 *   instanceId: 'hs-ke',
 *   scope: 'course',
 *   filters: { courseId: '101', start: '2025-01-01' },
 *   version: 'v1'
 * })
 * // Returns: "cache:course-completion:hs-ke:course:courseId=101,start=2025-01-01:v1"
 * ```
 */
export function generateCacheKey(params: CacheKeyParams): string {
  const { metricId, instanceId, scope, filters, version = 'v1' } = params;

  // Build filter segment with sorted keys for determinism
  let filterSegment = '';
  if (filters && Object.keys(filters).length > 0) {
    const sortedFilters = Object.keys(filters)
      .sort()
      .map((key) => {
        const value = String(filters[key]);
        // URL-encode filter values containing colons to prevent parsing ambiguity
        const encodedValue = value.includes(':')
          ? encodeURIComponent(value)
          : value;
        return `${key}=${encodedValue}`;
      })
      .join(',');
    filterSegment = sortedFilters;
  }

  // Construct cache key: cache:{metricId}:{instanceId}:{scope}:{filters}:{version}
  // REQ-FN-017: instanceId added for multi-instance support
  const segments = ['cache', metricId, instanceId, scope];
  if (filterSegment) {
    segments.push(filterSegment);
  }
  segments.push(version);

  return segments.join(':');
}

/**
 * Generate a cache key pattern for bulk operations
 * Implements REQ-FN-017: Instance-aware pattern matching
 * @param params - Partial cache key parameters (use wildcards in fields)
 * @returns Cache key pattern with wildcards
 * @remarks
 * All patterns follow the full cache key structure: cache:metricId:instanceId:scope:filters:version
 * Any unspecified segment becomes a wildcard (*)
 * @example
 * ```typescript
 * generateCacheKeyPattern({ metricId: 'course-completion', instanceId: 'hs-ke' })
 * // Returns: "cache:course-completion:hs-ke:*:*:*"
 *
 * generateCacheKeyPattern({ metricId: 'course-completion', instanceId: '*' })
 * // Returns: "cache:course-completion:*:*:*:*"
 *
 * generateCacheKeyPattern({})
 * // Returns: "cache:*:*:*:*:*"
 * ```
 */
export function generateCacheKeyPattern(
  params: Partial<CacheKeyParams>,
): string {
  // Always produce 6 segments: cache:metricId:instanceId:scope:filters:version
  // REQ-FN-017: instanceId added for multi-instance support
  const segments = [
    'cache',
    params.metricId ?? '*',
    params.instanceId ?? '*',
    params.scope ?? '*',
    '*', // filters wildcard
    '*', // version wildcard
  ];
  return segments.join(':');
}

/**
 * Parse a cache key back into its components
 * Implements REQ-FN-017: Parse instance-aware cache keys
 * @param key - Cache key to parse
 * @returns Parsed components or null if invalid format
 * @example
 * ```typescript
 * parseCacheKey("cache:course-completion:hs-ke:course:courseId=101:v1")
 * // Returns: {
 * //   metricId: 'course-completion',
 * //   instanceId: 'hs-ke',
 * //   scope: 'course',
 * //   filters: { courseId: '101' },
 * //   version: 'v1'
 * // }
 * ```
 */
export function parseCacheKey(key: string): CacheKeyParams | null {
  if (!key.startsWith('cache:')) {
    return null;
  }

  const parts = key.split(':');
  if (parts.length < 5) {
    // REQ-FN-017: Minimum 5 parts now (cache:metricId:instanceId:scope:version)
    return null;
  }

  // REQ-FN-017: Extract instanceId as second segment
  const [, metricId, instanceId, scope, ...rest] = parts;
  const version = rest[rest.length - 1];
  const filterPart = rest.slice(0, -1).join(':');

  const filters: Record<string, string | number | boolean> = {};
  if (filterPart) {
    const filterPairs = filterPart.split(',');
    for (const pair of filterPairs) {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) {
        // Decode URL-encoded values (handles colons and other special characters)
        const decodedValue = decodeURIComponent(value);

        // Try to parse as number or boolean
        if (decodedValue === 'true') {
          filters[key] = true;
        } else if (decodedValue === 'false') {
          filters[key] = false;
        } else if (/^\d+(\.\d+)?$/.test(decodedValue)) {
          // Only parse as number if it matches numeric pattern (integers or decimals)
          filters[key] = Number(decodedValue);
        } else {
          filters[key] = decodedValue;
        }
      }
    }
  }

  return {
    metricId,
    instanceId,
    scope,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    version,
  };
}
