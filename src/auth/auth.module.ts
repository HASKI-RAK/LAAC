// Implements REQ-FN-023: Authentication and Authorization Module
// Provides JWT authentication and scope-based authorization
// Implements REQ-FN-021: Prometheus metrics for auth events

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import {
  PrometheusModule,
  makeCounterProvider,
} from '@willsoto/nestjs-prometheus';
import { Configuration } from '../core/config';
import { LoggerService } from '../core/logger';
import { JwtStrategy } from './strategies';
import { JwtAuthGuard, ScopesGuard } from './guards';
import { AuthMetricsService } from './metrics';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Configuration>) => ({
        secret: configService.get('jwt.secret', { infer: true }),
        signOptions: {
          expiresIn: configService.get('jwt.expirationTime', { infer: true }),
        },
      }),
    }),
    // REQ-FN-021: Register Prometheus metrics module
    PrometheusModule.register({
      defaultMetrics: {
        enabled: false, // Don't enable default metrics here (enabled globally in CoreModule)
      },
    }),
  ],
  controllers: [],
  providers: [
    JwtStrategy,
    LoggerService,
    AuthMetricsService,
    // REQ-FN-021: Register authentication metrics counters
    makeCounterProvider({
      name: 'auth_failures_total',
      help: 'Total number of authentication failures',
      labelNames: ['reason', 'path'],
    }),
    makeCounterProvider({
      name: 'rate_limit_rejections_total',
      help: 'Total number of rate limit rejections',
      labelNames: ['path'],
    }),
    // Register guards globally
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ScopesGuard,
    },
  ],
  exports: [JwtModule, PassportModule, AuthMetricsService],
})
export class AuthModule {}
