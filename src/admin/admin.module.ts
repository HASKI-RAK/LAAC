// REQ-FN-007: Cache Invalidation Admin Endpoints
// AdminModule provides cache tooling and telemetry shims

import { Module, forwardRef } from '@nestjs/common';
import { MetricsRegistryService } from './services/metrics-registry.service';
import { CacheAdminService } from './services/cache.admin.service';
import { CacheController } from './controllers/cache.controller';
import { DataAccessModule } from '../data-access/data-access.module';
import { AuthModule } from '../auth/auth.module';
import { LoggerService } from '../core/logger/logger.service';

@Module({
  imports: [
    forwardRef(() => DataAccessModule), // Import CacheService for cache invalidation
    AuthModule, // Import auth guards for cache controller
  ],
  controllers: [
    CacheController, // REQ-FN-007: Cache invalidation admin endpoint
  ],
  providers: [
    LoggerService,
    MetricsRegistryService,
    CacheAdminService, // REQ-FN-007: Cache admin service
  ],
  exports: [MetricsRegistryService], // Export for use in other modules
})
export class AdminModule {}
