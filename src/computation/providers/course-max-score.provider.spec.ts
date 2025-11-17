// Unit tests for Course Max Score Provider (REQ-FN-004, CSV CO-002)

import { CourseMaxScoreProvider } from './course-max-score.provider';
import { xAPIStatement } from '../../data-access';

describe('CourseMaxScoreProvider (REQ-FN-004, CSV CO-002)', () => {
  let provider: CourseMaxScoreProvider;

  beforeEach(() => {
    provider = new CourseMaxScoreProvider();
  });

  describe('metadata', () => {
    it('should have correct metric metadata', () => {
      expect(provider.id).toBe('course-max-score');
      expect(provider.dashboardLevel).toBe('course');
      expect(provider.description).toBe(
        'Possible total score for all learning elements in each course',
      );
      expect(provider.version).toBe('1.0.0');
      expect(provider.outputType).toBe('scalar');
      expect(provider.requiredParams).toEqual(['courseId']);
      expect(provider.optionalParams).toEqual(['since', 'until']);
    });
  });

  describe('compute', () => {
    it('should sum max scores from all learning elements', async () => {
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
          result: { score: { raw: 70, max: 100 } },
          timestamp: '2025-11-02T10:00:00Z',
        } as xAPIStatement,
        {
          actor: {
            account: { name: 'user-2', homePage: 'https://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/scored',
            display: { 'en-US': 'scored' },
          },
          object: {
            id: 'element-3',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
          result: { score: { raw: 45, max: 50 } },
          timestamp: '2025-11-03T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { courseId: 'course-1' },
        statements,
      );

      expect(result.value).toBe(250); // 100 + 100 + 50
      expect(result.metricId).toBe('course-max-score');
      expect(result.metadata?.unit).toBe('points');
      expect(result.metadata?.elementCount).toBe(3);
      expect(result.metadata?.courseId).toBe('course-1');
      expect(result.computed).toBeDefined();
    });

    it('should return 0 when no max scores are available', async () => {
      const result = await provider.compute({ courseId: 'course-1' }, []);

      expect(result.value).toBe(0);
      expect(result.metadata?.elementCount).toBe(0);
    });

    it('should avoid duplicate counts for same element with multiple attempts', async () => {
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
          result: { score: { raw: 60, max: 100 } },
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
            id: 'element-1',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
          result: { score: { raw: 85, max: 100 } },
          timestamp: '2025-11-02T10:00:00Z',
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
          result: { score: { raw: 40, max: 50 } },
          timestamp: '2025-11-03T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { courseId: 'course-1' },
        statements,
      );

      expect(result.value).toBe(150); // 100 + 50 (element-1 counted once)
      expect(result.metadata?.elementCount).toBe(2);
    });

    it('should skip statements without max score information', async () => {
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
      ];

      const result = await provider.compute(
        { courseId: 'course-1' },
        statements,
      );

      expect(result.value).toBe(100); // Only element-1
      expect(result.metadata?.elementCount).toBe(1);
    });

    it('should include time range in metadata when provided', async () => {
      const result = await provider.compute(
        {
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

    it('should handle single element', async () => {
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
          result: { score: { raw: 100, max: 100 } },
          timestamp: '2025-11-01T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { courseId: 'course-1' },
        statements,
      );

      expect(result.value).toBe(100);
      expect(result.metadata?.elementCount).toBe(1);
    });
  });

  describe('validateParams', () => {
    it('should throw error if courseId is missing', () => {
      expect(() => provider.validateParams({})).toThrow(
        'courseId is required for course-max-score metric computation',
      );
    });

    it('should throw error if since is after until', () => {
      expect(() =>
        provider.validateParams({
          courseId: 'course-1',
          since: '2025-12-31T23:59:59Z',
          until: '2025-01-01T00:00:00Z',
        }),
      ).toThrow('since timestamp must be before until timestamp');
    });

    it('should not throw error for valid params', () => {
      expect(() =>
        provider.validateParams({ courseId: 'course-1' }),
      ).not.toThrow();

      expect(() =>
        provider.validateParams({
          courseId: 'course-1',
          since: '2025-01-01T00:00:00Z',
          until: '2025-12-31T23:59:59Z',
        }),
      ).not.toThrow();
    });
  });
});
