import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './core';
import { AuthModule } from './auth';
import { AdminModule } from './admin';
import { MetricsModule } from './metrics';
import { CustomThrottlerGuard } from './core/guards';
import { Configuration } from './core/config';

@Module({
  imports: [
    CoreModule,
    AuthModule,
    MetricsModule,
    AdminModule, // REQ-FN-021: AdminModule for metrics export
    // REQ-FN-024: Rate limiting configuration with Redis backend
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Configuration>) => {
        const redisConfig = configService.get('redis', { infer: true });
        const rateLimitConfig = configService.get('rateLimit', { infer: true });

        if (!redisConfig || !rateLimitConfig) {
          throw new Error('Redis or rate limit configuration is missing');
        }

        // Create Redis client for throttler storage
        const redis = new Redis({
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          // Throttler-specific settings
          maxRetriesPerRequest: 1,
          enableReadyCheck: true,
        });

        return {
          throttlers: [
            {
              name: 'default',
              ttl: rateLimitConfig.ttl * 1000, // Convert to milliseconds
              limit: rateLimitConfig.limit,
            },
          ],
          storage: new ThrottlerStorageRedisService(redis),
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // REQ-FN-024: Apply throttler guard globally
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    // REQ-FN-021: Prometheus counter for rate limit rejections
    makeCounterProvider({
      name: 'rate_limit_rejections_total',
      help: 'Total number of requests rejected due to rate limiting',
      labelNames: ['endpoint', 'status'],
    }),
  ],
})
export class AppModule {}
