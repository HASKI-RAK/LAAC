import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheService } from './services/cache.service';
import { LRSClient } from './clients/lrs.client';
import { CoreModule } from '../core/core.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    CoreModule,
    forwardRef(() => AdminModule),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [],
  providers: [CacheService, LRSClient],
  exports: [CacheService, LRSClient],
})
export class DataAccessModule {}
