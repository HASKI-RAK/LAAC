// Unit tests for Course Completion Dates Provider (REQ-FN-004, CSV CO-005)

import { CourseCompletionDatesProvider } from './course-completion-dates.provider';
import { xAPIStatement } from '../../data-access';

describe('CourseCompletionDatesProvider (REQ-FN-004, CSV CO-005)', () => {
  let provider: CourseCompletionDatesProvider;

  beforeEach(() => {
    provider = new CourseCompletionDatesProvider();
  });

  describe('metadata', () => {
    it('should have correct metric metadata', () => {
      expect(provider.id).toBe('course-completion-dates');
      expect(provider.dashboardLevel).toBe('course');
      expect(provider.description).toBe(
        'Completion date of the last three learning elements of any course completed by a student',
      );
      expect(provider.version).toBe('1.0.0');
      expect(provider.outputType).toBe('array');
      expect(provider.requiredParams).toEqual(['userId', 'courseId']);
      expect(provider.optionalParams).toEqual(['since', 'until']);
    });
  });

  describe('compute', () => {
    it('should return last three completion dates in descending order', async () => {
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
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
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
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
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
      expect(result.metricId).toBe('course-completion-dates');

      const dates = result.value as string[];
      expect(dates[0]).toBe('2025-11-04T10:00:00Z'); // Most recent
      expect(dates[1]).toBe('2025-11-03T10:00:00Z');
      expect(dates[2]).toBe('2025-11-02T10:00:00Z');

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

    it('should return fewer than three dates if only 2 completions exist', async () => {
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

      const dates = result.value as string[];
      expect(dates[0]).toBe('2025-11-02T10:00:00Z'); // Most recent
      expect(dates[1]).toBe('2025-11-01T10:00:00Z');
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
      const dates = result.value as string[];
      expect(dates[0]).toBe('2025-11-01T10:00:00Z');
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
      const dates = result.value as string[];
      expect(dates[0]).toBe('2025-11-01T10:00:00Z');
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
      const dates = result.value as string[];
      expect(dates[0]).toBe('2025-11-02T10:00:00Z');
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

    it('should handle single completion', async () => {
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
      const dates = result.value as string[];
      expect(dates[0]).toBe('2025-11-01T10:00:00Z');
      expect(result.metadata?.count).toBe(1);
    });

    it('should preserve ISO 8601 format for all dates', async () => {
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
          timestamp: '2025-11-17T14:30:45.123Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      const dates = result.value as string[];
      expect(dates[0]).toBe('2025-11-17T14:30:45.123Z');
      // Verify it's a valid ISO 8601 timestamp
      expect(new Date(dates[0]).toISOString()).toBe(dates[0]);
    });
  });

  describe('validateParams', () => {
    it('should throw error if userId is missing', () => {
      expect(() => provider.validateParams({ courseId: 'course-1' })).toThrow(
        'userId is required for course-completion-dates metric computation',
      );
    });

    it('should throw error if courseId is missing', () => {
      expect(() => provider.validateParams({ userId: 'user-1' })).toThrow(
        'courseId is required for course-completion-dates metric computation',
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
