// Implements REQ-FN-025: LRS Instance Health Monitoring
// Periodic background health checks for all configured LRS instances

import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../logger/logger.service';
import { MetricsRegistryService } from '../../../admin/services/metrics-registry.service';
import {
  ILRSClient,
  LRSHealthStatus,
} from '../../../data-access/interfaces/lrs.interface';
import { Configuration } from '../../config/config.interface';

/**
 * Per-instance health status tracking
 * Implements REQ-FN-025: Health status storage with latency and error tracking
 */
export interface LRSInstanceHealthInfo {
  instanceId: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency?: number;
  lastCheck: Date;
  error?: string;
  version?: string;
}

/**
 * LRS Health Scheduler Service
 * Implements REQ-FN-025: Periodic health monitoring for all LRS instances
 *
 * Features:
 * - Background health checks every 30 seconds (configurable)
 * - Per-instance status tracking with latency metrics
 * - Prometheus metrics export
 * - Structured logging (DEBUG for success, WARN for failures, INFO for transitions)
 * - Circuit breaker integration via health status
 *
 * @remarks
 * - Uses GET /xapi/about endpoint for health checks (lightweight)
 * - Status semantics: 2xx/401/403 = reachable (healthy), others = unreachable (unhealthy)
 * - Health checks use same authentication as analytics queries (per-instance)
 */
@Injectable()
export class LRSHealthSchedulerService implements OnModuleInit {
  private instanceHealthMap = new Map<string, LRSInstanceHealthInfo>();
  private lrsClients: ILRSClient[] = [];

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<Configuration>,
    private readonly metricsRegistry: MetricsRegistryService,
  ) {
    this.logger.setContext('LRSHealthScheduler');
  }

  onModuleInit() {
    this.logger.log('LRS Health Scheduler initialized');
  }

  /**
   * Register LRS client for health monitoring
   * Called by DataAccessModule when LRS clients are created
   * @param client - LRS client instance to monitor
   */
  registerLRSClient(client: ILRSClient): void {
    this.lrsClients.push(client);
    this.logger.log(
      `Registered LRS client for health monitoring: ${client.instanceId}`,
    );

    // Initialize with unknown status
    this.instanceHealthMap.set(client.instanceId, {
      instanceId: client.instanceId,
      status: 'unknown',
      lastCheck: new Date(),
    });
  }

  /**
   * Periodic health check for all LRS instances
   * Runs every 30 seconds (configurable via cron expression)
   * REQ-FN-025: Background health monitoring
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkAllInstancesHealth(): Promise<void> {
    if (this.lrsClients.length === 0) {
      return; // No clients registered yet
    }

    this.logger.debug(
      `Running health checks for ${this.lrsClients.length} LRS instances`,
    );

    // Check all instances in parallel
    const healthChecks = this.lrsClients.map((client) =>
      this.checkInstanceHealth(client),
    );

    await Promise.allSettled(healthChecks);
  }

  /**
   * Check health for a single LRS instance
   * @param client - LRS client to check
   */
  private async checkInstanceHealth(client: ILRSClient): Promise<void> {
    const startTime = Date.now();
    const instanceId = client.instanceId;

    try {
      const healthStatus: LRSHealthStatus = await client.getInstanceHealth();
      const latency = Date.now() - startTime;

      const previousStatus =
        this.instanceHealthMap.get(instanceId)?.status || 'unknown';
      const newStatus = healthStatus.healthy ? 'healthy' : 'unhealthy';

      // Update internal state
      this.instanceHealthMap.set(instanceId, {
        instanceId,
        status: newStatus,
        latency: healthStatus.responseTimeMs || latency,
        lastCheck: new Date(),
        error: healthStatus.error,
        version: healthStatus.version,
      });

      // Record Prometheus metrics
      this.metricsRegistry.recordLrsHealthStatus(
        instanceId,
        newStatus === 'healthy' ? 1 : 0,
      );
      this.metricsRegistry.recordLrsHealthCheckDuration(
        instanceId,
        latency / 1000,
      );

      if (newStatus === 'healthy') {
        // Log success at DEBUG level to avoid log spam
        this.logger.debug(`LRS health check succeeded`, {
          instanceId,
          latency,
          version: healthStatus.version,
        });
      } else {
        // Log failure at WARN level
        this.logger.warn(`LRS health check failed`, {
          instanceId,
          error: healthStatus.error,
          latency,
        });

        // Record failure metric
        this.metricsRegistry.recordLrsHealthCheckFailure(instanceId);
      }

      // Log state transitions at INFO level
      if (previousStatus !== newStatus && previousStatus !== 'unknown') {
        this.logger.log(
          `LRS health status transition: ${previousStatus} → ${newStatus}`,
          {
            instanceId,
            previousStatus,
            newStatus,
            latency,
          },
        );
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      const previousStatus =
        this.instanceHealthMap.get(instanceId)?.status || 'unknown';

      // Update internal state
      this.instanceHealthMap.set(instanceId, {
        instanceId,
        status: 'unhealthy',
        latency,
        lastCheck: new Date(),
        error: (error as Error).message,
      });

      // Record Prometheus metrics
      this.metricsRegistry.recordLrsHealthStatus(instanceId, 0);
      this.metricsRegistry.recordLrsHealthCheckDuration(
        instanceId,
        latency / 1000,
      );
      this.metricsRegistry.recordLrsHealthCheckFailure(instanceId);

      // Log failure at WARN level
      this.logger.warn(`LRS health check failed`, {
        instanceId,
        error: (error as Error).message,
        latency,
      });

      // Log state transition at INFO level
      if (previousStatus !== 'unhealthy' && previousStatus !== 'unknown') {
        this.logger.log(
          `LRS health status transition: ${previousStatus} → unhealthy`,
          {
            instanceId,
            previousStatus,
            newStatus: 'unhealthy',
            error: (error as Error).message,
          },
        );
      }
    }
  }

  /**
   * Get health status for a specific LRS instance
   * @param instanceId - LRS instance identifier
   * @returns Health info or undefined if not found
   */
  getInstanceHealth(instanceId: string): LRSInstanceHealthInfo | undefined {
    return this.instanceHealthMap.get(instanceId);
  }

  /**
   * Get health status for all LRS instances
   * @returns Map of all instance health info
   */
  getAllInstancesHealth(): Map<string, LRSInstanceHealthInfo> {
    return new Map(this.instanceHealthMap);
  }

  /**
   * Get overall LRS health status
   * REQ-FN-025: Status aggregation logic
   * @returns 'healthy' (all up), 'degraded' (some down), 'unhealthy' (all down)
   */
  getOverallStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const instances = Array.from(this.instanceHealthMap.values());

    if (instances.length === 0) {
      return 'unhealthy'; // No instances configured
    }

    const healthyCount = instances.filter((i) => i.status === 'healthy').length;
    const totalCount = instances.length;

    if (healthyCount === totalCount) {
      return 'healthy'; // All instances healthy
    } else if (healthyCount > 0) {
      return 'degraded'; // Some instances healthy
    } else {
      return 'unhealthy'; // All instances unhealthy
    }
  }
}
