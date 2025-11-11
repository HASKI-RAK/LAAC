// Implements REQ-FN-024: Redis client lifecycle management for throttler
// Ensures proper cleanup on application shutdown to prevent resource leaks

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Configuration } from '../config';

/**
 * Redis Client Service for Throttler
 * Manages Redis client lifecycle including proper cleanup on shutdown
 *
 * Implements REQ-FN-024: Rate Limiting
 * Implements REQ-NF-016: Resource cleanup on shutdown
 */
@Injectable()
export class ThrottlerRedisService implements OnApplicationShutdown {
  private redis: Redis | null = null;

  constructor(private readonly configService: ConfigService<Configuration>) {}

  /**
   * Get or create Redis client instance for throttler storage
   * @returns Redis client or null if in test environment
   */
  getClient(): Redis | null {
    const nodeEnv = this.configService.get('app.nodeEnv', { infer: true });
    const redisConfig = this.configService.get('redis', { infer: true });

    // Use in-memory storage for test environment
    if (nodeEnv === 'test' || !redisConfig) {
      return null;
    }

    // Return existing client if already created
    if (this.redis) {
      return this.redis;
    }

    // Create new Redis client for throttler storage
    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      // Throttler-specific settings
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    });

    // Attach error event handler to prevent unhandled error crashes (REQ-NF-016)
    this.redis.on('error', () => {
      // Errors are handled gracefully, prevent crashes
    });

    return this.redis;
  }

  /**
   * Cleanup Redis client on application shutdown
   * Implements REQ-NF-016: Graceful shutdown
   */
  async onApplicationShutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}
