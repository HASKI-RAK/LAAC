// Implements REQ-FN-023: Scope-based Authorization Guard
// Enforces scope requirements on protected endpoints

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../decorators/require-scopes.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { LoggerService } from '../../core/logger';

/**
 * Scopes Authorization Guard
 * Enforces scope-based access control on protected endpoints
 * Implements REQ-FN-023: Scope-based authorization
 *
 * User must have at least one of the required scopes
 * Returns 403 with explanatory message on authorization failure
 */
@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Determines if user has required scopes for the endpoint
   * @param context - Execution context
   * @returns true if user has required scopes, false otherwise
   * @throws ForbiddenException if user lacks required scopes
   */
  canActivate(context: ExecutionContext): boolean {
    // Check if route is public (no authorization needed)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get required scopes for this endpoint
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no scopes required, allow access
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest<{
      url: string;
      method: string;
      user?: { userId: string; username?: string; scopes: string[] };
    }>();
    const user = request.user;

    // If no user, authentication failed (should not happen if JwtAuthGuard runs first)
    if (!user || !user.scopes) {
      this.logger.warn('Authorization check failed: no user or scopes', {
        path: request.url,
        method: request.method,
      });

      throw new ForbiddenException({
        statusCode: 403,
        message: 'Insufficient permissions',
        error: 'Forbidden',
      });
    }

    // Check if user has at least one of the required scopes
    const hasRequiredScope = requiredScopes.some((scope) =>
      user.scopes.includes(scope),
    );

    if (!hasRequiredScope) {
      this.logger.warn('Authorization failed: insufficient scopes', {
        path: request.url,
        method: request.method,
        requiredScopes,
        userScopes: user.scopes,
        userId: user.userId,
      });

      throw new ForbiddenException({
        statusCode: 403,
        message: `Access denied. Required scopes: ${requiredScopes.join(' or ')}`,
        error: 'Forbidden',
      });
    }

    return true;
  }
}
