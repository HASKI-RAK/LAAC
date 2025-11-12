// REQ-FN-024: Cache invalidation DTO with validation
// REQ-FN-007: Admin cache invalidation request DTO

import {
  IsString,
  IsBoolean,
  Matches,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Custom validation decorator to ensure mutual exclusivity between cache invalidation options
 * Only one of: key, pattern, or all can be specified at a time
 */
function ValidateMutualExclusivity(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'validateMutualExclusivity',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const dto = args.object as CacheInvalidateDto;
          const providedFields = [
            dto.key !== undefined && dto.key !== null,
            dto.pattern !== undefined && dto.pattern !== null,
            dto.all !== undefined && dto.all !== null,
          ].filter(Boolean).length;

          // Allow 0 (empty request - controller will handle) or exactly 1 field
          return providedFields === 0 || providedFields === 1;
        },
        defaultMessage() {
          return 'Exactly one of key, pattern, or all must be specified';
        },
      },
    });
  };
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
  /**
   * Specific cache key to invalidate (mutually exclusive with pattern and all)
   * @example "cache:course-completion:course:123:v1"
   */
  @ApiProperty({
    required: false,
    description:
      'Specific cache key to invalidate. Mutually exclusive with pattern and all.',
    example: 'cache:course-completion:course:123:v1',
  })
  @ValidateIf((o: CacheInvalidateDto) => o.key !== undefined)
  @IsString()
  @ValidateMutualExclusivity({
    message: 'Exactly one of key, pattern, or all must be specified',
  })
  key?: string;

  /**
   * Cache key pattern for bulk invalidation using Redis glob patterns
   * Supports wildcards: * (any characters), ? (single character), [] (character set)
   * @example "cache:course-completion:*"
   */
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
  @ValidateMutualExclusivity({
    message: 'Exactly one of key, pattern, or all must be specified',
  })
  pattern?: string;

  /**
   * If true, invalidates all cache entries (use with caution in production)
   * @example false
   */
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
  @ValidateMutualExclusivity({
    message: 'Exactly one of key, pattern, or all must be specified',
  })
  all?: boolean;
}
