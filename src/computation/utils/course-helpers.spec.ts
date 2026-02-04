// Unit tests for course-helpers.ts (REQ-FN-032)
// Validates course ID extraction logic for course-level CSV v3 metrics

import { xAPIStatement } from '../../data-access';
import { extractCourseIds, parseCourseId } from './course-helpers';

describe('course-helpers (REQ-FN-032)', () => {
  describe('extractCourseIds', () => {
    it('should extract course ID from parent context activity', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {
          contextActivities: {
            parent: [{ id: 'http://example.com/course/math-101' }],
          },
        },
      };

      const courseIds = extractCourseIds(statement);

      expect(courseIds).toEqual(['math-101']);
    });

    it('should extract course ID from grouping context activity', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {
          contextActivities: {
            grouping: [{ id: 'http://example.com/courses/science-201' }],
          },
        },
      };

      const courseIds = extractCourseIds(statement);

      expect(courseIds).toEqual(['science-201']);
    });

    it('should extract course IDs from both parent and grouping', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {
          contextActivities: {
            parent: [{ id: 'http://example.com/course/math-101' }],
            grouping: [{ id: 'http://example.com/courses/science-201' }],
          },
        },
      };

      const courseIds = extractCourseIds(statement);

      expect(courseIds).toHaveLength(2);
      expect(courseIds).toContain('math-101');
      expect(courseIds).toContain('science-201');
    });

    it('should deduplicate course IDs', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {
          contextActivities: {
            parent: [{ id: 'http://example.com/course/math-101' }],
            grouping: [{ id: 'http://example.com/course/math-101' }],
          },
        },
      };

      const courseIds = extractCourseIds(statement);

      expect(courseIds).toEqual(['math-101']);
    });

    it('should return empty array when context is missing', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
      };

      const courseIds = extractCourseIds(statement);

      expect(courseIds).toEqual([]);
    });

    it('should return empty array when contextActivities is missing', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {},
      };

      const courseIds = extractCourseIds(statement);

      expect(courseIds).toEqual([]);
    });

    it('should handle multiple course IDs in parent', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {
          contextActivities: {
            parent: [
              { id: 'http://example.com/course/math-101' },
              { id: 'http://example.com/course/science-201' },
            ],
          },
        },
      };

      const courseIds = extractCourseIds(statement);

      expect(courseIds).toHaveLength(2);
      expect(courseIds).toContain('math-101');
      expect(courseIds).toContain('science-201');
    });

    it('should skip invalid course IDs', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {
          contextActivities: {
            parent: [
              { id: 'http://example.com/course/math-101' },
              { id: '' }, // Invalid
            ],
          },
        },
      };

      const courseIds = extractCourseIds(statement);

      expect(courseIds).toEqual(['math-101']);
    });
  });

  describe('parseCourseId', () => {
    it('should parse course ID from /course/ pattern', () => {
      const id = 'http://example.com/course/math-101';

      expect(parseCourseId(id)).toBe('math-101');
    });

    it('should parse course ID from /courses/ pattern', () => {
      const id = 'http://example.com/courses/science-201';

      expect(parseCourseId(id)).toBe('science-201');
    });

    it('should return the full ID if no pattern matches', () => {
      const id = 'simple-course-id';

      expect(parseCourseId(id)).toBe('simple-course-id');
    });

    it('should return null for empty string', () => {
      expect(parseCourseId('')).toBeNull();
    });

    it('should handle course IDs with additional path segments', () => {
      const id = 'http://example.com/course/math-101/module/1';

      expect(parseCourseId(id)).toBe('math-101/module/1');
    });

    it('should handle /course/ with trailing slash', () => {
      const id = 'http://example.com/course/math-101/';

      expect(parseCourseId(id)).toBe('math-101/');
    });

    it('should handle /courses/ with trailing slash', () => {
      const id = 'http://example.com/courses/science-201/';

      expect(parseCourseId(id)).toBe('science-201/');
    });

    it('should prioritize first /course/ occurrence if multiple', () => {
      const id = 'http://example.com/course/math/course/101';

      expect(parseCourseId(id)).toBe('math');
    });

    it('should return null for course ID with no trailing part', () => {
      const id = 'http://example.com/course/';

      expect(parseCourseId(id)).toBeNull();
    });
  });
});
