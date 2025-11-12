// Implements REQ-FN-021: Prometheus Metrics Export
// REQ-FN-007: Cache Invalidation Admin Endpoints
// AdminModule provides metrics export and administrative endpoints

import { Module, forwardRef } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsRegistryService } from './services/metrics-registry.service';
import { CacheAdminService } from './services/cache.admin.service';
import { CacheController } from './controllers/cache.controller';
import { DataAccessModule } from '../data-access/data-access.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // No PrometheusModule registration here; handled globally in CoreModule (REQ-FN-021)
    forwardRef(() => DataAccessModule), // Import CacheService for cache invalidation
    AuthModule, // Import auth guards for cache controller
  ],
  controllers: [
    CacheController, // REQ-FN-007: Cache invalidation admin endpoint
  ],
  providers: [
    MetricsRegistryService,
    CacheAdminService, // REQ-FN-007: Cache admin service
    // REQ-FN-021: Cache metrics - separate counters for hits and misses
    makeCounterProvider({
      name: 'cache_hits_total',
      help: 'Total cache hits per metric ID (REQ-FN-006)',
      labelNames: ['metricId'],
    }),
    makeCounterProvider({
      name: 'cache_misses_total',
      help: 'Total cache misses per metric ID (REQ-FN-006)',
      labelNames: ['metricId'],
    }),
    makeCounterProvider({
      name: 'cache_evictions_total',
      help: 'Total cache evictions/invalidations (REQ-FN-006)',
    }),
    makeHistogramProvider({
      name: 'cache_operations_duration_seconds',
      help: 'Cache operation duration in seconds (REQ-FN-006)',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5], // 1ms to 500ms
    }),
    // REQ-FN-021: Metric computation metrics
    makeHistogramProvider({
      name: 'metric_computation_duration_seconds',
      help: 'Metric computation duration in seconds (REQ-FN-004)',
      labelNames: ['metricId'],
      buckets: [0.1, 0.5, 1, 2, 5, 10], // Seconds
    }),
    // REQ-FN-021: LRS query metrics
    makeHistogramProvider({
      name: 'lrs_query_duration_seconds',
      help: 'LRS query duration in seconds (REQ-FN-002)',
      buckets: [0.1, 0.5, 1, 2, 5, 10], // Seconds
    }),
    // REQ-FN-021: HTTP metrics
    // NOTE: The 'endpoint' label should use route patterns (e.g., '/api/v1/metrics/:id')
    // rather than actual paths with parameter values to prevent high cardinality issues.
    // When recording these metrics, normalize dynamic path segments to their patterns.
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total HTTP requests by method, endpoint, and status',
      labelNames: ['method', 'endpoint', 'status'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'endpoint'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5], // Seconds
    }),
    makeCounterProvider({
      name: 'http_errors_total',
      help: 'Total HTTP errors by status code',
      labelNames: ['status'],
    }),
    makeGaugeProvider({
      name: 'http_active_requests',
      help: 'Number of active HTTP requests',
    }),
  ],
  exports: [MetricsRegistryService], // Export for use in other modules
})
export class AdminModule {}
