import { Module } from '@nestjs/common';
import { METRIC_PROVIDER_CLASSES } from './providers';

/**
 * Computation Module
 * Implements REQ-FN-003: Example Metric Providers
 * Implements REQ-FN-010: Metric Computation Framework
 *
 * @remarks
 * - Registers all metric providers for dependency injection
 * - Providers implement IMetricComputation interface
 * - Enables catalog discovery and metric execution
 * - Supports stateless computation per REQ-FN-004
 */
@Module({
  imports: [],
  controllers: [],
  providers: [...METRIC_PROVIDER_CLASSES],
  exports: [...METRIC_PROVIDER_CLASSES],
})
export class ComputationModule {}
