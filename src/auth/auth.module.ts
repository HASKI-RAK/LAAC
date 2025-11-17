// Implements REQ-FN-023: Authentication and Authorization Module
// Provides JWT authentication and scope-based authorization
// Provides optional hooks for auth metrics (no-op without external telemetry)

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
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
  ],
  controllers: [],
  providers: [
    JwtStrategy,
    LoggerService,
    AuthMetricsService,
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
