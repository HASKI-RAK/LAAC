// Implements REQ-FN-023: Public route decorator
// Marks routes that should bypass authentication

import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for public routes
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark routes as public (no authentication required)
 * Use on controller methods or controllers to bypass JWT authentication
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 *
 * Implements REQ-FN-023: Public routes include /health/*, /metrics, /api/docs
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
