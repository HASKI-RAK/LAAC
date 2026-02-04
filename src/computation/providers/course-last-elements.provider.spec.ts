// Unit tests for Course Last Elements Provider (REQ-FN-032, CSV v3)

import { CourseLastElementsProvider } from './course-last-elements.provider';
import { xAPIStatement } from '../../data-access';

describe('CourseLastElementsProvider (REQ-FN-032, CSV v3)', () => {
  let provider: CourseLastElementsProvider;

  beforeEach(() => {
    provider = new CourseLastElementsProvider();
  });

  describe('metadata', () => {
    it('should have correct metric metadata for CSV v3', () => {
      expect(provider.id).toBe('course-last-elements');
      expect(provider.dashboardLevel).toBe('course');
      expect(provider.description).toBe(
        'Returns the three most recently completed learning elements by the user within a specific course, ordered by completion time descending and optionally filtered by a specified time range.',
      );
      expect(provider.version).toBe('3.0.0');
      expect(provider.outputType).toBe('array');
      expect(provider.requiredParams).toEqual(['userId', 'courseId']);
      expect(provider.optionalParams).toEqual(['since', 'until']);
    });
  });

  describe('compute', () => {
    it('should return last three completed elements in descending order', async () => {
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
              name: { 'en-US': 'Introduction' },
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
              name: { 'en-US': 'Chapter 1' },
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
          object: {
            id: 'element-3',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/lesson',
              name: { 'en-US': 'Chapter 2' },
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
            id: 'element-4',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/lesson',
              name: { 'en-US': 'Chapter 3' },
            },
          },
          result: { completion: true },
          timestamp: '2025-11-04T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toHaveLength(3);
      expect(result.metricId).toBe('course-last-elements');

      const elements = result.value as Array<{
        elementId: string;
        completedAt: string;
        title?: string;
      }>;
      expect(elements[0].elementId).toBe('element-4'); // Most recent
      expect(elements[0].title).toBe('Chapter 3');
      expect(elements[0].completedAt).toBe('2025-11-04T10:00:00Z');
      expect(elements[1].elementId).toBe('element-3');
      expect(elements[2].elementId).toBe('element-2');

      expect(result.metadata?.count).toBe(3);
      expect(result.metadata?.totalCompletions).toBe(4);
      expect(result.metadata?.userId).toBe('user-1');
      expect(result.metadata?.courseId).toBe('course-1');
    });

    it('should return empty array when no completions exist', async () => {
      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        [],
      );

      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toHaveLength(0);
      expect(result.metadata?.count).toBe(0);
      expect(result.metadata?.totalCompletions).toBe(0);
    });

    it('should return fewer than three elements if only 2 completions exist', async () => {
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
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
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
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
          },
          result: { completion: true },
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.metadata?.count).toBe(2);
      expect(result.metadata?.totalCompletions).toBe(2);
    });

    it('should handle HASKI custom completion verb', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'https://wiki.haski.app/variables/xapi.completed',
            display: { 'en-US': 'completed' },
          },
          object: {
            id: 'element-1',
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
          },
          result: { completion: true },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.value).toHaveLength(1);
      const elements = result.value as Array<{ elementId: string }>;
      expect(elements[0].elementId).toBe('element-1');
    });

    it('should handle passed verb as completion', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/passed',
            display: { 'en-US': 'passed' },
          },
          object: {
            id: 'element-1',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
          result: { success: true },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.value).toHaveLength(1);
      const elements = result.value as Array<{ elementId: string }>;
      expect(elements[0].elementId).toBe('element-1');
    });

    it('should filter out non-completion statements', async () => {
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/attempted',
            display: { 'en-US': 'attempted' },
          },
          object: {
            id: 'element-1',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
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
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
          },
          result: { completion: true },
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.value).toHaveLength(1);
      const elements = result.value as Array<{ elementId: string }>;
      expect(elements[0].elementId).toBe('element-2');
    });

    it('should include time range in metadata when provided', async () => {
      const result = await provider.compute(
        {
          userId: 'user-1',
          courseId: 'course-1',
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

    it('should handle elements without title', async () => {
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
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
          },
          result: { completion: true },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.value).toHaveLength(1);
      const elements = result.value as Array<{
        elementId: string;
        title?: string;
      }>;
      expect(elements[0].elementId).toBe('element-1');
      expect(elements[0].title).toBeUndefined();
    });
  });

  describe('validateParams', () => {
    it('should throw error if userId is missing', () => {
      expect(() => provider.validateParams({ courseId: 'course-1' })).toThrow(
        'userId is required for course-last-elements metric computation',
      );
    });

    it('should throw error if courseId is missing', () => {
      expect(() => provider.validateParams({ userId: 'user-1' })).toThrow(
        'courseId is required for course-last-elements metric computation',
      );
    });

    it('should throw error if since is after until', () => {
      expect(() =>
        provider.validateParams({
          userId: 'user-1',
          courseId: 'course-1',
          since: '2025-12-31T23:59:59Z',
          until: '2025-01-01T00:00:00Z',
        }),
      ).toThrow('since timestamp must be before until timestamp');
    });

    it('should not throw error for valid params', () => {
      expect(() =>
        provider.validateParams({
          userId: 'user-1',
          courseId: 'course-1',
        }),
      ).not.toThrow();

      expect(() =>
        provider.validateParams({
          userId: 'user-1',
          courseId: 'course-1',
          since: '2025-01-01T00:00:00Z',
          until: '2025-12-31T23:59:59Z',
        }),
      ).not.toThrow();
    });
  });
});
