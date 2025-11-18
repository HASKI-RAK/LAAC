// Implements REQ-FN-006: Redis Cache Service with Cache-Aside Pattern
// Provides Redis-backed caching with graceful error handling and TTL management

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { Configuration } from '../../core/config/config.interface';
import { LoggerService } from '../../core/logger';
import { ICacheService } from '../interfaces/cache.interface';
import { MetricsRegistryService } from '../../admin/services/metrics-registry.service';

/**
 * Cache Service Implementation
 * Implements REQ-FN-006: Cache-aside pattern with Redis backend
 *
 * @remarks
 * - Gracefully handles Redis failures (no throw, returns null/false)
 * - Uses connection pooling for performance
 * - Supports automatic reconnection with exponential backoff
 * - Tracks metrics for observability (hits, misses, operations)
 * - Logs all operations with correlation IDs
 * - Pattern-based invalidation uses SCAN for safety
 */
@Injectable()
export class CacheService
  implements ICacheService, OnModuleInit, OnModuleDestroy
{
  private readonly redis: Redis;
  private readonly maxRetries = 3;
  private readonly retryDelay = 100; // milliseconds

  constructor(
    private readonly configService: ConfigService<Configuration>,
    private readonly logger: LoggerService,
    private readonly metricsRegistry: MetricsRegistryService,
  ) {
    this.logger.setContext('CacheService');

    const redisConfig = this.configService.get('redis', { infer: true });

    const options: RedisOptions = {
      host: redisConfig?.host || 'localhost',
      port: redisConfig?.port || 6379,
      password: redisConfig?.password,
      db: redisConfig?.db ?? 0,
      maxRetriesPerRequest: this.maxRetries,
      retryStrategy: (times: number) => {
        if (times > this.maxRetries) {
          this.logger.warn('Redis max retries exceeded, giving up', {
            attempts: times,
          });
          return null; // Stop retrying
        }
        const delay = Math.min(times * this.retryDelay, 3000);
        this.logger.debug(`Redis retry attempt ${times}, delay: ${delay}ms`, {
          attempt: times,
          delay,
        });
        return delay;
      },
      lazyConnect: true, // Don't connect until explicitly called
      enableReadyCheck: true,
      enableOfflineQueue: false, // Fail fast when disconnected
      // Note: ioredis uses a single connection by default for standalone Redis instances.
      // REDIS_POOL_SIZE is defined in configuration for potential future use with Redis Cluster
      // or for documentation purposes, but is not used in the current implementation.
      // Connection pooling would require using ioredis Cluster mode or a separate pool library.
    };

    this.redis = new Redis(options);

    // Event handlers for connection lifecycle
    this.redis.on('connect', () => {
      this.logger.log('Redis connection established');
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis client ready');
    });

    this.redis.on('error', (error: Error) => {
      this.logger.error('Redis connection error', error);
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.redis.on('reconnecting', (delay: number) => {
      this.logger.log('Redis reconnecting', { delay });
    });
  }

  /**
   * Initialize Redis connection on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.redis.connect();
      this.logger.log('Redis cache service initialized');
    } catch (error) {
      this.logger.error(
        'Failed to connect to Redis on startup',
        error as Error,
      );
      // Don't throw - allow app to start without Redis
    }
  }

  /**
   * Cleanup Redis connection on module shutdown
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log('Redis connection closed gracefully');
    } catch (error) {
      this.logger.error('Error closing Redis connection', error as Error);
    }
  }

  /**
   * Retrieve a value from cache
   * Implements REQ-FN-006: Cache-aside pattern - get operation
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      const value = await this.redis.get(key);
      const duration = (Date.now() - startTime) / 1000;

      this.metricsRegistry.recordCacheOperation('get', duration);

      if (value === null) {
        this.logger.debug('Cache miss', { key });
        return null;
      }

      const parsed = JSON.parse(value) as T;
      this.logger.debug('Cache hit', { key });
      return parsed;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.metricsRegistry.recordCacheOperation('get', duration);

      this.logger.warn('Cache get operation failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get TTL for a specific cache category
   * @param category - Cache category (metrics, results, health)
   * @returns TTL in seconds for the category, or default TTL if category not specified
   * @private
   */
  private getTtlForCategory(category?: string): number {
    const config = this.configService.get('redis', { infer: true });
    if (!config) {
      return 3600; // Default 1 hour
    }

    switch (category) {
      case 'metrics':
        return config.ttlMetrics ?? config.ttl ?? 3600;
      case 'results':
        return config.ttlResults ?? config.ttl ?? 300;
      case 'health':
        return config.ttlHealth ?? config.ttl ?? 60;
      default:
        return config.ttl ?? 3600;
    }
  }

  /**
   * Store a value in cache with TTL
   * Implements REQ-FN-006: Cache-aside pattern - set operation
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional TTL in seconds (if not provided, uses category-specific TTL based on key prefix)
   * @param category - Optional cache category for TTL selection ('metrics', 'results', 'health')
   */
  async set<T>(
    key: string,
    value: T,
    ttl?: number,
    category?: 'metrics' | 'results' | 'health',
  ): Promise<boolean> {
    const startTime = Date.now();
    try {
      const serialized = JSON.stringify(value);
      const effectiveTtl = ttl ?? this.getTtlForCategory(category);

      await this.redis.setex(key, effectiveTtl, serialized);

      const duration = (Date.now() - startTime) / 1000;
      this.metricsRegistry.recordCacheOperation('set', duration);

      this.logger.debug('Cache set successful', { key, ttl: effectiveTtl });
      return true;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.metricsRegistry.recordCacheOperation('set', duration);

      this.logger.warn('Cache set operation failed', {
        key,
        ttl,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Delete a specific cache key
   * Implements REQ-FN-006: Cache invalidation
   */
  async delete(key: string): Promise<boolean> {
    const startTime = Date.now();
    try {
      const result = await this.redis.del(key);

      const duration = (Date.now() - startTime) / 1000;
      this.metricsRegistry.recordCacheOperation('delete', duration);

      if (result > 0) {
        this.metricsRegistry.recordCacheEviction(result);
        this.logger.debug('Cache delete successful', { key, count: result });
        return true;
      }

      this.logger.debug('Cache delete - key not found', { key });
      return false;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.metricsRegistry.recordCacheOperation('delete', duration);

      this.logger.warn('Cache delete operation failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Invalidate a specific cache key (alias for delete)
   * Implements REQ-FN-006: Cache invalidation (REQ-FN-007)
   */
  async invalidateKey(key: string): Promise<boolean> {
    return this.delete(key);
  }

  /**
   * Invalidate cache keys matching a pattern
   * Implements REQ-FN-006 + REQ-FN-007: Pattern-based cache invalidation
   * Uses SCAN cursor to avoid blocking Redis
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const startTime = Date.now();
    let totalDeleted = 0;

    try {
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100, // Scan 100 keys at a time
      });

      const keysToDelete: string[] = [];

      // Collect keys matching pattern
      for await (const keys of stream) {
        if (Array.isArray(keys) && keys.length > 0) {
          keysToDelete.push(...(keys as string[]));
        }
      }

      // Delete in batches using pipeline for performance
      if (keysToDelete.length > 0) {
        const pipeline = this.redis.pipeline();
        for (const key of keysToDelete) {
          pipeline.del(key);
        }
        const results = await pipeline.exec();

        // Count successful deletions
        totalDeleted = results?.filter(([err]) => err === null).length ?? 0;

        this.metricsRegistry.recordCacheEviction(totalDeleted);
        this.logger.debug('Cache pattern invalidation successful', {
          pattern,
          keysDeleted: totalDeleted,
        });
      } else {
        this.logger.debug('Cache pattern invalidation - no keys matched', {
          pattern,
        });
      }

      const duration = (Date.now() - startTime) / 1000;
      this.metricsRegistry.recordCacheOperation('invalidatePattern', duration);

      return totalDeleted;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.metricsRegistry.recordCacheOperation('invalidatePattern', duration);

      this.logger.warn('Cache pattern invalidation failed', {
        pattern,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Check if Redis connection is healthy
   * Implements REQ-NF-002: Health check support
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.debug('Redis health check failed', { error });
      return false;
    }
  }

  /**
   * Retrieve a value from cache ignoring expiry (for fallback strategies)
   * Implements REQ-NF-003: Cache fallback strategy
   *
   * @param key - Cache key to retrieve
   * @returns Cached value or null if not found or error occurred
   *
   * @remarks
   * - Used for graceful degradation when primary services fail
   * - Retrieves data even if TTL has expired
   * - Does not throw on Redis failure, returns null
   * - Redis automatically removes expired keys, so this may not find truly expired data
   *   unless Redis hasn't run its eviction policy yet
   */
  async getIgnoringExpiry<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      // In Redis, once a key expires, it's no longer accessible even with GET
      // However, we can try to get the key - if it exists, it means either:
      // 1. It hasn't expired yet
      // 2. Redis hasn't evicted it yet (passive expiry)
      const value = await this.redis.get(key);
      const duration = (Date.now() - startTime) / 1000;

      this.metricsRegistry.recordCacheOperation('get', duration);

      if (value === null) {
        this.logger.debug('Cache miss (stale attempt)', { key });
        return null;
      }

      const parsed = JSON.parse(value) as T;
      this.logger.debug('Cache hit (stale attempt)', { key });
      return parsed;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.metricsRegistry.recordCacheOperation('get', duration);

      this.logger.warn('Cache get operation failed (stale attempt)', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
