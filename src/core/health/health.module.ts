// Implements REQ-NF-002: Health/Readiness Endpoints
// Implements REQ-FN-025: LRS Instance Health Monitoring
// Health module provides liveness and readiness probes with per-instance monitoring

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';

/**
 * Health module
 * Implements REQ-NF-002: Standalone Deployability
 *
 * Provides health check endpoints for container orchestration:
 * - /health/liveness: Application is running (independent of LRS)
 * - /health/readiness: Application and dependencies ready
 */
@Module({
  imports: [
    // Terminus provides the health check framework
    TerminusModule,
  ],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
  exports: [RedisHealthIndicator],
})
export class HealthModule {}
