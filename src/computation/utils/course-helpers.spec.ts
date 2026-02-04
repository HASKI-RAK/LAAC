// Unit tests for course-helpers.ts (REQ-FN-032)
// Validates course ID extraction logic for course-level CSV v3 metrics

import { xAPIStatement } from '../../data-access';
import {
  extractCourseIds,
  matchesCourse,
  extractCourseIdFromUrl,
  parseCourseId,
} from './course-helpers';

describe('course-helpers (REQ-FN-032)', () => {
  describe('extractCourseIds', () => {
    it('should extract course URL from parent context activity with course type', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {
          contextActivities: {
            parent: [
              {
                id: 'https://moodle.example.com/course/view.php?id=10',
                definition: {
                  type: 'http://id.tincanapi.com/activitytype/lms/course',
                },
              },
            ],
          },
        },
      };

      const courseIds = extractCourseIds(statement);

      expect(courseIds).toEqual([
        'https://moodle.example.com/course/view.php?id=10',
      ]);
    });

    it('should extract course URL using URL pattern when activity type is missing', () => {
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

      expect(courseIds).toEqual(['http://example.com/course/math-101']);
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

      expect(courseIds).toEqual(['http://example.com/courses/science-201']);
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
      expect(courseIds).toContain('http://example.com/course/math-101');
      expect(courseIds).toContain('http://example.com/courses/science-201');
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

      expect(courseIds).toEqual(['http://example.com/course/math-101']);
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
      expect(courseIds).toContain('http://example.com/course/math-101');
      expect(courseIds).toContain('http://example.com/course/science-201');
    });

    it('should not include non-course activities like modules', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {
          contextActivities: {
            parent: [
              {
                id: 'https://moodle.example.com/course/view.php?id=10',
                definition: {
                  type: 'http://id.tincanapi.com/activitytype/lms/course',
                },
              },
              {
                id: 'https://moodle.example.com/mod/h5pactivity/view.php?id=123',
                definition: {
                  type: 'http://id.tincanapi.com/activitytype/lms/module',
                },
              },
            ],
          },
        },
      };

      const courseIds = extractCourseIds(statement);

      expect(courseIds).toEqual([
        'https://moodle.example.com/course/view.php?id=10',
      ]);
    });

    it('should not include topic activities', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {
          contextActivities: {
            parent: [
              { id: 'https://ke.haski.app/course/2/topic/18' }, // Topic URL, not course
            ],
          },
        },
      };

      const courseIds = extractCourseIds(statement);

      expect(courseIds).toEqual([]); // Should not extract as course
    });
  });

  describe('matchesCourse', () => {
    it('should match identical course URLs', () => {
      expect(
        matchesCourse(
          'https://moodle.example.com/course/view.php?id=10',
          'https://moodle.example.com/course/view.php?id=10',
        ),
      ).toBe(true);
    });

    it('should match full URL against simplified course ID', () => {
      expect(
        matchesCourse('https://moodle.example.com/course/view.php?id=10', '10'),
      ).toBe(true);
    });

    it('should match simplified course ID against full URL', () => {
      expect(
        matchesCourse('10', 'https://moodle.example.com/course/view.php?id=10'),
      ).toBe(true);
    });

    it('should match path-based course URLs', () => {
      expect(
        matchesCourse('https://lms.example.com/course/course-1', 'course-1'),
      ).toBe(true);
    });

    it('should not match different course IDs', () => {
      expect(
        matchesCourse('https://moodle.example.com/course/view.php?id=10', '11'),
      ).toBe(false);
    });

    it('should return false for null/empty inputs', () => {
      expect(matchesCourse('', 'course-1')).toBe(false);
      expect(matchesCourse('course-1', '')).toBe(false);
    });
  });

  describe('extractCourseIdFromUrl', () => {
    it('should extract course ID from Moodle URL with id parameter', () => {
      expect(
        extractCourseIdFromUrl(
          'https://moodle.example.com/course/view.php?id=10',
        ),
      ).toBe('10');
    });

    it('should extract course ID from path-based URL', () => {
      expect(
        extractCourseIdFromUrl('https://lms.example.com/course/math-101'),
      ).toBe('math-101');
    });

    it('should extract course ID from /courses/ path', () => {
      expect(
        extractCourseIdFromUrl('https://lms.example.com/courses/science-201'),
      ).toBe('science-201');
    });

    it('should return null for URLs without course pattern', () => {
      expect(
        extractCourseIdFromUrl('https://lms.example.com/other/page'),
      ).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractCourseIdFromUrl('')).toBeNull();
    });

    it('should handle URL with multiple query parameters', () => {
      expect(
        extractCourseIdFromUrl(
          'https://moodle.example.com/course/view.php?id=10&other=value',
        ),
      ).toBe('10');
    });
  });

  describe('parseCourseId (deprecated)', () => {
    it('should return the ID as-is for backwards compatibility', () => {
      expect(parseCourseId('http://example.com/course/math-101')).toBe(
        'http://example.com/course/math-101',
      );
    });

    it('should return simple IDs as-is', () => {
      expect(parseCourseId('simple-course-id')).toBe('simple-course-id');
    });

    it('should return null for empty string', () => {
      expect(parseCourseId('')).toBeNull();
    });
  });
});
