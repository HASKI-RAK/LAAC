// Implements REQ-FN-003: Metrics Catalog Service
// Provides catalog management and metric discovery functionality

import { Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { LoggerService } from '../../core/logger';
import {
  MetricsCatalogResponseDto,
  MetricDetailResponseDto,
  MetricCatalogItemDto,
} from '../dto';
import { METRIC_PROVIDER_CLASSES } from '../../computation/providers';
import { IMetricComputation } from '../../computation/interfaces/metric.interface';
import { DashboardLevel } from '../dto/metric-query.dto';

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
  private providerCache?: IMetricComputation[];

  constructor(
    private readonly logger: LoggerService,
    private readonly moduleRef: ModuleRef,
  ) {
    this.logger.setContext('MetricsService');
  }

  /**
   * Get the complete metrics catalog
   * Returns array of all registered metrics
   *
   * Implements REQ-FN-003: GET /api/v1/metrics endpoint logic
   *
   * @returns Catalog response with array of metric items
   */
  getCatalog(): MetricsCatalogResponseDto {
    const providers = this.getProviders();
    const items = providers.map((provider) => this.toCatalogItem(provider));

    this.logger.log('Metrics catalog requested', {
      metricCount: items.length,
    });

    return {
      items,
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
    const providers = this.getProviders();
    const provider = providers.find((metric) => metric.id === id);

    if (!provider) {
      this.logger.warn('Metric detail lookup failed', { metricId: id });
      throw new NotFoundException({
        statusCode: 404,
        message: `Metric with id '${id}' not found in catalog`,
        error: 'Not Found',
      });
    }

    this.logger.log('Metric detail requested', {
      metricId: id,
      dashboardLevel: provider.dashboardLevel,
    });

    return this.toDetailResponse(provider);
  }

  private getProviders(): IMetricComputation[] {
    if (this.providerCache) {
      return this.providerCache;
    }

    const instances: IMetricComputation[] = [];

    for (const ProviderClass of METRIC_PROVIDER_CLASSES) {
      try {
        const provider = this.moduleRef.get<IMetricComputation>(ProviderClass, {
          strict: false,
        });

        if (provider) {
          instances.push(provider);
        }
      } catch (error) {
        this.logger.warn('Metric provider not registered in moduleRef', {
          provider: ProviderClass.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.providerCache = instances;
    return instances;
  }

  private toCatalogItem(provider: IMetricComputation): MetricCatalogItemDto {
    return {
      id: provider.id,
      title: provider.title ?? this.deriveTitle(provider.id),
      dashboardLevel: provider.dashboardLevel as DashboardLevel,
      description: provider.description,
      version: provider.version,
      requiredParams: provider.requiredParams ?? [],
      optionalParams: provider.optionalParams ?? [],
      outputType: provider.outputType ?? 'scalar',
      example: provider.example,
    };
  }

  private toDetailResponse(
    provider: IMetricComputation,
  ): MetricDetailResponseDto {
    return this.toCatalogItem(provider);
  }

  private deriveTitle(metricId: string): string {
    return metricId
      .split(/[-_]/)
      .map((segment) =>
        segment.length > 0
          ? segment[0].toUpperCase() + segment.slice(1)
          : segment,
      )
      .join(' ')
      .trim();
  }
}
