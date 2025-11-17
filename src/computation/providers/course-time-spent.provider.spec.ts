// Unit tests for Course Time Spent Provider (REQ-FN-004, CSV CO-003)

import { CourseTimeSpentProvider } from './course-time-spent.provider';
import { xAPIStatement } from '../../data-access';

describe('CourseTimeSpentProvider (REQ-FN-004, CSV CO-003)', () => {
  let provider: CourseTimeSpentProvider;

  beforeEach(() => {
    provider = new CourseTimeSpentProvider();
  });

  describe('metadata', () => {
    it('should have correct metric metadata', () => {
      expect(provider.id).toBe('course-time-spent');
      expect(provider.dashboardLevel).toBe('course');
      expect(provider.description).toBe(
        'Total time spent by a student in each course in a given time period',
      );
      expect(provider.version).toBe('1.0.0');
      expect(provider.outputType).toBe('scalar');
      expect(provider.requiredParams).toEqual(['userId', 'courseId']);
      expect(provider.optionalParams).toEqual(['since', 'until']);
    });
  });

  describe('compute', () => {
    it('should aggregate duration from all activities', async () => {
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
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
          },
          result: { duration: 'PT45M' }, // 45 minutes = 2700 seconds
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
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
          },
          result: { duration: 'PT30M' }, // 30 minutes = 1800 seconds
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
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
          result: { duration: 'PT15M' }, // 15 minutes = 900 seconds
          timestamp: '2025-11-03T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.value).toBe(5400); // 2700 + 1800 + 900 = 5400 seconds
      expect(result.metricId).toBe('course-time-spent');
      expect(result.metadata?.unit).toBe('seconds');
      expect(result.metadata?.activityCount).toBe(3);
      expect(result.metadata?.hours).toBe(1.5); // 5400 / 3600 = 1.5 hours
      expect(result.metadata?.userId).toBe('user-1');
      expect(result.metadata?.courseId).toBe('course-1');
      expect(result.computed).toBeDefined();
    });

    it('should parse complex ISO 8601 duration with hours, minutes, and seconds', async () => {
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
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
          },
          result: { duration: 'PT1H30M45S' }, // 1 hour 30 minutes 45 seconds = 5445 seconds
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.value).toBe(5445);
      expect(result.metadata?.hours).toBe(1.51); // 5445 / 3600 ≈ 1.51
    });

    it('should parse duration with only seconds', async () => {
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
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
          },
          result: { duration: 'PT30S' }, // 30 seconds
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.value).toBe(30);
      expect(result.metadata?.hours).toBe(0.01); // 30 / 3600 ≈ 0.01
    });

    it('should return 0 when no duration data is available', async () => {
      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        [],
      );

      expect(result.value).toBe(0);
      expect(result.metadata?.activityCount).toBe(0);
      expect(result.metadata?.hours).toBe(0);
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
          object: {
            id: 'element-1',
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
          },
          result: { duration: 'PT45M' },
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
          object: {
            id: 'element-3',
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
          },
          result: { duration: 'PT30M' },
          timestamp: '2025-11-03T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.value).toBe(4500); // 2700 + 1800 (skips statement without duration)
      expect(result.metadata?.activityCount).toBe(2);
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

    it('should handle single activity', async () => {
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
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
          },
          result: { duration: 'PT1H' }, // 1 hour = 3600 seconds
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.value).toBe(3600);
      expect(result.metadata?.activityCount).toBe(1);
      expect(result.metadata?.hours).toBe(1.0);
    });

    it('should handle invalid duration format gracefully', async () => {
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
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
          },
          result: { duration: 'invalid' },
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
            definition: { type: 'http://adlnet.gov/expapi/activities/lesson' },
          },
          result: { duration: 'PT30M' },
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.value).toBe(1800); // Only valid duration counted
      expect(result.metadata?.activityCount).toBe(2); // Both statements processed
    });
  });

  describe('validateParams', () => {
    it('should throw error if userId is missing', () => {
      expect(() => provider.validateParams({ courseId: 'course-1' })).toThrow(
        'userId is required for course-time-spent metric computation',
      );
    });

    it('should throw error if courseId is missing', () => {
      expect(() => provider.validateParams({ userId: 'user-1' })).toThrow(
        'courseId is required for course-time-spent metric computation',
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
