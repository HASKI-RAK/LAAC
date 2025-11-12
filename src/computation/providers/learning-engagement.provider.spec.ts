// REQ-FN-003: Learning Engagement Provider Tests
// Unit tests verifying learning engagement metric computation

import { LearningEngagementProvider } from './learning-engagement.provider';
import { MetricParams } from '../interfaces/metric-params.interface';
import { xAPIStatement } from '../../data-access';

describe('REQ-FN-003: LearningEngagementProvider', () => {
  let provider: LearningEngagementProvider;

  beforeEach(() => {
    provider = new LearningEngagementProvider();
  });

  describe('Interface Compliance', () => {
    it('should implement IMetricComputation interface', () => {
      expect(provider.id).toBe('learning-engagement');
      expect(provider.dashboardLevel).toBe('course');
      expect(provider.description).toBeTruthy();
      expect(provider.version).toBe('1.0.0');
      expect(typeof provider.compute).toBe('function');
      expect(typeof provider.validateParams).toBe('function');
    });

    it('should have required properties', () => {
      expect(provider.id).toBe('learning-engagement');
      expect(provider.dashboardLevel).toBe('course');
      expect(provider.description).toContain('engagement');
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

    it('should not throw if topicId is also provided', () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      expect(() => provider.validateParams(params)).not.toThrow();
    });
  });

  describe('compute', () => {
    it('should return MetricResult with correct structure', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [];

      const result = await provider.compute(params, statements);

      expect(result).toHaveProperty('metricId', 'learning-engagement');
      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('computed');
      expect(result).toHaveProperty('metadata');
      expect(typeof result.value).toBe('number');
      expect(result.computed).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it('should return 0 engagement for empty statements', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [];

      const result = await provider.compute(params, statements);

      expect(result.value).toBe(0);
      expect(result.metadata?.activityCount).toBe(0);
      expect(result.metadata?.avgTimeMinutes).toBe(0);
    });

    it('should count engagement activities', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'https://wiki.haski.app/variables/xapi.viewed' },
          object: { id: 'course-123' },
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://activitystrea.ms/schema/1.0/open' },
          object: { id: 'course-123' },
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'https://wiki.haski.app/variables/xapi.clicked' },
          object: { id: 'course-123' },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      expect(result.metadata?.activityCount).toBe(3);
      // 3 activities * 2 points each = 6
      expect(result.value).toBeGreaterThanOrEqual(6);
    });

    it('should parse duration from statements', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
          object: { id: 'course-123' },
          result: { duration: 'PT30M' }, // 30 minutes
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
          object: { id: 'course-123' },
          result: { duration: 'PT1H' }, // 1 hour = 60 minutes
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      expect(result.metadata?.activityCount).toBe(2);
      // Total: 90 minutes, Avg: 45 minutes
      expect(result.metadata?.totalDurationMinutes).toBe(90);
      expect(result.metadata?.avgTimeMinutes).toBe(45);
    });

    it('should parse complex ISO 8601 durations', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
          object: { id: 'course-123' },
          result: { duration: 'PT1H30M45S' }, // 1 hour, 30 minutes, 45 seconds
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      // 1*60 + 30 + 45/60 = 90.75 minutes
      expect(result.metadata?.totalDurationMinutes).toBeCloseTo(90.75, 2);
    });

    it('should calculate engagement score correctly', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'https://wiki.haski.app/variables/xapi.viewed' },
          object: { id: 'course-123' },
          result: { duration: 'PT10M' },
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'https://wiki.haski.app/variables/xapi.clicked' },
          object: { id: 'course-123' },
          result: { duration: 'PT20M' },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      // 2 activities = 4 points
      // Avg time = 15 minutes = 3 points (15 * 0.2)
      // Total = 7 points
      expect(result.value).toBeCloseTo(7, 1);
      expect(result.metadata?.activityCount).toBe(2);
      expect(result.metadata?.avgTimeMinutes).toBe(15);
    });

    it('should cap engagement score at 100', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      // Create 100 activity statements to exceed 100 score
      const statements: xAPIStatement[] = Array.from({ length: 100 }, () => ({
        actor: { account: { homePage: 'https://example.com', name: 'user1' } },
        verb: { id: 'https://wiki.haski.app/variables/xapi.viewed' },
        object: { id: 'course-123' },
      })) as xAPIStatement[];

      const result = await provider.compute(params, statements);

      expect(result.value).toBe(100); // Capped at 100
    });

    it('should ignore non-engagement verbs', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'https://wiki.haski.app/variables/xapi.viewed' },
          object: { id: 'course-123' },
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/completed' }, // Not engagement
          object: { id: 'course-123' },
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'https://wiki.haski.app/variables/xapi.clicked' },
          object: { id: 'course-123' },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      expect(result.metadata?.activityCount).toBe(2); // Only engagement verbs counted
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
          verb: { id: 'https://wiki.haski.app/variables/xapi.viewed' },
          object: { id: 'course-123' },
          result: { duration: 'PT30M' },
        } as xAPIStatement,
      ];
      const statementsCopy = JSON.parse(JSON.stringify(statements));

      await provider.compute(params, statements);

      expect(statements).toEqual(statementsCopy);
    });
  });

  describe('Metadata', () => {
    it('should include courseId and topicId in metadata', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      const statements: xAPIStatement[] = [];

      const result = await provider.compute(params, statements);

      expect(result.metadata?.courseId).toBe('course-123');
      expect(result.metadata?.topicId).toBe('topic-456');
      expect(result.metadata?.unit).toBe('score');
    });

    it('should include all time metrics', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
          object: { id: 'course-123' },
          result: { duration: 'PT30M' },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      expect(result.metadata).toHaveProperty('activityCount');
      expect(result.metadata).toHaveProperty('totalDurationMinutes');
      expect(result.metadata).toHaveProperty('avgTimeMinutes');
    });
  });
});
