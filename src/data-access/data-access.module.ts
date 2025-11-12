import { Module, forwardRef } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { CoreModule } from '../core/core.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [CoreModule, forwardRef(() => AdminModule)],
  controllers: [],
  providers: [CacheService],
  exports: [CacheService],
})
export class DataAccessModule {}
