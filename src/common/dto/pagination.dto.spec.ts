// REQ-FN-024: Pagination DTO validation tests
// Unit tests for PaginationDto validation rules

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

describe('REQ-FN-024: PaginationDto Validation', () => {
  describe('Valid inputs', () => {
    it('should validate with default values when no input provided', async () => {
      const dto = plainToInstance(PaginationDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
    });

    it('should validate with custom page and limit', async () => {
      const dto = plainToInstance(PaginationDto, {
        page: '5',
        limit: '20',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(5); // Transformed from string to number
      expect(dto.limit).toBe(20);
    });

    it('should validate with page=1 and limit=1', async () => {
      const dto = plainToInstance(PaginationDto, {
        page: '1',
        limit: '1',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with limit=100 (max)', async () => {
      const dto = plainToInstance(PaginationDto, {
        page: '1',
        limit: '100',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.limit).toBe(100);
    });
  });

  describe('Invalid inputs', () => {
    it('should reject page=0', async () => {
      const dto = plainToInstance(PaginationDto, {
        page: '0',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('page');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should reject negative page', async () => {
      const dto = plainToInstance(PaginationDto, {
        page: '-1',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('page');
    });

    it('should reject limit=0', async () => {
      const dto = plainToInstance(PaginationDto, {
        limit: '0',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should reject limit > 100', async () => {
      const dto = plainToInstance(PaginationDto, {
        limit: '101',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('max');
    });

    it('should reject non-integer page', async () => {
      const dto = plainToInstance(PaginationDto, {
        page: '1.5',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('page');
    });

    it('should reject non-integer limit', async () => {
      const dto = plainToInstance(PaginationDto, {
        limit: '10.5',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
    });

    it('should reject non-numeric page', async () => {
      const dto = plainToInstance(PaginationDto, {
        page: 'abc',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('page');
    });

    it('should reject non-numeric limit', async () => {
      const dto = plainToInstance(PaginationDto, {
        limit: 'xyz',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
    });
  });
});
