// Implements REQ-FN-024: Rate Limiting Guard
// Custom throttler guard with structured logging

import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerLimitDetail } from '@nestjs/throttler/dist/throttler.guard.interface';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { LoggerService } from '../logger';

/**
 * Custom Throttler Guard
 * Extends NestJS ThrottlerGuard to add:
 * - Structured logging with correlation IDs
 * - Enhanced error messages
 *
 * Implements REQ-FN-024: Rate Limiting
 * Implements REQ-FN-020: Structured Logging
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly logger: LoggerService,
  ) {
    super(options, storageService, reflector);
  }

  /**
   * Override canActivate to add logging and response headers
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    try {
      // Call parent implementation
      const result = await super.canActivate(context);

      // Add rate limit headers to successful responses
      // Note: These will be set by the throttler internally
      return result;
    } catch (error) {
      // Extract client information
      const clientIp = this.getClientIp(request);
      const endpoint = `${request.method} ${request.path}`;

      // Log rate limit event (REQ-FN-020)
      this.logger.warn('Rate limit exceeded', {
        endpoint,
        clientIp,
      });

      // Re-throw the exception
      throw error;
    }
  }

  /**
   * Override throwThrottlingException to customize response
   */
  protected throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse<Response>();
    const { ttl } = throttlerLimitDetail;

    // Set Retry-After header (seconds until reset)
    response.setHeader('Retry-After', Math.ceil(ttl / 1000));

    // Throw user-friendly exception
    return Promise.reject(
      new ThrottlerException('Too many requests. Please try again later.'),
    );
  }

  /**
   * Extract client IP from request
   * Handles X-Forwarded-For header for proxy scenarios
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return forwardedStr.split(',')[0].trim();
    }
    return request.ip || (request.socket?.remoteAddress ?? 'unknown');
  }
}
