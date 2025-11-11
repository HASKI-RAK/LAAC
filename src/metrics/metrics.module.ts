// Implements REQ-FN-003: Metrics Module
// Provides metrics catalog and computation functionality

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { LoggerService } from '../core/logger';
import { MetricsController } from './controllers/metrics.controller';
import { MetricsService } from './services/metrics.service';

@Module({
  imports: [AuthModule], // Import AuthModule for guards and decorators
  controllers: [MetricsController],
  providers: [MetricsService, LoggerService],
  exports: [MetricsService],
})
export class MetricsModule {}
