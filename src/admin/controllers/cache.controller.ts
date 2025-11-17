// Implements REQ-FN-007: Cache Invalidation Admin Endpoint
// Controller for administrative cache management operations

import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ScopesGuard } from '../../auth/guards/scopes.guard';
import { RequireScopes } from '../../auth/decorators/require-scopes.decorator';
import {
  CacheAdminService,
  CacheInvalidateResponse,
} from '../services/cache.admin.service';
import { CacheInvalidateDto } from '../dto/cache-invalidate.dto';

/**
 * Cache Admin Controller
 * Implements REQ-FN-007: Administrative cache invalidation endpoint
 *
 * @remarks
 * - All endpoints require admin:cache scope
 * - Protected by JWT authentication and scope-based authorization
 * - Validates request DTOs before processing
 * - Returns standardized response format
 */
@ApiTags('Admin - Cache Management')
@Controller('admin/cache')
@UseGuards(JwtAuthGuard, ScopesGuard)
@ApiBearerAuth()
export class CacheController {
  constructor(private readonly cacheAdminService: CacheAdminService) {}

  /**
   * Invalidate cache entries
   * Implements REQ-FN-007: POST /admin/cache/invalidate
   *
   * @param dto - Cache invalidation request (key, pattern, or all)
   * @param req - Express request with authenticated user
   * @returns Invalidation response with count and status
   */
  @Post('invalidate')
  @HttpCode(HttpStatus.OK)
  @RequireScopes('admin:cache')
  @ApiOperation({
    summary: 'Invalidate cache entries',
    description: `
Invalidate cached analytics results manually. Requires admin:cache scope.

**Operation Types:**
- Single key: Provide \`key\` parameter to invalidate a specific cache entry
- Pattern-based: Provide \`pattern\` parameter with Redis glob pattern (*, ?, [])
- All entries: Set \`all: true\` to invalidate all cache entries (use with caution)

**Note:** Exactly one of key, pattern, or all must be specified.

Implements REQ-FN-007: Cache Invalidation and Refresh
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Cache invalidation successful',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['success', 'error'],
          example: 'success',
        },
        invalidatedCount: {
          type: 'number',
          description: 'Number of cache entries invalidated',
          example: 5,
        },
        message: {
          type: 'string',
          example:
            'Successfully invalidated 5 cache entries matching pattern: cache:course-completion:*',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2025-11-12T15:30:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request - validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - missing admin:cache scope',
  })
  async invalidateCache(
    @Body() dto: CacheInvalidateDto,
    @Request() req: { user?: { sub?: string; username?: string } },
  ): Promise<CacheInvalidateResponse> {
    // Additional validation: ensure at least one operation is specified
    // DTO validation ensures mutual exclusivity, but we also need at least one field
    if (!dto.key && !dto.pattern && !dto.all) {
      throw new BadRequestException(
        'At least one of key, pattern, or all must be specified',
      );
    }

    // Extract admin user from JWT payload
    const adminUser = req.user?.sub ?? req.user?.username ?? 'unknown';

    // Delegate to service (DTO is already validated by NestJS pipes)
    return this.cacheAdminService.invalidateCache(dto, adminUser);
  }
}
