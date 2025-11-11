// Implements REQ-FN-003: Metrics Catalog Service
// Provides catalog management and metric discovery functionality

import { Injectable, NotFoundException } from '@nestjs/common';
import { LoggerService } from '../../core/logger';
import { MetricsCatalogResponseDto, MetricDetailResponseDto } from '../dto';

/**
 * Metrics Service
 * Manages the metrics catalog and provides discovery functionality
 * Implements REQ-FN-003: Metrics Catalog and Discovery
 *
 * Phase 1: Returns empty catalog (skeleton implementation)
 * Phase 2+: Will integrate with metric providers and computation engine
 */
@Injectable()
export class MetricsService {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Get the complete metrics catalog
   * Returns array of all registered metrics
   *
   * Implements REQ-FN-003: GET /api/v1/metrics endpoint logic
   *
   * @returns Catalog response with array of metric items
   */
  getCatalog(): MetricsCatalogResponseDto {
    // Phase 1: Return empty catalog (skeleton implementation)
    // Phase 2+: Return metrics from providers (QuickMetricProvider, ThesisMetricProvider)
    this.logger.log('Metrics catalog requested', {
      context: 'MetricsService',
      metricCount: 0,
    });

    return {
      items: [],
    };
  }

  /**
   * Get details for a specific metric by ID
   *
   * Implements REQ-FN-003: GET /api/v1/metrics/:id endpoint logic
   *
   * @param id - Metric identifier
   * @returns Metric detail response
   * @throws NotFoundException if metric ID is not found
   */
  getMetricById(id: string): MetricDetailResponseDto {
    // Phase 1: Always throw 404 (empty catalog)
    // Phase 2+: Lookup metric from registry/providers
    this.logger.log('Metric detail requested', {
      context: 'MetricsService',
      metricId: id,
    });

    // Metric not found in catalog (empty in Phase 1)
    throw new NotFoundException({
      statusCode: 404,
      message: `Metric with id '${id}' not found in catalog`,
      error: 'Not Found',
    });
  }
}
