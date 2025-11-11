// Implements REQ-FN-014: Secrets and Configuration Management
// Implements REQ-FN-020: Structured Logging with Correlation IDs
// Implements REQ-NF-002: Health/Readiness Endpoints
// Implements REQ-FN-021: Prometheus metrics export
// CoreModule provides global configuration access and logging infrastructure

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { configFactory, configValidationSchema } from './config';
import { LoggerService } from './logger';
import { CorrelationIdMiddleware } from './middleware';
import { HealthModule } from './health';
import { MetricsPrometheusController } from '../admin/controllers/metrics-prometheus.controller';
import { CustomPrometheusController } from './prometheus/custom-prometheus.controller';

@Module({
  imports: [
    // REQ-FN-014: Configure environment variable management
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally without imports
      cache: true, // Cache environment variables for performance
      load: [configFactory], // Load typed configuration factory
      validationSchema: configValidationSchema, // Validate at startup with Joi
      validationOptions: {
        allowUnknown: true, // Allow unknown variables for flexibility
        abortEarly: false, // Show all validation errors at once
      },
      expandVariables: true, // Support variable expansion in .env files
    }),
    // REQ-NF-002: Health check endpoints
    HealthModule,
    // REQ-FN-021: Prometheus metrics export
    // Use custom controller to avoid path conflict with analytics catalog
    PrometheusModule.register({
      controller: CustomPrometheusController, // Custom controller at /prometheus instead of /metrics
      defaultMetrics: {
        enabled: true, // Enable default Node.js metrics
      },
      controller: MetricsPrometheusController, // Custom controller with @Public() decorator
    }),
  ],
  controllers: [], // CustomPrometheusController registered via PrometheusModule
  providers: [
    // REQ-FN-020: Global structured logger
    LoggerService,
  ],
  exports: [ConfigModule, LoggerService, HealthModule],
})
export class CoreModule implements NestModule {
  /**
   * Configure global middleware for correlation ID handling
   * @param consumer - Middleware consumer
   */
  configure(consumer: MiddlewareConsumer): void {
    // REQ-FN-020: Apply correlation ID middleware to all routes
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
