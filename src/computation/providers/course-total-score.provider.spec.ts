// Unit tests for Course Total Score Provider (REQ-FN-004, CSV CO-001)

import { CourseTotalScoreProvider } from './course-total-score.provider';
import { xAPIStatement } from '../../data-access';

describe('CourseTotalScoreProvider (REQ-FN-004, CSV CO-001)', () => {
  let provider: CourseTotalScoreProvider;

  beforeEach(() => {
    provider = new CourseTotalScoreProvider();
  });

  describe('metadata', () => {
    it('should have correct metric metadata', () => {
      expect(provider.id).toBe('course-total-score');
      expect(provider.dashboardLevel).toBe('course');
      expect(provider.description).toBe(
        'Total score earned by a student on learning elements in each course',
      );
      expect(provider.version).toBe('1.0.0');
      expect(provider.outputType).toBe('scalar');
      expect(provider.requiredParams).toEqual(['userId', 'courseId']);
      expect(provider.optionalParams).toEqual(['since', 'until']);
    });
  });

  describe('compute', () => {
    it('should sum scores from all learning elements', async () => {
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
          result: { score: { raw: 92, max: 100 } },
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
            id: 'element-3',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
          result: { score: { raw: 78, max: 100 } },
          timestamp: '2025-11-03T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.value).toBe(255); // 85 + 92 + 78
      expect(result.metricId).toBe('course-total-score');
      expect(result.metadata?.unit).toBe('points');
      expect(result.metadata?.elementCount).toBe(3);
      expect(result.metadata?.avgScore).toBe(85); // 255 / 3
      expect(result.metadata?.userId).toBe('user-1');
      expect(result.metadata?.courseId).toBe('course-1');
      expect(result.computed).toBeDefined();
    });

    it('should return 0 when no scores are available', async () => {
      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
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
        {
          actor: {
            account: { name: 'user-1', homePage: 'https://example.com' },
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
          result: { score: { raw: 92, max: 100 } },
          timestamp: '2025-11-03T10:00:00Z',
        } as xAPIStatement,
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.value).toBe(177); // 85 + 92 (skips statement without score)
      expect(result.metadata?.elementCount).toBe(2);
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

    it('should handle single scored element', async () => {
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
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.value).toBe(100);
      expect(result.metadata?.elementCount).toBe(1);
      expect(result.metadata?.avgScore).toBe(100);
    });
  });

  describe('validateParams', () => {
    it('should throw error if userId is missing', () => {
      expect(() => provider.validateParams({ courseId: 'course-1' })).toThrow(
        'userId is required for course-total-score metric computation',
      );
    });

    it('should throw error if courseId is missing', () => {
      expect(() => provider.validateParams({ userId: 'user-1' })).toThrow(
        'courseId is required for course-total-score metric computation',
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
