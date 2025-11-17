// Provides telemetry hooks for cache, HTTP, LRS, and circuit breaker events.
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../core/logger';

type Payload = Record<string, unknown>;

@Injectable()
export class MetricsRegistryService {
  private readonly shouldLog =
    (process.env.METRICS_DEBUG ?? '').toLowerCase() === 'true';

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('MetricsRegistryService');
  }

  recordCacheHit(metricId: string): void {
    this.log('cache.hit', { metricId });
  }

  recordCacheMiss(metricId: string): void {
    this.log('cache.miss', { metricId });
  }

  recordMetricComputationError(): void {
    this.log('metric.error');
  }

  recordCacheEviction(count: number = 1): void {
    this.log('cache.eviction', { count });
  }

  recordCacheOperation(operation: string, durationSeconds: number): void {
    this.log('cache.operation', { operation, durationSeconds });
  }

  recordMetricComputation(metricId: string, durationSeconds: number): void {
    this.log('metric.computation', { metricId, durationSeconds });
  }

  recordLrsQuery(durationSeconds: number): void {
    this.log('lrs.query', { durationSeconds });
  }

  recordLrsError(errorType: string): void {
    this.log('lrs.error', { errorType });
  }

  recordHttpRequest(method: string, endpoint: string, status: string): void {
    this.log('http.request', { method, endpoint, status });
  }

  recordHttpDuration(
    method: string,
    endpoint: string,
    durationSeconds: number,
  ): void {
    this.log('http.duration', { method, endpoint, durationSeconds });
  }

  recordHttpError(status: string): void {
    this.log('http.error', { status });
  }

  incrementActiveRequests(): void {
    this.log('http.active.inc');
  }

  decrementActiveRequests(): void {
    this.log('http.active.dec');
  }

  recordCircuitBreakerOpen(service: string): void {
    this.log('circuit.open', { service });
  }

  recordCircuitBreakerStateTransition(
    service: string,
    from: string,
    to: string,
  ): void {
    this.log('circuit.transition', { service, from, to });
  }

  setCircuitBreakerState(service: string, state: number): void {
    this.log('circuit.state', { service, state });
  }

  recordCircuitBreakerFailure(service: string): void {
    this.log('circuit.failure', { service });
  }

  recordCircuitBreakerSuccess(service: string): void {
    this.log('circuit.success', { service });
  }

  recordGracefulDegradation(metricId: string, reason: string): void {
    this.log('graceful.degradation', { metricId, reason });
  }

  setLrsHealthStatus(instanceId: string, status: number): void {
    this.log('lrs.health.status', { instanceId, status });
  }

  recordLrsHealthCheckDuration(
    instanceId: string,
    durationSeconds: number,
  ): void {
    this.log('lrs.health.duration', { instanceId, durationSeconds });
  }

  recordLrsHealthCheckFailure(instanceId: string): void {
    this.log('lrs.health.failure', { instanceId });
  }

  private log(event: string, payload?: Payload): void {
    if (!this.shouldLog) {
      return;
    }

    this.logger.debug(`Telemetry event: ${event}`, payload ?? {});
  }
}
