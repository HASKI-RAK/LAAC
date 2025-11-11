import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ConfigService } from '@nestjs/config';
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core';
import { AuthModule } from './auth';
import { AdminModule } from './admin';
import { MetricsModule } from './metrics';
import { CustomThrottlerGuard } from './core/guards';
import { ThrottlerRedisService } from './core/services';
import { Configuration } from './core/config';

@Module({
  imports: [
    CoreModule,
    AuthModule,
    MetricsModule,
    AdminModule, // REQ-FN-021: AdminModule for metrics export
    // REQ-FN-024: Rate limiting configuration with Redis backend
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, ThrottlerRedisService],
      useFactory: (
        configService: ConfigService<Configuration>,
        throttlerRedisService: ThrottlerRedisService,
      ) => {
        const rateLimitConfig = configService.get('rateLimit', { infer: true });

        if (!rateLimitConfig) {
          throw new Error('Rate limit configuration is missing');
        }

        // Get Redis client (will be null for test environment)
        const redis = throttlerRedisService.getClient();

        // Use Redis storage if client is available, otherwise in-memory
        let storage: ThrottlerStorageRedisService | undefined;
        if (redis) {
          storage = new ThrottlerStorageRedisService(redis);
        }

        return {
          throttlers: [
            {
              name: 'default',
              ttl: rateLimitConfig.ttl * 1000, // Convert to milliseconds
              limit: rateLimitConfig.limit,
            },
          ],
          storage, // undefined will use in-memory storage
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // REQ-FN-024: Redis client lifecycle service
    ThrottlerRedisService,
    // REQ-FN-024: Apply throttler guard globally
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    // REQ-FN-021: Prometheus counter for rate limit rejections
    makeCounterProvider({
      name: 'rate_limit_rejections_total',
      help: 'Total number of requests rejected due to rate limiting',
      labelNames: ['path'],
    }),
  ],
})
export class AppModule {}
