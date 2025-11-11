// REQ-FN-024: Cache invalidation DTO with validation
// REQ-FN-007: Admin cache invalidation request DTO

import {
  IsString,
  IsBoolean,
  Matches,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Custom class-level validator to ensure mutual exclusivity between cache invalidation options
 * Only one of: key, pattern, or all can be specified at a time
 * This is applied at the class level to avoid duplicate error messages
 */
@ValidatorConstraint({ name: 'CacheInvalidateMutualExclusivity', async: false })
export class CacheInvalidateMutualExclusivityConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments) {
    const dto = args.object as CacheInvalidateDto;
    const providedFields = [
      dto.key !== undefined && dto.key !== null,
      dto.pattern !== undefined && dto.pattern !== null,
      dto.all !== undefined && dto.all !== null,
    ].filter(Boolean).length;

    // Allow 0 (empty request - controller will handle) or exactly 1 field
    return providedFields === 0 || providedFields === 1;
  }

  defaultMessage() {
    return 'Exactly one of key, pattern, or all must be specified';
  }
}

/**
 * Cache invalidation request DTO
 * Used for POST /admin/cache/invalidate endpoint
 * Implements REQ-FN-007 (Cache Management)
 *
 * Validation rules:
 * - When provided, exactly one of key, pattern, or all must be specified (mutually exclusive)
 * - key: specific cache key to invalidate
 * - pattern: Redis glob pattern for bulk invalidation
 * - all: invalidate all cache entries (use with caution)
 *
 * Note: All fields are technically optional at the DTO validation level.
 * Controller logic should enforce that at least one field is provided for the operation.
 */
export class CacheInvalidateDto {
  // Hidden property for class-level validation
  // This ensures mutual exclusivity is checked once per DTO instance
  @Validate(CacheInvalidateMutualExclusivityConstraint, {
    message: 'Exactly one of key, pattern, or all must be specified',
  })
  private readonly _mutualExclusivityCheck: undefined;
  @ApiProperty({
    required: false,
    description:
      'Specific cache key to invalidate. Mutually exclusive with pattern and all.',
    example: 'cache:course-completion:course:123:v1',
  })
  @ValidateIf((o: CacheInvalidateDto) => o.key !== undefined)
  @IsString()
  key?: string;

  @ApiProperty({
    required: false,
    description:
      'Cache key pattern for bulk invalidation (supports Redis glob patterns: *, ?, []). Mutually exclusive with key and all.',
    example: 'cache:course-completion:*',
  })
  @ValidateIf((o: CacheInvalidateDto) => o.pattern !== undefined)
  @IsString()
  @Matches(/^[a-zA-Z0-9:*?[\]-]+$/, {
    message:
      'Pattern may contain only alphanumeric characters, colons, hyphens, and Redis glob characters (*, ?, []).',
  })
  pattern?: string;

  @ApiProperty({
    required: false,
    description:
      'If true, invalidates all cache entries. Use with caution in production. Mutually exclusive with key and pattern.',
    example: false,
    default: false,
  })
  @ValidateIf((o: CacheInvalidateDto) => o.all !== undefined)
  @Type(() => Boolean)
  @IsBoolean()
  all?: boolean;
}
