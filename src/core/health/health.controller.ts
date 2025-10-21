// Implements REQ-NF-002: Health/Readiness Endpoints
// Provides liveness and readiness probes for Kubernetes/Docker health checks

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './indicators/redis.health';
import { LrsHealthIndicator } from './indicators/lrs.health';
import { HealthResponseDto } from './dto/health-response.dto';
import { ConfigService } from '@nestjs/config';

/**
 * Health check controller
 * Implements REQ-NF-002: Standalone Deployability - Health/Readiness endpoints
 *
 * Endpoints:
 * - GET /health/liveness: Returns 200 if app is running
 * - GET /health/readiness: Returns 200 if app + Redis + LRS are reachable
 *
 * Note: These endpoints are public (bypass authentication per REQ-FN-023)
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly version: string;

  constructor(
    private readonly health: HealthCheckService,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly lrsHealth: LrsHealthIndicator,
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
   */
  @Get('liveness')
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Returns 200 if the application is running. Used for container health checks.',
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
   */
  @Get('readiness')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Returns 200 if the application and all dependencies (Redis, LRS) are ready. Used for load balancer routing.',
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
      // Check LRS connectivity
      () => this.lrsHealth.isHealthy('lrs'),
    ]);

    // Enhance with version and timestamp
    return this.enhanceResponse(result);
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
}
