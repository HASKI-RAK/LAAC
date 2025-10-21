// Implements REQ-NF-002: Health/Readiness Endpoints
// Health module provides liveness and readiness probes

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { LrsHealthIndicator } from './indicators/lrs.health';

/**
 * Health module
 * Implements REQ-NF-002: Standalone Deployability
 *
 * Provides health check endpoints for container orchestration:
 * - /health/liveness: Application is running
 * - /health/readiness: Application and dependencies are ready
 */
@Module({
  imports: [
    // Terminus provides the health check framework
    TerminusModule,
    // HttpModule for LRS HTTP health checks
    HttpModule,
  ],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, LrsHealthIndicator],
  exports: [RedisHealthIndicator, LrsHealthIndicator],
})
export class HealthModule {}
