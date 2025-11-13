// Implements REQ-FN-003: Metrics Module
// Implements REQ-FN-005: Metrics Computation Module
// Provides metrics catalog and computation functionality

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { DataAccessModule } from '../data-access';
import { ComputationModule } from '../computation';
import { AdminModule } from '../admin';
import { LoggerService } from '../core/logger';
import { MetricsController } from './controllers/metrics.controller';
import { MetricsService } from './services/metrics.service';
import { ComputationService } from './services/computation.service';

@Module({
  imports: [
    AuthModule, // Import AuthModule for guards and decorators
    DataAccessModule, // Import DataAccessModule for cache and LRS client
    ComputationModule, // Import ComputationModule for metric providers
    AdminModule, // Import AdminModule for metrics registry
  ],
  controllers: [MetricsController],
  providers: [MetricsService, ComputationService, LoggerService],
  exports: [MetricsService, ComputationService],
})
export class MetricsModule {}
