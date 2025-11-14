// Implements REQ-NF-002: Health/Readiness Endpoints
// Implements REQ-FN-025: LRS Instance Health Monitoring
// Health module provides liveness and readiness probes with per-instance monitoring

import { Module, forwardRef } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { LrsHealthIndicator } from './indicators/lrs.health';
import { LRSHealthSchedulerService } from './services/lrs-health-scheduler.service';
import { AdminModule } from '../../admin/admin.module';
import { DataAccessModule } from '../../data-access/data-access.module';
import { LoggerService } from '../logger/logger.service';

/**
 * Health module
 * Implements REQ-NF-002: Standalone Deployability
 * Implements REQ-FN-025: LRS Instance Health Monitoring
 *
 * Provides health check endpoints for container orchestration:
 * - /health/liveness: Application is running (independent of LRS)
 * - /health/readiness: Application and dependencies ready (with per-instance LRS status)
 *
 * Features:
 * - Periodic background health checks via scheduler (every 30s)
 * - Per-instance LRS health tracking
 * - Prometheus metrics export
 */
@Module({
  imports: [
    // Terminus provides the health check framework
    TerminusModule,
    // HttpModule for LRS HTTP health checks
    HttpModule,
    // ScheduleModule for periodic health checks
    ScheduleModule.forRoot(),
    // AdminModule for MetricsRegistryService
    forwardRef(() => AdminModule),
    // DataAccessModule for LRSClient
    forwardRef(() => DataAccessModule),
  ],
  controllers: [HealthController],
  providers: [
    LoggerService,
    RedisHealthIndicator,
    LrsHealthIndicator,
    LRSHealthSchedulerService,
  ],
  exports: [
    RedisHealthIndicator,
    LrsHealthIndicator,
    LRSHealthSchedulerService,
  ],
})
export class HealthModule {}
