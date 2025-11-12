// REQ-FN-003: Course Completion Provider Tests
// Unit tests verifying course completion metric computation

import { CourseCompletionProvider } from './course-completion.provider';
import { MetricParams } from '../interfaces/metric-params.interface';
import { xAPIStatement } from '../../data-access';

describe('REQ-FN-003: CourseCompletionProvider', () => {
  let provider: CourseCompletionProvider;

  beforeEach(() => {
    provider = new CourseCompletionProvider();
  });

  describe('Interface Compliance', () => {
    it('should implement IMetricComputation interface', () => {
      expect(provider.id).toBe('course-completion');
      expect(provider.dashboardLevel).toBe('course');
      expect(provider.description).toBeTruthy();
      expect(provider.version).toBe('1.0.0');
      expect(typeof provider.compute).toBe('function');
      expect(typeof provider.validateParams).toBe('function');
    });

    it('should have required properties', () => {
      expect(provider.id).toBe('course-completion');
      expect(provider.dashboardLevel).toBe('course');
      expect(provider.description).toContain('completed');
    });
  });

  describe('validateParams', () => {
    it('should throw error if courseId is missing', () => {
      const params: MetricParams = {};
      expect(() => provider.validateParams(params)).toThrow(
        'courseId is required',
      );
    });

    it('should not throw if courseId is provided', () => {
      const params: MetricParams = { courseId: 'course-123' };
      expect(() => provider.validateParams(params)).not.toThrow();
    });

    it('should throw error if since is after until', () => {
      const params: MetricParams = {
        courseId: 'course-123',
        since: '2024-12-31T23:59:59Z',
        until: '2024-01-01T00:00:00Z',
      };
      expect(() => provider.validateParams(params)).toThrow(
        'since timestamp must be before until timestamp',
      );
    });

    it('should not throw if time range is valid', () => {
      const params: MetricParams = {
        courseId: 'course-123',
        since: '2024-01-01T00:00:00Z',
        until: '2024-12-31T23:59:59Z',
      };
      expect(() => provider.validateParams(params)).not.toThrow();
    });
  });

  describe('compute', () => {
    it('should return MetricResult with correct structure', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [];

      const result = await provider.compute(params, statements);

      expect(result).toHaveProperty('metricId', 'course-completion');
      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('computed');
      expect(result).toHaveProperty('metadata');
      expect(typeof result.value).toBe('number');
      expect(result.computed).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it('should return 0% completion for empty statements', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [];

      const result = await provider.compute(params, statements);

      expect(result.value).toBe(0);
      expect(result.metadata?.totalLearners).toBe(0);
      expect(result.metadata?.completedLearners).toBe(0);
    });

    it('should calculate completion percentage correctly', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [
        // Learner 1: Completed
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'https://wiki.haski.app/variables/xapi.completed' },
          object: { id: 'course-123' },
        } as xAPIStatement,
        // Learner 2: Activity but not completed
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user2' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
          object: { id: 'course-123' },
        } as xAPIStatement,
        // Learner 3: Completed
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user3' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
          object: { id: 'course-123' },
        } as xAPIStatement,
        // Learner 4: Activity but not completed
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user4' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/attempted' },
          object: { id: 'course-123' },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      // 2 out of 4 learners completed = 50%
      expect(result.value).toBe(50);
      expect(result.metadata?.totalLearners).toBe(4);
      expect(result.metadata?.completedLearners).toBe(2);
      expect(result.metadata?.unit).toBe('percentage');
    });

    it('should handle multiple completion statements per learner', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'https://wiki.haski.app/variables/xapi.completed' },
          object: { id: 'course-123' },
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
          object: { id: 'course-123' },
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user2' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
          object: { id: 'course-123' },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      // 1 out of 2 learners completed = 50%
      expect(result.value).toBe(50);
      expect(result.metadata?.totalLearners).toBe(2);
      expect(result.metadata?.completedLearners).toBe(1);
    });

    it('should support mbox-based actor identification', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [
        {
          actor: { mbox: 'mailto:user1@example.com' },
          verb: { id: 'https://wiki.haski.app/variables/xapi.completed' },
          object: { id: 'course-123' },
        } as xAPIStatement,
        {
          actor: { mbox: 'mailto:user2@example.com' },
          verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
          object: { id: 'course-123' },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      expect(result.value).toBe(50); // 1 out of 2
      expect(result.metadata?.totalLearners).toBe(2);
      expect(result.metadata?.completedLearners).toBe(1);
    });
  });

  describe('Stateless Behavior (REQ-FN-004)', () => {
    it('should not modify input parameters', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const paramsCopy = { ...params };

      await provider.compute(params, []);

      expect(params).toEqual(paramsCopy);
    });

    it('should not modify input statements', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'https://wiki.haski.app/variables/xapi.completed' },
          object: { id: 'course-123' },
        } as xAPIStatement,
      ];
      const statementsCopy = JSON.parse(JSON.stringify(statements));

      await provider.compute(params, statements);

      expect(statements).toEqual(statementsCopy);
    });

    it('should return consistent results for same input', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'https://wiki.haski.app/variables/xapi.completed' },
          object: { id: 'course-123' },
        } as xAPIStatement,
      ];

      const result1 = await provider.compute(params, statements);
      const result2 = await provider.compute(params, statements);

      expect(result1.value).toBe(result2.value);
      expect(result1.metadata?.totalLearners).toBe(
        result2.metadata?.totalLearners,
      );
    });
  });

  describe('Metadata', () => {
    it('should include courseId in metadata', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [];

      const result = await provider.compute(params, statements);

      expect(result.metadata?.courseId).toBe('course-123');
    });

    it('should include time range in metadata when provided', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        since: '2024-01-01T00:00:00Z',
        until: '2024-12-31T23:59:59Z',
      };
      const statements: xAPIStatement[] = [];

      const result = await provider.compute(params, statements);

      expect(result.metadata?.timeRange).toEqual({
        since: '2024-01-01T00:00:00Z',
        until: '2024-12-31T23:59:59Z',
      });
    });

    it('should not include time range when not provided', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [];

      const result = await provider.compute(params, statements);

      expect(result.metadata?.timeRange).toBeUndefined();
    });
  });
});
