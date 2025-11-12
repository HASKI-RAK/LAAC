// Implements REQ-FN-006: Cache Key Generation Utilities
// Provides utilities for generating consistent, deterministic cache keys

/**
 * Cache key generation utilities
 * Implements REQ-FN-006: Deterministic cache key format
 *
 * Key format: cache:{metricId}:{scope}:{filters}:{version}
 * Example: cache:course-completion:course:courseId=101,start=2025-01-01:v1
 */

/**
 * Parameters for generating a cache key
 */
export interface CacheKeyParams {
  /** Metric identifier (e.g., 'course-completion', 'engagement-score') */
  metricId: string;
  /** Scope level (course, topic, element) */
  scope: string;
  /** Filter parameters as key-value pairs */
  filters?: Record<string, string | number | boolean>;
  /** Version identifier for cache versioning (default: 'v1') */
  version?: string;
}

/**
 * Generate a deterministic cache key from parameters
 * @param params - Cache key parameters
 * @returns Formatted cache key string
 * @example
 * ```typescript
 * generateCacheKey({
 *   metricId: 'course-completion',
 *   scope: 'course',
 *   filters: { courseId: '101', start: '2025-01-01' },
 *   version: 'v1'
 * })
 * // Returns: "cache:course-completion:course:courseId=101,start=2025-01-01:v1"
 * ```
 */
export function generateCacheKey(params: CacheKeyParams): string {
  const { metricId, scope, filters, version = 'v1' } = params;

  // Build filter segment with sorted keys for determinism
  let filterSegment = '';
  if (filters && Object.keys(filters).length > 0) {
    const sortedFilters = Object.keys(filters)
      .sort()
      .map((key) => `${key}=${String(filters[key])}`)
      .join(',');
    filterSegment = sortedFilters;
  }

  // Construct cache key: cache:{metricId}:{scope}:{filters}:{version}
  const segments = ['cache', metricId, scope];
  if (filterSegment) {
    segments.push(filterSegment);
  }
  segments.push(version);

  return segments.join(':');
}

/**
 * Generate a cache key pattern for bulk operations
 * @param params - Partial cache key parameters (use wildcards in fields)
 * @returns Cache key pattern with wildcards
 * @example
 * ```typescript
 * generateCacheKeyPattern({ metricId: 'course-completion', scope: '*' })
 * // Returns: "cache:course-completion:*"
 *
 * generateCacheKeyPattern({ metricId: '*' })
 * // Returns: "cache:*"
 * ```
 */
export function generateCacheKeyPattern(
  params: Partial<CacheKeyParams>,
): string {
  const segments = ['cache'];

  if (params.metricId) {
    segments.push(params.metricId);

    if (params.scope) {
      segments.push(params.scope);
    } else {
      segments.push('*');
    }
  } else {
    segments.push('*');
  }

  return segments.join(':') + (params.metricId ? ':*' : '');
}

/**
 * Parse a cache key back into its components
 * @param key - Cache key to parse
 * @returns Parsed components or null if invalid format
 * @example
 * ```typescript
 * parseCacheKey("cache:course-completion:course:courseId=101:v1")
 * // Returns: {
 * //   metricId: 'course-completion',
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
  if (parts.length < 4) {
    return null;
  }

  const [, metricId, scope, ...rest] = parts;
  const version = rest[rest.length - 1];
  const filterPart = rest.slice(0, -1).join(':');

  const filters: Record<string, string | number | boolean> = {};
  if (filterPart) {
    const filterPairs = filterPart.split(',');
    for (const pair of filterPairs) {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) {
        // Try to parse as number or boolean
        if (value === 'true') {
          filters[key] = true;
        } else if (value === 'false') {
          filters[key] = false;
        } else if (!isNaN(Number(value))) {
          filters[key] = Number(value);
        } else {
          filters[key] = value;
        }
      }
    }
  }

  return {
    metricId,
    scope,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    version,
  };
}
