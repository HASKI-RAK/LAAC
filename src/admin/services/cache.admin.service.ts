// Implements REQ-FN-007: Cache Invalidation Operations
// Admin service for cache management and invalidation

import { Injectable } from '@nestjs/common';
import { CacheService } from '../../data-access/services/cache.service';
import { LoggerService } from '../../core/logger';
import { MetricsRegistryService } from './metrics-registry.service';
import { CacheInvalidateDto } from '../dto/cache-invalidate.dto';

/**
 * Cache invalidation response interface
 * Implements REQ-FN-007: Admin cache invalidation response
 */
export interface CacheInvalidateResponse {
  status: 'success' | 'error';
  invalidatedCount: number;
  message: string;
  timestamp: string;
}

/**
 * Cache Admin Service
 * Implements REQ-FN-007: Cache invalidation and management operations
 *
 * @remarks
 * - Handles single key and pattern-based cache invalidation
 * - Logs all operations with admin context and correlation IDs
 * - Records telemetry hooks for observability
 * - Emits audit events for compliance tracking
 */
@Injectable()
export class CacheAdminService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: LoggerService,
    private readonly metricsRegistry: MetricsRegistryService,
  ) {
    this.logger.setContext('CacheAdminService');
  }

  /**
   * Invalidate cache entries based on provided options
   * Implements REQ-FN-007: Cache invalidation endpoint logic
   *
   * @param dto - Cache invalidation request DTO
   * @param adminUser - Admin user identifier (from JWT)
   * @returns Invalidation response with count and status
   */
  async invalidateCache(
    dto: CacheInvalidateDto,
    adminUser?: string,
  ): Promise<CacheInvalidateResponse> {
    const startTime = Date.now();
    let invalidatedCount = 0;
    let operationType: 'single' | 'pattern' | 'all' = 'single';

    try {
      // Determine operation type and execute
      if (dto.key) {
        operationType = 'single';
        this.logger.log('Cache invalidation requested (single key)', {
          key: dto.key,
          adminUser,
        });

        const success = await this.cacheService.invalidateKey(dto.key);
        invalidatedCount = success ? 1 : 0;

        this.logger.log('Cache key invalidated', {
          key: dto.key,
          success,
          adminUser,
        });
      } else if (dto.pattern) {
        operationType = 'pattern';
        this.logger.log('Cache invalidation requested (pattern)', {
          pattern: dto.pattern,
          adminUser,
        });

        invalidatedCount = await this.cacheService.invalidatePattern(
          dto.pattern,
        );

        this.logger.log('Cache pattern invalidated', {
          pattern: dto.pattern,
          count: invalidatedCount,
          adminUser,
        });
      } else if (dto.all) {
        operationType = 'all';
        this.logger.warn('Cache invalidation requested (all entries)', {
          adminUser,
          warning: 'This operation invalidates ALL cache entries',
        });

        // Invalidate all cache entries with wildcard pattern
        invalidatedCount = await this.cacheService.invalidatePattern('cache:*');

        this.logger.log('All cache entries invalidated', {
          count: invalidatedCount,
          adminUser,
        });
      } else {
        // Should not happen due to DTO validation, but handle gracefully
        this.logger.warn(
          'Cache invalidation request with no operation specified',
          {
            adminUser,
          },
        );

        return {
          status: 'error',
          invalidatedCount: 0,
          message:
            'No invalidation operation specified (key, pattern, or all required)',
          timestamp: new Date().toISOString(),
        };
      }

      // Record metrics
      this.recordInvalidationMetrics(operationType, invalidatedCount);

      // Emit audit event (for future audit logging implementation)
      this.emitAuditEvent({
        action: 'cache.invalidate',
        operationType,
        count: invalidatedCount,
        adminUser: adminUser || 'unknown',
        details: dto,
      });

      const duration = (Date.now() - startTime) / 1000;
      this.logger.log('Cache invalidation completed', {
        operationType,
        invalidatedCount,
        duration,
        adminUser,
      });

      return {
        status: 'success',
        invalidatedCount,
        message: this.formatSuccessMessage(
          operationType,
          invalidatedCount,
          dto,
        ),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      this.logger.error('Cache invalidation failed', error as Error);
      this.logger.log('Cache invalidation failure details', {
        operationType,
        dto,
        adminUser,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        status: 'error',
        invalidatedCount: 0,
        message: `Cache invalidation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Record telemetry for cache invalidation
   * Implements REQ-FN-021: Observability metrics (now logged instead of exported)
   *
   * @param type - Operation type (single, pattern, all)
   * @param count - Number of keys invalidated
   * @private
   */
  private recordInvalidationMetrics(
    type: 'single' | 'pattern' | 'all',
    count: number,
  ): void {
    // Note: Metrics are created in AdminModule
    // For now, we use the existing cache_evictions_total counter
    // Future enhancement: Add dedicated cache_invalidations_total counter with type label
    if (count > 0) {
      this.metricsRegistry.recordCacheEviction(count);
    }
  }

  /**
   * Emit audit event for cache invalidation
   * Implements REQ-FN-007: Audit trail for administrative actions
   *
   * @param event - Audit event details
   * @private
   */
  private emitAuditEvent(event: {
    action: string;
    operationType: string;
    count: number;
    adminUser: string;
    details: CacheInvalidateDto;
  }): void {
    // TODO: Implement audit event emission once audit logging system is in place
    // For now, this is a placeholder that logs the event at INFO level
    this.logger.log('Audit event: Cache invalidation', {
      ...event,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Format success message based on operation type
   *
   * @param type - Operation type
   * @param count - Number of keys invalidated
   * @param dto - Original request DTO
   * @returns Human-readable success message
   * @private
   */
  private formatSuccessMessage(
    type: 'single' | 'pattern' | 'all',
    count: number,
    dto: CacheInvalidateDto,
  ): string {
    if (type === 'single') {
      return count > 0
        ? `Successfully invalidated cache key: ${dto.key}`
        : `Cache key not found: ${dto.key}`;
    } else if (type === 'pattern') {
      return count > 0
        ? `Successfully invalidated ${count} cache entries matching pattern: ${dto.pattern}`
        : `No cache entries found matching pattern: ${dto.pattern}`;
    } else {
      return count > 0
        ? `Successfully invalidated all ${count} cache entries`
        : 'No cache entries found to invalidate';
    }
  }
}
