// Implements REQ-FN-021: Prometheus Metrics Export
// AdminModule provides metrics export and administrative endpoints

import { Module } from '@nestjs/common';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsRegistryService } from './services/metrics-registry.service';

@Module({
  imports: [
    // REQ-FN-021: Register custom Prometheus metrics
    PrometheusModule.register({
      defaultMetrics: {
        enabled: false, // Already enabled globally in CoreModule
      },
    }),
  ],
  controllers: [], // Controller is registered in CoreModule with @Public() decorator
  providers: [
    MetricsRegistryService,
    // REQ-FN-021: Cache metrics
    makeGaugeProvider({
      name: 'cache_hit_ratio',
      help: 'Cache hit ratio per metric ID (REQ-FN-006)',
      labelNames: ['metricId'],
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
