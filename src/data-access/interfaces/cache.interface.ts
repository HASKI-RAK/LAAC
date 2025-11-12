// Implements REQ-FN-006: Analytics Results Caching Interface
// Defines the contract for cache service operations with cache-aside pattern

/**
 * Cache Service Interface
 * Defines operations for storing and retrieving cached data
 * Implements REQ-FN-006: Cache-aside pattern with TTL management
 *
 * @remarks
 * - All operations should handle Redis failures gracefully (no throw on unavailability)
 * - Cache keys follow format: cache:{metricId}:{scope}:{filters}:{version}
 * - TTL values are configurable per category (metrics, results, health)
 * - Pattern matching supports Redis glob patterns (*, ?, [])
 */
export interface ICacheService {
  /**
   * Retrieve a value from cache
   * @param key - Cache key to retrieve
   * @returns Cached value or null if not found or error occurred
   * @remarks Does not throw on Redis failure, returns null for graceful degradation
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Store a value in cache with TTL
   * @param key - Cache key to store
   * @param value - Value to cache (will be JSON serialized)
   * @param ttl - Time to live in seconds (optional, uses default if not provided)
   * @returns True if stored successfully, false otherwise
   * @remarks Does not throw on Redis failure, returns false for graceful degradation
   */
  set<T>(key: string, value: T, ttl?: number): Promise<boolean>;

  /**
   * Delete a specific cache key
   * @param key - Cache key to delete
   * @returns True if deleted successfully, false otherwise
   * @remarks Does not throw on Redis failure, returns false for graceful degradation
   */
  delete(key: string): Promise<boolean>;

  /**
   * Invalidate a specific cache key (alias for delete)
   * @param key - Cache key to invalidate
   * @returns True if invalidated successfully, false otherwise
   * @remarks Provided for semantic clarity in cache invalidation contexts
   */
  invalidateKey(key: string): Promise<boolean>;

  /**
   * Invalidate cache keys matching a pattern
   * Uses Redis SCAN + DEL for safe bulk invalidation
   * @param pattern - Redis glob pattern (supports *, ?, [])
   * @returns Number of keys invalidated, or 0 if error occurred
   * @remarks
   * - Uses SCAN cursor-based iteration to avoid blocking
   * - Pattern examples: "cache:metrics:*", "cache:course-*:v1"
   * - Does not throw on Redis failure, returns 0 for graceful degradation
   */
  invalidatePattern(pattern: string): Promise<number>;

  /**
   * Check if Redis connection is healthy
   * @returns True if connected and responsive, false otherwise
   * @remarks Used by health checks to verify cache availability
   */
  isHealthy(): Promise<boolean>;
}
