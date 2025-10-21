// Implements REQ-FN-023: JWT Authentication Guard
// Enforces JWT authentication on all routes except those marked as public

import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Configuration } from '../../core/config';
import { LoggerService } from '../../core/logger';
import { AuthMetricsService } from '../metrics';

/**
 * JWT Authentication Guard
 * Enforces authentication on all routes except those marked with @Public()
 * Implements REQ-FN-023: JWT Bearer token validation
 * Implements REQ-FN-021: Track authentication failures in Prometheus
 *
 * Returns 401 with WWW-Authenticate header on authentication failure
 * Can be disabled via AUTH_ENABLED=false for dev/test environments
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService<Configuration>,
    private readonly logger: LoggerService,
    @Optional()
    @Inject(AuthMetricsService)
    private readonly metricsService?: AuthMetricsService,
  ) {
    super();
  }

  /**
   * Determines if authentication should be enforced for the current request
   * @param context - Execution context
   * @returns true if request can proceed, false otherwise
   */
  canActivate(context: ExecutionContext) {
    // Check if authentication is disabled (dev/test bypass)
    const authEnabled = this.configService.get('jwt.authEnabled', {
      infer: true,
    });
    if (!authEnabled) {
      return true;
    }

    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Enforce JWT authentication
    return super.canActivate(context);
  }

  /**
   * Handles authentication errors
   * Implements REQ-FN-023: Failed authentication returns 401 with appropriate headers
   * Implements REQ-FN-020: Log auth failures without leaking tokens
   * Implements REQ-FN-021: Increment auth failure metrics
   * @param err - Authentication error
   * @param user - User object (if validation succeeded)
   * @param info - Additional information about the error
   * @returns User object if authentication succeeded
   * @throws UnauthorizedException with WWW-Authenticate header
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(err: any, user: any, info: any, context: ExecutionContext): any {
    // Log authentication failure without sensitive data
    if (err || !user) {
      const request = context.switchToHttp().getRequest<{
        url: string;
        method: string;
      }>();
      const reason = info?.message ?? err?.message ?? 'Unknown';

      this.logger.warn('Authentication failed', {
        path: request.url,
        method: request.method,
        reason,
      });

      // REQ-FN-021: Increment auth failure counter
      if (this.metricsService) {
        this.metricsService.incrementAuthFailures(reason, request.url);
      }

      // Throw 401 with WWW-Authenticate header
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Authentication failed',
        error: 'Unauthorized',
      });
    }

    return user;
  }
}
