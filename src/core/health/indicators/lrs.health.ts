// Implements REQ-NF-002: Health/Readiness Endpoints - LRS Health Indicator
// Implements REQ-FN-025: LRS Instance Health Monitoring
// Custom health indicator for LRS (Learning Record Store) connectivity

import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { LRSHealthSchedulerService } from '../services/lrs-health-scheduler.service';

/**
 * LRS health indicator
 * Checks connectivity to Learning Record Store (xAPI endpoint)
 *
 * REQ-FN-025: Uses health scheduler for aggregated status
 */
@Injectable()
export class LrsHealthIndicator extends HealthIndicator {
  constructor(private readonly healthScheduler: LRSHealthSchedulerService) {
    super();
  }

  /**
   * Check if LRS is reachable
   * Returns aggregated status from health scheduler
   *
   * REQ-FN-025: Overall status aggregation
   * - 'healthy': All instances healthy
   * - 'degraded': Some instances healthy
   * - 'unhealthy': All instances unhealthy
   *
   * @param key - Health check key name
   * @returns Health indicator result
   */
  isHealthy(key: string): Promise<HealthIndicatorResult> {
    const overallStatus = this.healthScheduler.getOverallStatus();
    const allInstances = this.healthScheduler.getAllInstancesHealth();

    // Terminus considers 'degraded' as healthy (service still operational)
    // Only 'unhealthy' (all instances down) should fail the health check
    const isHealthy = overallStatus !== 'unhealthy';

    if (isHealthy) {
      return Promise.resolve(
        this.getStatus(key, true, {
          status: overallStatus,
          message: `LRS status: ${overallStatus}`,
          instanceCount: allInstances.size,
        }),
      );
    }

    const result = this.getStatus(key, false, {
      status: overallStatus,
      message: 'All LRS instances are unhealthy',
      instanceCount: allInstances.size,
    });
    return Promise.reject(
      new HealthCheckError('LRS health check failed', result),
    );
  }
}
