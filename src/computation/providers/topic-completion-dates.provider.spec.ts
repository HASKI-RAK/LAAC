// Unit tests for Topic Completion Dates Provider (REQ-FN-004, CSV TO-005)

import { TopicCompletionDatesProvider } from './topic-completion-dates.provider';
import { xAPIStatement } from '../../data-access';

describe('TopicCompletionDatesProvider (REQ-FN-004, CSV TO-005)', () => {
  let provider: TopicCompletionDatesProvider;

  beforeEach(() => {
    provider = new TopicCompletionDatesProvider();
  });

  describe('metadata', () => {
    it('should have correct metric metadata', () => {
      expect(provider.id).toBe('topic-completion-dates');
      expect(provider.dashboardLevel).toBe('topic');
      expect(provider.description).toBe(
        'Completion date of the last three learning elements of any topic completed by a student',
      );
      expect(provider.version).toBe('1.0.0');
      expect(provider.outputType).toBe('array');
      expect(provider.requiredParams).toEqual([
        'userId',
        'courseId',
        'topicId',
      ]);
      expect(provider.optionalParams).toEqual([]);
    });
  });

  describe('compute', () => {
    it('should return last 3 completion dates in topic sorted descending', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
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
          result: { completion: true },
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
          result: { completion: true },
          timestamp: '2025-11-03T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
          },
          object: {
            id: 'element-3',
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
          result: { completion: true },
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toHaveLength(3);
      expect(result.value).toEqual([
        '2025-11-03T10:00:00Z',
        '2025-11-02T10:00:00Z',
        '2025-11-01T10:00:00Z',
      ]);
      expect(result.metricId).toBe('topic-completion-dates');
      expect(result.metadata?.count).toBe(3);
      expect(result.metadata?.totalCompletions).toBe(3);
      expect(result.metadata?.userId).toBe('user-1');
      expect(result.metadata?.courseId).toBe('course-101');
      expect(result.metadata?.topicId).toBe('5');
      expect(result.computed).toBeDefined();
    });

    it('should limit results to 3 dates when more exist', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
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
          result: { completion: true },
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
          result: { completion: true },
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
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
          result: { completion: true },
          timestamp: '2025-11-03T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
          },
          object: { id: 'element-4' },
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
          result: { completion: true },
          timestamp: '2025-11-04T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
          },
          object: { id: 'element-5' },
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
          result: { completion: true },
          timestamp: '2025-11-05T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toHaveLength(3);
      const dates = result.value as string[];
      expect(dates[0]).toBe('2025-11-05T10:00:00Z'); // Most recent
      expect(dates[1]).toBe('2025-11-04T10:00:00Z');
      expect(dates[2]).toBe('2025-11-03T10:00:00Z');
      expect(result.metadata?.count).toBe(3);
      expect(result.metadata?.totalCompletions).toBe(5);
    });

    it('should exclude completions from other topics', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
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
          result: { completion: true },
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
                  id: 'https://moodle.example.com/course/101/topic/99',
                  objectType: 'Activity',
                },
              ],
            },
          },
          result: { completion: true },
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toHaveLength(1);
      const dates1 = result.value as string[];
      expect(dates1[0]).toBe('2025-11-01T10:00:00Z');
    });

    it('should return empty array when no completions in topic', async () => {
      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        [],
      );

      expect(result.value).toEqual([]);
      expect(result.metadata?.count).toBe(0);
      expect(result.metadata?.totalCompletions).toBe(0);
    });

    it('should handle fewer than 3 completions', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
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
          result: { completion: true },
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
          result: { completion: true },
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toHaveLength(2);
      expect(result.metadata?.count).toBe(2);
    });

    it('should recognize HASKI custom completion verb', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'https://wiki.haski.app/variables/xapi.completed',
            display: { 'en-US': 'completed' },
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
          result: { completion: true },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toHaveLength(1);
      const dates2 = result.value as string[];
      expect(dates2[0]).toBe('2025-11-01T10:00:00Z');
    });

    it('should recognize passed verb as completion', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/passed',
            display: { 'en-US': 'passed' },
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
          result: { success: true },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toHaveLength(1);
      const dates3 = result.value as string[];
      expect(dates3[0]).toBe('2025-11-01T10:00:00Z');
    });

    it('should skip statements without timestamp', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
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
          result: { completion: true },
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
          result: { completion: true },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      const dates4 = result.value as string[];
      expect(dates4).toHaveLength(1);
      expect(dates4[0]).toBe('2025-11-01T10:00:00Z');
    });

    it('should return dates in ISO 8601 format', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
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
          result: { completion: true },
          timestamp: '2025-11-15T14:30:45.123Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      const dates = result.value as string[];
      expect(dates[0]).toBe('2025-11-15T14:30:45.123Z');
      expect(dates[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('validateParams', () => {
    it('should throw error if userId is missing', () => {
      expect(() =>
        provider.validateParams({ courseId: 'course-101', topicId: '5' }),
      ).toThrow(
        'userId is required for topic-completion-dates metric computation',
      );
    });

    it('should throw error if courseId is missing', () => {
      expect(() =>
        provider.validateParams({ userId: 'user-1', topicId: '5' }),
      ).toThrow(
        'courseId is required for topic-completion-dates metric computation',
      );
    });

    it('should throw error if topicId is missing', () => {
      expect(() =>
        provider.validateParams({ userId: 'user-1', courseId: 'course-101' }),
      ).toThrow(
        'topicId is required for topic-completion-dates metric computation',
      );
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
