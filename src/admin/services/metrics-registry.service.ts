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
 * - Cache hit/miss counters per metric ID (use for calculating hit ratio)
 * - Metric computation duration per metric ID
 * - LRS query duration
 * - HTTP request metrics (requests, duration, errors, active requests)
 */
@Injectable()
export class MetricsRegistryService {
  constructor(
    @InjectMetric('cache_hits_total')
    public readonly cacheHitsTotal: Counter<string>,
    @InjectMetric('cache_misses_total')
    public readonly cacheMissesTotal: Counter<string>,
    @InjectMetric('cache_evictions_total')
    public readonly cacheEvictionsTotal: Counter<string>,
    @InjectMetric('cache_operations_duration_seconds')
    public readonly cacheOperationsDuration: Histogram<string>,
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
   * Increments the cache hits counter for the specified metric.
   * Cache hit ratio can be calculated as: cache_hits_total / (cache_hits_total + cache_misses_total)
   * @param metricId - The metric identifier
   */
  recordCacheHit(metricId: string): void {
    this.cacheHitsTotal.inc({ metricId });
  }

  /**
   * Record cache miss for a metric
   * Increments the cache misses counter for the specified metric.
   * Cache hit ratio can be calculated as: cache_hits_total / (cache_hits_total + cache_misses_total)
   * @param metricId - The metric identifier
   */
  recordCacheMiss(metricId: string): void {
    this.cacheMissesTotal.inc({ metricId });
  }

  /**
   * Record cache eviction/invalidation
   * Increments the cache evictions counter
   * @param count - Number of keys evicted (default: 1)
   */
  recordCacheEviction(count: number = 1): void {
    this.cacheEvictionsTotal.inc(count);
  }

  /**
   * Record cache operation duration
   * @param operation - Operation type (get, set, delete, invalidatePattern)
   * @param durationSeconds - Duration in seconds
   */
  recordCacheOperation(operation: string, durationSeconds: number): void {
    this.cacheOperationsDuration.observe({ operation }, durationSeconds);
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
   *
   * IMPORTANT: To prevent high cardinality issues, the 'endpoint' parameter should use
   * route patterns (e.g., '/api/v1/metrics/:id') rather than actual paths with parameter
   * values (e.g., '/api/v1/metrics/123'). Normalize dynamic path segments before calling.
   *
   * @param method - HTTP method (GET, POST, etc.)
   * @param endpoint - Request endpoint pattern (use route pattern, not actual path with IDs)
   * @param status - HTTP status code
   */
  recordHttpRequest(method: string, endpoint: string, status: string): void {
    this.httpRequestsTotal.inc({ method, endpoint, status });
  }

  /**
   * Record HTTP request duration
   *
   * IMPORTANT: To prevent high cardinality issues, the 'endpoint' parameter should use
   * route patterns (e.g., '/api/v1/metrics/:id') rather than actual paths with parameter
   * values (e.g., '/api/v1/metrics/123'). Normalize dynamic path segments before calling.
   *
   * @param method - HTTP method
   * @param endpoint - Request endpoint pattern (use route pattern, not actual path with IDs)
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
