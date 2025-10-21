// Implements REQ-NF-002: Health/Readiness Endpoints - Redis Health Indicator
// Custom health indicator for Redis connectivity

import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Configuration } from '../../config';

/**
 * Redis health indicator
 * Checks connectivity to Redis cache server
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private redis: Redis;

  constructor(private readonly configService: ConfigService<Configuration>) {
    super();
    const redisConfig = this.configService.get('redis', { infer: true });

    if (!redisConfig) {
      throw new Error('Redis configuration is missing');
    }

    // Create Redis client with configuration
    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      // Health check specific settings
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true, // Don't connect until first command
    });

    // Handle Redis errors gracefully (don't crash the app)
    this.redis.on('error', () => {
      // Errors are handled in the health check itself
      // Just prevent unhandled error crashes
    });
  }

  /**
   * Check if Redis is reachable
   * @param key - Health check key name
   * @returns Health indicator result
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Ensure connection
      if (this.redis.status === 'end' || this.redis.status === 'close') {
        await this.redis.connect();
      }

      // Ping Redis with timeout
      const pong = await Promise.race([
        this.redis.ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis ping timeout')), 3000),
        ),
      ]);

      if (pong === 'PONG') {
        return this.getStatus(key, true, {
          status: 'up',
          message: 'Redis is reachable',
        });
      }

      throw new Error('Redis ping failed');
    } catch (error) {
      const result = this.getStatus(key, false, {
        status: 'down',
        message: error instanceof Error ? error.message : 'Redis check failed',
      });
      throw new HealthCheckError('Redis health check failed', result);
    }
  }

  /**
   * Cleanup on application shutdown
   */
  async onApplicationShutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
