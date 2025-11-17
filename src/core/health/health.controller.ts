// Implements REQ-NF-002: Health/Readiness Endpoints
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
import { HealthResponseDto } from './dto/health-response.dto';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../auth/decorators';

/**
 * Health check controller
 * Implements REQ-NF-002: Standalone Deployability - Health/Readiness endpoints
 *
 * Endpoints:
 * - GET /health/liveness: Returns 200 if app is running (independent of LRS)
 * - GET /health/readiness: Returns 200 if app + Redis are reachable
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
   */
  @Get('readiness')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Returns 200 if the application and Redis dependency are ready.',
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
