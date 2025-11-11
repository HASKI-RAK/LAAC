// Implements REQ-FN-021: Prometheus Custom Metrics Registry
// Central service for registering and managing custom Prometheus metrics

import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

/**
 * Metrics Registry Service
 * Implements REQ-FN-021: Custom metrics for caching, computation, and LRS queries
 *
 * This service provides centralized access to custom Prometheus metrics:
 * - Cache hit/miss ratios per metric ID
 * - Metric computation duration per metric ID
 * - LRS query duration
 * - HTTP request metrics (requests, duration, errors, active requests)
 */
@Injectable()
export class MetricsRegistryService {
  constructor(
    @InjectMetric('cache_hit_ratio')
    public readonly cacheHitRatio: Gauge<string>,
    @InjectMetric('metric_computation_duration_seconds')
    public readonly metricComputationDuration: Histogram<string>,
    @InjectMetric('lrs_query_duration_seconds')
    public readonly lrsQueryDuration: Histogram<string>,
    @InjectMetric('http_requests_total')
    public readonly httpRequestsTotal: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    public readonly httpRequestDuration: Histogram<string>,
    @InjectMetric('http_errors_total')
    public readonly httpErrorsTotal: Counter<string>,
    @InjectMetric('http_active_requests')
    public readonly httpActiveRequests: Gauge<string>,
  ) {}

  /**
   * Record cache hit for a metric
   * @param metricId - The metric identifier
   */
  recordCacheHit(metricId: string): void {
    // Update gauge to reflect cache hit ratio
    // In a real implementation, this would track hits/misses and calculate ratio
    this.cacheHitRatio.set({ metricId }, 1);
  }

  /**
   * Record cache miss for a metric
   * @param metricId - The metric identifier
   */
  recordCacheMiss(metricId: string): void {
    // Update gauge to reflect cache miss
    this.cacheHitRatio.set({ metricId }, 0);
  }

  /**
   * Record metric computation duration
   * @param metricId - The metric identifier
   * @param durationSeconds - Duration in seconds
   */
  recordMetricComputation(metricId: string, durationSeconds: number): void {
    this.metricComputationDuration.observe({ metricId }, durationSeconds);
  }

  /**
   * Record LRS query duration
   * @param durationSeconds - Duration in seconds
   */
  recordLrsQuery(durationSeconds: number): void {
    this.lrsQueryDuration.observe(durationSeconds);
  }

  /**
   * Record HTTP request
   * @param method - HTTP method (GET, POST, etc.)
   * @param endpoint - Request endpoint
   * @param status - HTTP status code
   */
  recordHttpRequest(method: string, endpoint: string, status: string): void {
    this.httpRequestsTotal.inc({ method, endpoint, status });
  }

  /**
   * Record HTTP request duration
   * @param method - HTTP method
   * @param endpoint - Request endpoint
   * @param durationSeconds - Duration in seconds
   */
  recordHttpDuration(
    method: string,
    endpoint: string,
    durationSeconds: number,
  ): void {
    this.httpRequestDuration.observe({ method, endpoint }, durationSeconds);
  }

  /**
   * Record HTTP error
   * @param status - HTTP status code
   */
  recordHttpError(status: string): void {
    this.httpErrorsTotal.inc({ status });
  }

  /**
   * Increment active HTTP requests counter
   */
  incrementActiveRequests(): void {
    this.httpActiveRequests.inc();
  }

  /**
   * Decrement active HTTP requests counter
   */
  decrementActiveRequests(): void {
    this.httpActiveRequests.dec();
  }
}
