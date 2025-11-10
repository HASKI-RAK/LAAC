// REQ-FN-024: Cache invalidation DTO validation tests
// Unit tests for CacheInvalidateDto validation rules

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CacheInvalidateDto } from './cache-invalidate.dto';

describe('REQ-FN-024: CacheInvalidateDto Validation', () => {
  describe('Valid inputs', () => {
    it('should validate with specific key', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        key: 'cache:course-completion:course:123:v1',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.key).toBe('cache:course-completion:course:123:v1');
    });

    it('should validate with pattern', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        pattern: 'cache:course-completion:*',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.pattern).toBe('cache:course-completion:*');
    });

    it('should validate with all=true', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        all: true,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.all).toBe(true);
    });

    it('should validate with all=false (default)', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.all).toBeUndefined(); // No default value anymore
    });

    it('should validate pattern with wildcard', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        pattern: 'cache:*:course:123:*',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate pattern with question mark', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        pattern: 'cache:metric?:course:123',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate pattern with character class', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        pattern: 'cache:metric[123]:course:*',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate pattern with dash', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        pattern: 'cache:course-completion:*',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Invalid inputs', () => {
    it('should reject non-string key', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        key: 123,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('key');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should reject non-string pattern', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        pattern: 123,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('pattern');
    });

    it('should reject pattern with invalid characters (space)', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        pattern: 'cache:course completion:*',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('pattern');
      expect(errors[0].constraints).toHaveProperty('matches');
    });

    it('should reject pattern with invalid characters (special chars)', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        pattern: 'cache:course@completion:*',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('pattern');
    });

    it('should reject pattern with slash', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        pattern: 'cache/course/completion',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('pattern');
    });

    it('should reject pattern with dot', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        pattern: 'cache.course.completion',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('pattern');
    });
  });

  describe('Edge cases', () => {
    it('should accept empty object (all fields are optional, controller enforces at least one)', async () => {
      // Note: The mutual exclusivity validator only runs when fields are provided
      // Controller logic should enforce that at least one field is required for the operation
      const dto = plainToInstance(CacheInvalidateDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject when both key and pattern are provided', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        key: 'cache:specific:key',
        pattern: 'cache:*',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('validateMutualExclusivity');
    });

    it('should reject when both key and all are provided', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        key: 'cache:specific:key',
        all: true,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('validateMutualExclusivity');
    });

    it('should reject when both pattern and all are provided', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        pattern: 'cache:*',
        all: true,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('validateMutualExclusivity');
    });

    it('should reject when all three fields are provided', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        key: 'cache:specific:key',
        pattern: 'cache:*',
        all: true,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('validateMutualExclusivity');
    });

    it('should validate simple alphanumeric key', async () => {
      const dto = plainToInstance(CacheInvalidateDto, {
        key: 'simplekey123',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
