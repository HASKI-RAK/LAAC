// Implements REQ-NF-003 (REQ-NF-018): Graceful Degradation - Fallback Handler
// Provides fallback strategies when primary services (LRS, cache) fail

import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger';
import { CacheService } from '../../data-access/services/cache.service';
import { MetricsRegistryService } from '../../admin/services/metrics-registry.service';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../config/config.interface';

/**
 * Cache entry structure for stale data retrieval
 * REQ-NF-003: Standardized cache entry format
 */
interface CacheEntry<T> {
  timestamp?: string;
  value?: T;
}

/**
 * Fallback result with degradation metadata
 * REQ-NF-003: Graceful degradation response format
 */
export interface FallbackResult<T> {
  value: T | null;
  status: 'available' | 'degraded' | 'unavailable';
  fromCache?: boolean;
  warning?: string;
  error?: string;
  cause?: string;
  cachedAt?: string;
  age?: number;
  dataAvailable: boolean;
}

/**
 * Fallback options
 */
export interface FallbackOptions {
  metricId: string;
  cacheKey: string;
  enableCacheFallback?: boolean;
  defaultValue?: unknown;
}

/**
 * Fallback Handler
 * Implements REQ-NF-003: Graceful degradation strategies
 *
 * @remarks
 * Provides fallback behaviors when primary services fail:
 * 1. Cache Fallback: Return stale cached data with warning
 * 2. Default Value: Return null/zero with user-friendly message
 * 3. All fallbacks return HTTP 200 (not 503) for graceful degradation
 *
 * Strategy:
 * - On CircuitBreakerOpenError or LRS failure
 * - Try cache (ignoring expiry) → return with warning
 * - If no cache → return null with error message
 * - Always HTTP 200 with status indicators
 */
@Injectable()
export class FallbackHandler {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
    private readonly metricsRegistry: MetricsRegistryService,
    private readonly configService: ConfigService<Configuration>,
  ) {
    this.logger.setContext('FallbackHandler');
  }

  /**
   * Execute fallback strategy when primary service fails
   * REQ-NF-003: Cache fallback → default value
   *
   * @param options - Fallback configuration
   * @returns Fallback result with degradation metadata
   */
  async executeFallback<T>(
    options: FallbackOptions,
  ): Promise<FallbackResult<T>> {
    const metricId = options.metricId;
    const cacheKey = options.cacheKey;
    const enableCacheFallback = options.enableCacheFallback;
    const defaultValue = options.defaultValue;

    this.logger.warn('Executing fallback strategy', {
      metricId,
      cacheKey,
      enableCacheFallback,
    });

    // REQ-NF-003: Strategy 1 - Try cache fallback (stale data)
    if (enableCacheFallback !== false) {
      const staleCacheResult = await this.tryStaleCache<T>(cacheKey);
      if (staleCacheResult) {
        // Record cache fallback metric
        this.metricsRegistry.recordGracefulDegradation(
          metricId,
          'cache_fallback',
        );

        this.logger.log('Returning stale cached result', {
          metricId,
          cacheKey,
          age: staleCacheResult.age,
        });

        return staleCacheResult;
      }
    }

    // REQ-NF-003: Strategy 2 - Return default/null value
    this.logger.log('No cache available, returning default value', {
      metricId,
      defaultValue: defaultValue ?? null,
    });

    // Record unavailable metric
    this.metricsRegistry.recordGracefulDegradation(metricId, 'default_value');

    return {
      value: (defaultValue ?? null) as T | null,
      status: 'unavailable',
      error: 'Data currently unavailable; please try again later',
      cause: 'LRS_UNAVAILABLE',
      dataAvailable: false,
    };
  }

  /**
   * Try to retrieve stale cached data (ignoring expiry)
   * REQ-NF-003: Cache fallback strategy
   *
   * @param cacheKey - Cache key to retrieve
   * @returns Stale cache result with metadata, or null if not found
   * @private
   */
  private async tryStaleCache<T>(
    cacheKey: string,
  ): Promise<FallbackResult<T> | null> {
    try {
      // Get cached value ignoring expiry (implemented in CacheService)
      const cached =
        await this.cacheService.getIgnoringExpiry<CacheEntry<T>>(cacheKey);

      if (!cached) {
        this.logger.debug('No stale cache found', { cacheKey });
        return null;
      }

      // Calculate age of cached data
      const timestampValue = cached.timestamp;
      const cachedAt = timestampValue ? new Date(timestampValue) : new Date();
      const ageSeconds = Math.floor((Date.now() - cachedAt.getTime()) / 1000);

      this.logger.log('Stale cache found', {
        cacheKey,
        cachedAt: cachedAt.toISOString(),
        ageSeconds,
      });

      // Extract value with clear precedence: cached.value if present, otherwise treat cached as value
      let resultValue: T | null = null;
      if (typeof cached.value !== 'undefined') {
        // Cached data has explicit value property
        resultValue = cached.value;
      } else if (
        typeof cached === 'object' &&
        cached !== null &&
        !('timestamp' in cached)
      ) {
        // Cached data is the value itself (not wrapped in CacheEntry structure)
        resultValue = cached as unknown as T;
      }

      return {
        value: resultValue,
        status: 'degraded',
        fromCache: true,
        warning: 'Data is stale; current service unavailable',
        cachedAt: cachedAt.toISOString(),
        age: ageSeconds,
        dataAvailable: true,
      };
    } catch (error) {
      this.logger.error(
        'Error retrieving stale cache',
        error as Error,
        cacheKey,
      );
      return null;
    }
  }

  /**
   * Check if graceful degradation is enabled
   * REQ-NF-003: Configuration support
   *
   * @returns true if graceful degradation is enabled
   */
  isEnabled(): boolean {
    // Default to true if not explicitly disabled
    return (
      this.configService.get('gracefulDegradation.enabled', { infer: true }) ??
      true
    );
  }

  /**
   * Check if cache fallback is enabled
   * REQ-NF-003: Configuration support
   *
   * @returns true if cache fallback is enabled
   */
  isCacheFallbackEnabled(): boolean {
    // Default to true if not explicitly disabled
    return (
      this.configService.get('gracefulDegradation.cacheFallback', {
        infer: true,
      }) ?? true
    );
  }
}
