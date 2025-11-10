// REQ-FN-024: Cache invalidation DTO with validation
// REQ-FN-007: Admin cache invalidation request DTO

import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Cache invalidation request DTO
 * Used for POST /admin/cache/invalidate endpoint
 * Implements REQ-FN-007 (Cache Management)
 */
export class CacheInvalidateDto {
  @ApiProperty({
    required: false,
    description:
      'Specific cache key to invalidate. If not provided, pattern is required.',
    example: 'cache:course-completion:course:123:v1',
  })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiProperty({
    required: false,
    description:
      'Cache key pattern for bulk invalidation (supports Redis glob patterns: *, ?, [])',
    example: 'cache:course-completion:*',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9:*?[\]-]+$/, {
    message:
      'Pattern may contain only alphanumeric characters, colons, hyphens, and Redis glob characters (*, ?, []).',
  })
  pattern?: string;

  @ApiProperty({
    required: false,
    description:
      'If true, invalidates all cache entries. Use with caution in production.',
    example: false,
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  all?: boolean;
}
