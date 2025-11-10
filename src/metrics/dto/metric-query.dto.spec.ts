// REQ-FN-024: Metric query DTO validation tests
// Unit tests for MetricQueryDto validation rules

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { MetricQueryDto, DashboardLevel } from './metric-query.dto';

describe('REQ-FN-024: MetricQueryDto Validation', () => {
  describe('Valid inputs', () => {
    it('should validate with no filters', async () => {
      const dto = plainToInstance(MetricQueryDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with courseId filter', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        courseId: 'course-123',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.courseId).toBe('course-123');
    });

    it('should validate with ISO 8601 dates', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        start: '2025-01-01T00:00:00.000Z',
        end: '2025-12-31T23:59:59.999Z',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.start).toBe('2025-01-01T00:00:00.000Z');
      expect(dto.end).toBe('2025-12-31T23:59:59.999Z');
    });

    it('should validate with dashboard level', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        level: DashboardLevel.COURSE,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.level).toBe(DashboardLevel.COURSE);
    });

    it('should validate with all filters', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        courseId: 'course-123',
        topicId: 'topic-456',
        elementId: 'element-789',
        userId: 'user-001',
        start: '2025-01-01T00:00:00.000Z',
        end: '2025-12-31T23:59:59.999Z',
        level: DashboardLevel.TOPIC,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate with date-only ISO 8601', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        start: '2025-01-01',
        end: '2025-12-31',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Invalid inputs', () => {
    it('should reject non-string courseId', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        courseId: 123,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('courseId');
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('should reject invalid ISO 8601 start date', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        start: 'not-a-date',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('start');
      expect(errors[0].constraints).toHaveProperty('isIso8601');
    });

    it('should reject invalid ISO 8601 end date', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        end: '2025/01/01',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('end');
      expect(errors[0].constraints).toHaveProperty('isIso8601');
    });

    it('should reject invalid dashboard level', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        level: 'invalid-level',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('level');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should reject non-string topicId', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        topicId: 456,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('topicId');
    });

    it('should reject non-string elementId', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        elementId: 789,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('elementId');
    });

    it('should reject non-string userId', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        userId: 1,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('userId');
    });

    it('should reject timestamp format for start date', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        start: '1704067200000', // Unix timestamp
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('start');
    });
  });

  describe('Dashboard level enum', () => {
    it('should accept "course" level', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        level: 'course',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept "topic" level', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        level: 'topic',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept "element" level', async () => {
      const dto = plainToInstance(MetricQueryDto, {
        level: 'element',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
