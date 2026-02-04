// Unit tests for topic-helpers.ts (REQ-FN-032)
// Validates topic ID extraction logic for topic-level CSV v3 metrics

import { xAPIStatement } from '../../data-access';
import {
  extractTopicIds,
  matchesTopic,
  extractTopicIdFromUrl,
  extractCourseIdFromTopicUrl,
} from './topic-helpers';

describe('topic-helpers (REQ-FN-032)', () => {
  describe('extractTopicIds', () => {
    it('should extract topic URL from parent context activity with topic type', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {
          contextActivities: {
            parent: [
              {
                id: 'https://ke.haski.app/course/2/topic/18',
                definition: {
                  type: 'https://wiki.haski.app/functions/pages.Topic',
                },
              },
            ],
          },
        },
      };

      const topicIds = extractTopicIds(statement);

      expect(topicIds).toEqual(['https://ke.haski.app/course/2/topic/18']);
    });

    it('should extract topic URL using URL pattern when activity type is missing', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {
          contextActivities: {
            parent: [{ id: 'https://lms.example.com/topic/algebra' }],
          },
        },
      };

      const topicIds = extractTopicIds(statement);

      expect(topicIds).toEqual(['https://lms.example.com/topic/algebra']);
    });

    it('should extract topic IDs from both parent and grouping', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {
          contextActivities: {
            parent: [{ id: 'https://lms.example.com/topic/topic-1' }],
            grouping: [{ id: 'https://lms.example.com/topics/topic-2' }],
          },
        },
      };

      const topicIds = extractTopicIds(statement);

      expect(topicIds).toHaveLength(2);
      expect(topicIds).toContain('https://lms.example.com/topic/topic-1');
      expect(topicIds).toContain('https://lms.example.com/topics/topic-2');
    });

    it('should deduplicate topic IDs', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        context: {
          contextActivities: {
            parent: [{ id: 'https://lms.example.com/topic/topic-1' }],
            grouping: [{ id: 'https://lms.example.com/topic/topic-1' }],
          },
        },
      };

      const topicIds = extractTopicIds(statement);

      expect(topicIds).toEqual(['https://lms.example.com/topic/topic-1']);
    });

    it('should return empty array when context is missing', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
      };

      const topicIds = extractTopicIds(statement);

      expect(topicIds).toEqual([]);
    });

    it('should return empty array when no topic activities present', () => {
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

      const topicIds = extractTopicIds(statement);

      expect(topicIds).toEqual([]);
    });
  });

  describe('matchesTopic', () => {
    it('should match identical topic URLs', () => {
      expect(
        matchesTopic(
          'https://ke.haski.app/course/2/topic/18',
          'https://ke.haski.app/course/2/topic/18',
        ),
      ).toBe(true);
    });

    it('should match full URL against simplified topic ID', () => {
      expect(matchesTopic('https://ke.haski.app/course/2/topic/18', '18')).toBe(
        true,
      );
    });

    it('should match simplified topic ID against full URL', () => {
      expect(matchesTopic('18', 'https://ke.haski.app/course/2/topic/18')).toBe(
        true,
      );
    });

    it('should not match different topic IDs', () => {
      expect(matchesTopic('https://ke.haski.app/course/2/topic/18', '19')).toBe(
        false,
      );
    });

    it('should return false for null/empty inputs', () => {
      expect(matchesTopic('', 'topic-1')).toBe(false);
      expect(matchesTopic('topic-1', '')).toBe(false);
    });
  });

  describe('extractTopicIdFromUrl', () => {
    it('should extract topic ID from HASKI Frontend URL', () => {
      expect(
        extractTopicIdFromUrl('https://ke.haski.app/course/2/topic/18'),
      ).toBe('18');
    });

    it('should extract topic ID from URL with hash fragment', () => {
      expect(
        extractTopicIdFromUrl(
          'https://ke.haski.app/course/2/topic/18#element-1',
        ),
      ).toBe('18');
    });

    it('should extract topic ID from simple topic URL', () => {
      expect(extractTopicIdFromUrl('https://lms.example.com/topic/42')).toBe(
        '42',
      );
    });

    it('should return null for URLs without topic pattern', () => {
      expect(
        extractTopicIdFromUrl('https://lms.example.com/course/10'),
      ).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractTopicIdFromUrl('')).toBeNull();
    });
  });

  describe('extractCourseIdFromTopicUrl', () => {
    it('should extract course ID from HASKI Frontend topic URL', () => {
      expect(
        extractCourseIdFromTopicUrl('https://ke.haski.app/course/2/topic/18'),
      ).toBe('2');
    });

    it('should extract course ID from URL with hash fragment', () => {
      expect(
        extractCourseIdFromTopicUrl(
          'https://ke.haski.app/course/14/topic/25#element',
        ),
      ).toBe('14');
    });

    it('should return null for topic URLs without course path', () => {
      expect(
        extractCourseIdFromTopicUrl('https://lms.example.com/topic/42'),
      ).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractCourseIdFromTopicUrl('')).toBeNull();
    });
  });
});
