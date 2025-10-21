// Implements REQ-FN-023: Scope-based authorization decorator
// Defines required scopes for endpoint access

import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for required scopes
 */
export const SCOPES_KEY = 'scopes';

/**
 * Decorator to specify required scopes for route access
 * User must have at least one of the specified scopes
 *
 * @param scopes - Array of required scopes
 *
 * @example
 * ```typescript
 * @RequireScopes('analytics:read')
 * @Get('metrics')
 * getMetrics() {
 *   return this.metricsService.getCatalog();
 * }
 *
 * @RequireScopes('admin:cache', 'admin:config')
 * @Post('admin/cache/invalidate')
 * invalidateCache() {
 *   return this.adminService.invalidateCache();
 * }
 * ```
 *
 * Implements REQ-FN-023: Scope-based authorization
 * - analytics:read - for metrics catalog/results
 * - admin:cache - for cache invalidation
 * - admin:config - for instance configuration
 */
export const RequireScopes = (...scopes: string[]) =>
  SetMetadata(SCOPES_KEY, scopes);
