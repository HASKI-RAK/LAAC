// Unit tests for Topic Total Score Provider (REQ-FN-004, CSV TO-001)

import { TopicTotalScoreProvider } from './topic-total-score.provider';
import { xAPIStatement } from '../../data-access';

describe('TopicTotalScoreProvider (REQ-FN-004, CSV TO-001)', () => {
  let provider: TopicTotalScoreProvider;

  beforeEach(() => {
    provider = new TopicTotalScoreProvider();
  });

  describe('metadata', () => {
    it('should have correct metric metadata', () => {
      expect(provider.id).toBe('topic-total-score');
      expect(provider.dashboardLevel).toBe('topic');
      expect(provider.description).toBe(
        'Total score earned by a student on learning elements in each topic',
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
    it('should sum scores from topic learning elements', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/scored',
            display: { 'en-US': 'scored' },
          },
          object: {
            id: 'element-1',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/assessment',
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
          result: { score: { raw: 85, max: 100 } },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/scored',
            display: { 'en-US': 'scored' },
          },
          object: {
            id: 'element-2',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/assessment',
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
          result: { score: { raw: 92, max: 100 } },
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toBe(177); // 85 + 92
      expect(result.metricId).toBe('topic-total-score');
      expect(result.metadata?.unit).toBe('points');
      expect(result.metadata?.elementCount).toBe(2);
      expect(result.metadata?.avgScore).toBe(88.5); // 177 / 2
      expect(result.metadata?.userId).toBe('user-1');
      expect(result.metadata?.courseId).toBe('course-101');
      expect(result.metadata?.topicId).toBe('5');
      expect(result.computed).toBeDefined();
    });

    it('should exclude statements from other topics', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/scored',
            display: { 'en-US': 'scored' },
          },
          object: {
            id: 'element-1',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/assessment',
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
          result: { score: { raw: 85, max: 100 } },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/scored',
            display: { 'en-US': 'scored' },
          },
          object: {
            id: 'element-2',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
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
          result: { score: { raw: 92, max: 100 } },
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toBe(85); // Only from topic 5
      expect(result.metadata?.elementCount).toBe(1);
    });

    it('should return 0 when no scores in topic', async () => {
      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        [],
      );

      expect(result.value).toBe(0);
      expect(result.metadata?.elementCount).toBe(0);
      expect(result.metadata?.avgScore).toBe(0);
    });

    it('should skip statements without score information', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/scored',
            display: { 'en-US': 'scored' },
          },
          object: {
            id: 'element-1',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/assessment',
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
          result: { score: { raw: 85, max: 100 } },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/attempted',
            display: { 'en-US': 'attempted' },
          },
          object: {
            id: 'element-2',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/assessment',
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
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toBe(85); // Only counts element with score
      expect(result.metadata?.elementCount).toBe(1);
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

    it('should handle statements without context activities', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/scored',
            display: { 'en-US': 'scored' },
          },
          object: {
            id: 'element-1',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
          result: { score: { raw: 85, max: 100 } },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toBe(0); // No context = not in topic
      expect(result.metadata?.elementCount).toBe(0);
    });
  });

  describe('validateParams', () => {
    it('should throw error if userId is missing', () => {
      expect(() =>
        provider.validateParams({ courseId: 'course-101', topicId: '5' }),
      ).toThrow('userId is required for topic-total-score metric computation');
    });

    it('should throw error if courseId is missing', () => {
      expect(() =>
        provider.validateParams({ userId: 'user-1', topicId: '5' }),
      ).toThrow(
        'courseId is required for topic-total-score metric computation',
      );
    });

    it('should throw error if topicId is missing', () => {
      expect(() =>
        provider.validateParams({ userId: 'user-1', courseId: 'course-101' }),
      ).toThrow('topicId is required for topic-total-score metric computation');
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

      expect(() =>
        provider.validateParams({
          userId: 'user-1',
          courseId: 'course-101',
          topicId: '5',
          since: '2025-01-01T00:00:00Z',
          until: '2025-12-31T23:59:59Z',
        }),
      ).not.toThrow();
    });
  });
});
