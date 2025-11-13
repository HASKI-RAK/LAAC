// Implements REQ-FN-003: Metrics Module
// Implements REQ-FN-005: Metrics Computation Module
// Implements REQ-FN-017: Instance Metadata Module
// Implements REQ-NF-003: Graceful Degradation
// Provides metrics catalog and computation functionality

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { DataAccessModule } from '../data-access';
import { ComputationModule } from '../computation';
import { AdminModule } from '../admin';
import { LoggerService } from '../core/logger';
import { FallbackHandler } from '../core/resilience';
import { MetricsController } from './controllers/metrics.controller';
import { InstancesController } from './controllers/instances.controller';
import { MetricsService } from './services/metrics.service';
import { ComputationService } from './services/computation.service';
import { InstancesService } from './services/instances.service';

@Module({
  imports: [
    AuthModule, // Import AuthModule for guards and decorators
    DataAccessModule, // Import DataAccessModule for cache and LRS client
    ComputationModule, // Import ComputationModule for metric providers
    AdminModule, // Import AdminModule for metrics registry
  ],
  controllers: [MetricsController, InstancesController],
  providers: [
    MetricsService,
    ComputationService,
    InstancesService,
    LoggerService,
    FallbackHandler, // REQ-NF-003: Graceful degradation handler
  ],
  exports: [MetricsService, ComputationService, InstancesService],
})
export class MetricsModule {}
