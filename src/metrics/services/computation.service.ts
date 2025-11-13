// Implements REQ-FN-005: Metric Computation Service with Cache-Aside Pattern
// Orchestrates metric computation pipeline: cache check → provider load → LRS query → compute → cache store

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { LoggerService } from '../../core/logger';
import { CacheService } from '../../data-access/services/cache.service';
import { LRSClient } from '../../data-access/clients/lrs.client';
import { xAPIQueryFilters } from '../../data-access/interfaces/lrs.interface';
import { IMetricComputation } from '../../computation/interfaces/metric.interface';
import { MetricParams } from '../../computation/interfaces/metric-params.interface';
import { MetricResultResponseDto } from '../dto/metric-results.dto';
import { MetricsRegistryService } from '../../admin/services/metrics-registry.service';

/**
 * Computation Service
 * Implements REQ-FN-005: Metric computation pipeline with cache-aside pattern
 *
 * @remarks
 * - Orchestrates full computation pipeline: cache → provider → LRS → compute → store
 * - Implements cache-aside pattern per REQ-FN-006
 * - Loads metric providers dynamically via NestJS ModuleRef
 * - Records Prometheus metrics for observability
 * - Handles errors gracefully with descriptive messages
 * - Propagates correlation IDs through pipeline
 *
 * Pipeline Flow:
 * 1. Generate cache key from metric ID and parameters
 * 2. Check cache for existing result (cache hit → return immediately)
 * 3. Load metric provider by ID (not found → 404)
 * 4. Validate parameters via provider.validateParams() (invalid → 400)
 * 5. Query LRS with filters (unavailable → 503)
 * 6. Call provider.compute(params, lrsData) (error → 500)
 * 7. Store result in cache with TTL
 * 8. Return result with metadata
 */
@Injectable()
export class ComputationService {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly cacheService: CacheService,
    private readonly lrsClient: LRSClient,
    private readonly logger: LoggerService,
    private readonly metricsRegistry: MetricsRegistryService,
  ) {
    this.logger.setContext('ComputationService');
  }

  /**
   * Compute a metric with cache-aside pattern
   * Implements REQ-FN-005: Full metric computation pipeline
   *
   * @param metricId - Unique identifier of the metric to compute
   * @param params - Parameters for metric computation (courseId, topicId, since, until, etc.)
   * @returns Metric result with value, timestamp, computation time, and cache status
   *
   * @throws NotFoundException if metric provider not found (404)
   * @throws BadRequestException if parameter validation fails (400)
   * @throws ServiceUnavailableException if LRS unavailable (503)
   * @throws InternalServerErrorException if computation fails (500)
   */
  async computeMetric(
    metricId: string,
    params: MetricParams,
  ): Promise<MetricResultResponseDto> {
    const startTime = Date.now();

    this.logger.log('Metric computation started', {
      metricId,
      params: this.sanitizeParamsForLogging(params),
    });

    try {
      // Step 1: Generate cache key
      const cacheKey = this.generateCacheKey(metricId, params);

      // Step 2: Check cache (REQ-FN-006: Cache-aside pattern)
      const cached =
        await this.cacheService.get<MetricResultResponseDto>(cacheKey);

      if (cached) {
        const computationTime = Date.now() - startTime;

        this.logger.log('Metric result served from cache', {
          metricId,
          cacheKey,
          computationTime,
        });

        // REQ-FN-005: Record cache hit for metric computation
        this.metricsRegistry.recordCacheHit(metricId);

        return {
          ...cached,
          fromCache: true,
          computationTime,
        };
      }

      // Cache miss - proceed with computation
      // REQ-FN-005: Record cache miss for metric computation
      this.metricsRegistry.recordCacheMiss(metricId);
      this.logger.debug('Cache miss - computing metric', {
        metricId,
        cacheKey,
      });

      // Step 3: Load metric provider (REQ-FN-010: Dynamic provider loading)
      const provider = await this.loadProvider(metricId);

      // Step 4: Validate parameters (REQ-FN-010: Provider validates params)
      if (provider.validateParams) {
        try {
          provider.validateParams(params);
        } catch (error) {
          this.logger.warn('Parameter validation failed', {
            metricId,
            error: error instanceof Error ? error.message : String(error),
          });
          // Throw BadRequestException for proper error handling
          throw new BadRequestException(
            error instanceof Error
              ? error.message
              : 'Parameter validation failed',
          );
        }
      }

      // Step 5: Query LRS (REQ-FN-002: LRS integration)
      const lrsFilters = this.buildLRSFilters(params);
      let statements;
      try {
        statements = await this.lrsClient.queryStatements(lrsFilters);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('LRS query failed', error as Error);

        // Check if it's an LRS connection/availability error
        if (
          errorMessage.includes('connection') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('unavailable')
        ) {
          throw new ServiceUnavailableException(
            'Learning Record Store is currently unavailable',
          );
        }
        // Re-throw other errors
        throw error;
      }

      this.logger.debug('LRS query completed', {
        metricId,
        statementCount: statements.length,
      });

      // Step 6: Call provider.compute() (REQ-FN-004: Stateless computation)
      const computeStartTime = Date.now();
      let result;
      try {
        result = await provider.compute(params, statements);
      } catch (error) {
        this.logger.error('Metric computation failed', error as Error);
        throw new InternalServerErrorException(
          `Failed to compute metric: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
      const computeDuration = (Date.now() - computeStartTime) / 1000;

      // Record computation duration metric
      this.metricsRegistry.recordMetricComputation(metricId, computeDuration);

      this.logger.log('Metric computed successfully', {
        metricId,
        value: result.value,
        computeDuration,
      });

      // Step 7: Store result in cache (REQ-FN-006: Cache-aside pattern)
      const response: MetricResultResponseDto = {
        metricId: result.metricId,
        value: result.value,
        timestamp: result.computed,
        computationTime: Date.now() - startTime,
        fromCache: false,
        metadata: result.metadata,
      };

      await this.cacheService.set(cacheKey, response, undefined, 'results');

      this.logger.log('Metric result cached', { metricId, cacheKey });

      return response;
    } catch (error) {
      const computationTime = Date.now() - startTime;

      // Record error metric (REQ-FN-005)
      this.metricsRegistry.recordMetricComputationError();

      this.logger.error(
        `Metric computation failed: ${(error as Error).message}`,
        error as Error,
      );
      this.logger.debug('Metric computation error details', {
        metricId,
        computationTime,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      });

      throw error; // Re-throw for controller error handling
    }
  }

  /**
   * Load metric provider by ID
   * Uses NestJS ModuleRef for dynamic provider resolution
   *
   * @param metricId - Unique identifier of the metric
   * @returns Metric provider instance implementing IMetricComputation
   * @throws NotFoundException if provider not found
   * @private
   */
  private async loadProvider(metricId: string): Promise<IMetricComputation> {
    try {
      // Import all provider classes
      const {
        ExampleMetricProvider,
        CourseCompletionProvider,
        LearningEngagementProvider,
        TopicMasteryProvider,
      } = await import('../../computation/providers');

      // List of all provider classes
      const providerClasses = [
        ExampleMetricProvider,
        CourseCompletionProvider,
        LearningEngagementProvider,
        TopicMasteryProvider,
      ];

      // Search for provider with matching ID
      for (const ProviderClass of providerClasses) {
        try {
          const provider = this.moduleRef.get<IMetricComputation>(
            ProviderClass,
            { strict: false },
          );

          if (provider?.id === metricId) {
            this.logger.debug('Metric provider loaded', {
              metricId,
              providerClass: ProviderClass.name,
            });
            return provider;
          }
        } catch {
          // Provider not found in this module, continue searching
          continue;
        }
      }

      // Provider not found
      this.logger.warn('Metric provider not found', { metricId });
      throw new NotFoundException(
        `Metric with id '${metricId}' not found in catalog`,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Error loading metric provider', error as Error);
      throw new NotFoundException(
        `Metric with id '${metricId}' not found in catalog`,
      );
    }
  }

  /**
   * Build LRS query filters from metric parameters
   * Maps metric params to xAPI query filters
   *
   * @param params - Metric computation parameters
   * @returns xAPI query filters for LRS client
   * @private
   */
  private buildLRSFilters(params: MetricParams): xAPIQueryFilters {
    const filters: xAPIQueryFilters = {};

    // Time range filters
    if (params.since) {
      filters.since = params.since;
    }

    if (params.until) {
      filters.until = params.until;
    }

    // Context filters (courseId maps to xAPI context.extensions)
    // Note: Full context filtering implementation depends on xAPI schema
    // For now, we fetch statements and let provider filter by context

    return filters;
  }

  /**
   * Generate cache key from metric ID and parameters
   * Format: cache:metricId:scope:filters
   * Implements REQ-FN-006: Cache key structure
   *
   * @param metricId - Unique identifier of the metric
   * @param params - Metric computation parameters
   * @returns Cache key string
   * @private
   *
   * @example
   * ```
   * cache:course-completion:course:123:2025-01-01:2025-12-31
   * cache:course-completion:course:123:user:456:activityType:quiz
   * ```
   *
   * @remarks
   * - userId and groupId can coexist for user-within-group context
   * - Filters are sorted alphabetically for consistent key generation
   */
  private generateCacheKey(metricId: string, params: MetricParams): string {
    const parts = ['cache', metricId];

    // Add scope identifiers (mutually exclusive: course OR topic OR element)
    if (params.courseId) {
      parts.push('course', params.courseId);
    } else if (params.topicId) {
      parts.push('topic', params.topicId);
    } else if (params.elementId) {
      parts.push('element', params.elementId);
    }

    // Add time range to key for cache invalidation
    if (params.since) {
      parts.push(params.since);
    }

    if (params.until) {
      parts.push(params.until);
    }

    // Add other identifiers (can coexist for user-within-group context)
    if (params.userId) {
      parts.push('user', params.userId);
    }

    if (params.groupId) {
      parts.push('group', params.groupId);
    }

    // Add filters to cache key for metric-specific filtering (REQ-FN-006)
    if (params.filters && Object.keys(params.filters).length > 0) {
      const filterKeys = Object.keys(params.filters).sort();
      for (const key of filterKeys) {
        parts.push(key, String(params.filters[key]));
      }
    }

    return parts.join(':');
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   * @param params - Metric parameters
   * @returns Sanitized parameters object
   * @private
   */
  private sanitizeParamsForLogging(
    params: MetricParams,
  ): Record<string, unknown> {
    return {
      courseId: params.courseId,
      topicId: params.topicId,
      elementId: params.elementId,
      since: params.since,
      until: params.until,
      hasFilters: !!params.filters,
    };
  }
}
