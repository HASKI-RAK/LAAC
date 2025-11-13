// Implements REQ-NF-002: Health/Readiness Endpoints
// Implements REQ-FN-025: LRS Instance Health Monitoring
// Provides liveness and readiness probes for Kubernetes/Docker health checks

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis.health';
import { LrsHealthIndicator } from './indicators/lrs.health';
import { HealthResponseDto } from './dto/health-response.dto';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../auth/decorators';
import { LRSHealthSchedulerService } from './services/lrs-health-scheduler.service';

/**
 * Health check controller
 * Implements REQ-NF-002: Standalone Deployability - Health/Readiness endpoints
 * Implements REQ-FN-025: LRS Instance Health Monitoring
 *
 * Endpoints:
 * - GET /health/liveness: Returns 200 if app is running (independent of LRS)
 * - GET /health/readiness: Returns 200 if app + Redis + LRS are reachable
 *
 * Note: These endpoints are public (bypass authentication per REQ-FN-023)
 * Note: These endpoints skip rate limiting (REQ-FN-024)
 */
@ApiTags('Health')
@Controller('health')
@Public() // REQ-FN-023: Health endpoints are public
@SkipThrottle() // REQ-FN-024: Health endpoints bypass rate limiting
export class HealthController {
  private readonly version: string;

  constructor(
    private readonly health: HealthCheckService,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly lrsHealth: LrsHealthIndicator,
    private readonly lrsHealthScheduler: LRSHealthSchedulerService,
    private readonly configService: ConfigService,
  ) {
    // Get app version from package.json or config
    this.version = '0.0.1'; // TODO: Load from package.json dynamically
  }

  /**
   * Liveness probe
   * Returns 200 if the application is running
   * Used by container orchestrators to determine if app should be restarted
   *
   * REQ-NF-002: Liveness endpoint indicates when service is operational
   * REQ-FN-025: Liveness is independent of LRS status
   */
  @Get('liveness')
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Returns 200 if the application is running. Used for container health checks. Independent of external dependencies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
    type: HealthResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not healthy',
  })
  async checkLiveness(): Promise<HealthCheckResult> {
    // Liveness only checks if the app itself is running
    // No external dependencies checked
    const result = await this.health.check([]);

    // Enhance with version and timestamp
    return this.enhanceResponse(result);
  }

  /**
   * Readiness probe
   * Returns 200 if the application and all dependencies are ready
   * Used by container orchestrators to determine if app can receive traffic
   *
   * REQ-NF-002: Readiness endpoint indicates when service is operational with dependencies
   * REQ-FN-025: Includes per-instance LRS health status breakdown
   */
  @Get('readiness')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Returns 200 if the application and all dependencies (Redis, LRS) are ready. Includes per-instance LRS health status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application and dependencies are ready',
    type: HealthResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Application or dependencies are not ready',
  })
  async checkReadiness(): Promise<HealthCheckResult> {
    // Readiness checks all critical dependencies
    const result = await this.health.check([
      // Check Redis connectivity
      () => this.redisHealth.isHealthy('redis'),
      // Check LRS connectivity (aggregate)
      () => this.lrsHealth.isHealthy('lrs'),
    ]);

    // REQ-FN-025: Enhance with per-instance LRS breakdown
    const enhancedResult = this.enhanceWithLrsDetails(result);

    // Enhance with version and timestamp
    return this.enhanceResponse(enhancedResult);
  }

  /**
   * Enhance health check response with version and timestamp
   * @param result - Health check result from Terminus
   * @returns Enhanced result with version and timestamp
   */
  private enhanceResponse(
    result: HealthCheckResult,
  ): HealthCheckResult & { version: string; timestamp: string } {
    return {
      ...result,
      version: this.version,
      timestamp: new Date().toISOString(),
    } as HealthCheckResult & { version: string; timestamp: string };
  }

  /**
   * Enhance health check result with per-instance LRS details
   * Implements REQ-FN-025: Per-instance LRS status breakdown
   * Creates a new result object to avoid mutation side effects
   * @param result - Health check result from Terminus
   * @returns New enhanced result with LRS instance details
   */
  private enhanceWithLrsDetails(result: HealthCheckResult): HealthCheckResult {
    const instancesHealth = this.lrsHealthScheduler.getAllInstancesHealth();
    const overallStatus = this.lrsHealthScheduler.getOverallStatus();

    // Build instances object
    const instances: Record<string, unknown> = {};
    for (const [instanceId, health] of instancesHealth) {
      instances[instanceId] = {
        status: health.status,
        latency: health.latency,
        lastCheck: health.lastCheck.toISOString(),
        ...(health.error && { error: health.error }),
        ...(health.version && { version: health.version }),
      };
    }

    // Create a shallow copy of the result to avoid deep mutation
    const enhancedResult: HealthCheckResult = {
      status: result.status,
      info: { ...result.info },
      error: { ...result.error },
      details: { ...result.details },
    };

    // Enhance the LRS component in the result copy
    const lrsComponent =
      result.details?.lrs || result.info?.lrs || result.error?.lrs;

    if (lrsComponent) {
      const enhancedLrs = {
        ...lrsComponent,
        overallStatus, // Use different key to avoid type conflict
        instances,
      };

      // Update the result copy with enhanced LRS details
      if (result.details?.lrs) {
        enhancedResult.details = {
          ...enhancedResult.details,
          lrs: enhancedLrs,
        };
      }
      if (result.info?.lrs) {
        enhancedResult.info = {
          ...enhancedResult.info,
          lrs: enhancedLrs,
        };
      }
      if (result.error?.lrs) {
        enhancedResult.error = {
          ...enhancedResult.error,
          lrs: enhancedLrs,
        };
      }
    }

    return enhancedResult;
  }
}
