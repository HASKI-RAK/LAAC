// Unit tests for Topic Time Spent Provider (REQ-FN-004, CSV TO-003)

import { TopicTimeSpentProvider } from './topic-time-spent.provider';
import { xAPIStatement } from '../../data-access';

describe('TopicTimeSpentProvider (REQ-FN-004, CSV TO-003)', () => {
  let provider: TopicTimeSpentProvider;

  beforeEach(() => {
    provider = new TopicTimeSpentProvider();
  });

  describe('metadata', () => {
    it('should have correct metric metadata', () => {
      expect(provider.id).toBe('topic-time-spent');
      expect(provider.dashboardLevel).toBe('topic');
      expect(provider.description).toBe(
        'Total time spent by a student in each topic in a given time period',
      );
      expect(provider.version).toBe('1.0.0');
      expect(provider.outputType).toBe('scalar');
      expect(provider.requiredParams).toEqual([
        'userId',
        'courseId',
        'topicId',
      ]);
      expect(provider.optionalParams).toEqual(['since', 'until']);
    });
  });

  describe('compute', () => {
    it('should aggregate durations from topic activities', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/experienced',
            display: { 'en-US': 'experienced' },
          },
          object: {
            id: 'element-1',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/lesson',
            },
          },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/101/topic/5',
                  objectType: 'Activity',
                },
              ],
            },
          },
          result: { duration: 'PT30M' }, // 30 minutes = 1800 seconds
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/experienced',
            display: { 'en-US': 'experienced' },
          },
          object: {
            id: 'element-2',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/lesson',
            },
          },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/101/topic/5',
                  objectType: 'Activity',
                },
              ],
            },
          },
          result: { duration: 'PT1H15M' }, // 1 hour 15 minutes = 4500 seconds
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toBe(6300); // 1800 + 4500
      expect(result.metricId).toBe('topic-time-spent');
      expect(result.metadata?.unit).toBe('seconds');
      expect(result.metadata?.activityCount).toBe(2);
      expect(result.metadata?.avgDuration).toBe(3150); // 6300 / 2
      expect(result.metadata?.userId).toBe('user-1');
      expect(result.metadata?.courseId).toBe('course-101');
      expect(result.metadata?.topicId).toBe('5');
      expect(result.computed).toBeDefined();
    });

    it('should parse ISO 8601 durations correctly', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/experienced',
            display: { 'en-US': 'experienced' },
          },
          object: { id: 'element-1' },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/101/topic/5',
                  objectType: 'Activity',
                },
              ],
            },
          },
          result: { duration: 'PT1H' }, // 1 hour = 3600 seconds
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/experienced',
            display: { 'en-US': 'experienced' },
          },
          object: { id: 'element-2' },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/101/topic/5',
                  objectType: 'Activity',
                },
              ],
            },
          },
          result: { duration: 'PT45S' }, // 45 seconds
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/experienced',
            display: { 'en-US': 'experienced' },
          },
          object: { id: 'element-3' },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/101/topic/5',
                  objectType: 'Activity',
                },
              ],
            },
          },
          result: { duration: 'PT2H30M45S' }, // 2h 30m 45s = 9045 seconds
          timestamp: '2025-11-03T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toBe(12690); // 3600 + 45 + 9045
      expect(result.metadata?.activityCount).toBe(3);
    });

    it('should exclude statements from other topics', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/experienced',
            display: { 'en-US': 'experienced' },
          },
          object: { id: 'element-1' },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/101/topic/5',
                  objectType: 'Activity',
                },
              ],
            },
          },
          result: { duration: 'PT30M' },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/experienced',
            display: { 'en-US': 'experienced' },
          },
          object: { id: 'element-2' },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/101/topic/99',
                  objectType: 'Activity',
                },
              ],
            },
          },
          result: { duration: 'PT1H' },
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toBe(1800); // Only from topic 5
      expect(result.metadata?.activityCount).toBe(1);
    });

    it('should return 0 when no duration data in topic', async () => {
      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        [],
      );

      expect(result.value).toBe(0);
      expect(result.metadata?.activityCount).toBe(0);
      expect(result.metadata?.avgDuration).toBe(0);
    });

    it('should skip statements without duration information', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/experienced',
            display: { 'en-US': 'experienced' },
          },
          object: { id: 'element-1' },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/101/topic/5',
                  objectType: 'Activity',
                },
              ],
            },
          },
          result: { duration: 'PT30M' },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
          },
          object: { id: 'element-2' },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/101/topic/5',
                  objectType: 'Activity',
                },
              ],
            },
          },
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toBe(1800); // Only counts element with duration
      expect(result.metadata?.activityCount).toBe(1);
    });

    it('should handle invalid duration strings gracefully', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/experienced',
            display: { 'en-US': 'experienced' },
          },
          object: { id: 'element-1' },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/101/topic/5',
                  objectType: 'Activity',
                },
              ],
            },
          },
          result: { duration: 'INVALID' },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/experienced',
            display: { 'en-US': 'experienced' },
          },
          object: { id: 'element-2' },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/101/topic/5',
                  objectType: 'Activity',
                },
              ],
            },
          },
          result: { duration: 'PT30M' },
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toBe(1800); // Only valid duration counted
      expect(result.metadata?.activityCount).toBe(1);
    });

    it('should include time range in metadata when provided', async () => {
      const result = await provider.compute(
        {
          userId: 'user-1',
          courseId: 'course-101',
          topicId: '5',
          since: '2025-01-01T00:00:00Z',
          until: '2025-12-31T23:59:59Z',
        },
        [],
      );

      expect(result.metadata?.timeRange).toEqual({
        since: '2025-01-01T00:00:00Z',
        until: '2025-12-31T23:59:59Z',
      });
    });
  });

  describe('validateParams', () => {
    it('should throw error if userId is missing', () => {
      expect(() =>
        provider.validateParams({ courseId: 'course-101', topicId: '5' }),
      ).toThrow('userId is required for topic-time-spent metric computation');
    });

    it('should throw error if courseId is missing', () => {
      expect(() =>
        provider.validateParams({ userId: 'user-1', topicId: '5' }),
      ).toThrow('courseId is required for topic-time-spent metric computation');
    });

    it('should throw error if topicId is missing', () => {
      expect(() =>
        provider.validateParams({ userId: 'user-1', courseId: 'course-101' }),
      ).toThrow('topicId is required for topic-time-spent metric computation');
    });

    it('should throw error if since is after until', () => {
      expect(() =>
        provider.validateParams({
          userId: 'user-1',
          courseId: 'course-101',
          topicId: '5',
          since: '2025-12-31T23:59:59Z',
          until: '2025-01-01T00:00:00Z',
        }),
      ).toThrow('since timestamp must be before until timestamp');
    });

    it('should not throw error for valid params', () => {
      expect(() =>
        provider.validateParams({
          userId: 'user-1',
          courseId: 'course-101',
          topicId: '5',
        }),
      ).not.toThrow();
    });
  });
});
