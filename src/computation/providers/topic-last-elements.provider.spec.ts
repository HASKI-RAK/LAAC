// Unit tests for Topic Last Elements Provider (REQ-FN-004, CSV TO-004)

import { TopicLastElementsProvider } from './topic-last-elements.provider';
import { xAPIStatement } from '../../data-access';

describe('TopicLastElementsProvider (REQ-FN-004, CSV TO-004)', () => {
  let provider: TopicLastElementsProvider;

  beforeEach(() => {
    provider = new TopicLastElementsProvider();
  });

  describe('metadata', () => {
    it('should have correct metric metadata', () => {
      expect(provider.id).toBe('topic-last-elements');
      expect(provider.dashboardLevel).toBe('topic');
      expect(provider.description).toBe(
        'Last three learning elements of any topic in a course completed by a student',
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
    it('should return last 3 completed elements in topic sorted by completion date', async () => {
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
              name: { 'en-US': 'Element 1' },
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
              name: { 'en-US': 'Element 2' },
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
              name: { 'en-US': 'Element 3' },
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
      const elements = result.value as Array<{
        elementId: string;
        title?: string;
        completedAt: string;
      }>;
      expect(elements[0]).toEqual({
        elementId: 'element-2',
        title: 'Element 2',
        completedAt: '2025-11-03T10:00:00Z',
      });
      expect(elements[1]).toEqual({
        elementId: 'element-3',
        title: 'Element 3',
        completedAt: '2025-11-02T10:00:00Z',
      });
      expect(elements[2]).toEqual({
        elementId: 'element-1',
        title: 'Element 1',
        completedAt: '2025-11-01T10:00:00Z',
      });
      expect(result.metricId).toBe('topic-last-elements');
      expect(result.metadata?.count).toBe(3);
      expect(result.metadata?.totalCompletions).toBe(3);
    });

    it('should limit results to 3 elements when more exist', async () => {
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
      const elements1 = result.value as Array<{ elementId: string }>;
      expect(elements1[0].elementId).toBe('element-5'); // Most recent
      expect(elements1[1].elementId).toBe('element-4');
      expect(elements1[2].elementId).toBe('element-3');
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
      const elements2 = result.value as Array<{ elementId: string }>;
      expect(elements2[0].elementId).toBe('element-1');
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
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-101', topicId: '5' },
        statements,
      );

      expect(result.value).toHaveLength(1);
      expect(result.metadata?.count).toBe(1);
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
      const elements3 = result.value as Array<{ elementId: string }>;
      expect(elements3[0].elementId).toBe('element-1');
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
      const elements4 = result.value as Array<{ elementId: string }>;
      expect(elements4[0].elementId).toBe('element-1');
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

      expect(result.value).toHaveLength(1);
      const elements = result.value as Array<{ elementId: string }>;
      expect(elements[0].elementId).toBe('element-2');
    });
  });

  describe('validateParams', () => {
    it('should throw error if userId is missing', () => {
      expect(() =>
        provider.validateParams({ courseId: 'course-101', topicId: '5' }),
      ).toThrow(
        'userId is required for topic-last-elements metric computation',
      );
    });

    it('should throw error if courseId is missing', () => {
      expect(() =>
        provider.validateParams({ userId: 'user-1', topicId: '5' }),
      ).toThrow(
        'courseId is required for topic-last-elements metric computation',
      );
    });

    it('should throw error if topicId is missing', () => {
      expect(() =>
        provider.validateParams({ userId: 'user-1', courseId: 'course-101' }),
      ).toThrow(
        'topicId is required for topic-last-elements metric computation',
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
