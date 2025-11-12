// REQ-FN-003: Topic Mastery Provider Tests
// Unit tests verifying topic mastery metric computation

import { TopicMasteryProvider } from './topic-mastery.provider';
import { MetricParams } from '../interfaces/metric-params.interface';
import { xAPIStatement } from '../../data-access';

describe('REQ-FN-003: TopicMasteryProvider', () => {
  let provider: TopicMasteryProvider;

  beforeEach(() => {
    provider = new TopicMasteryProvider();
  });

  describe('Interface Compliance', () => {
    it('should implement IMetricComputation interface', () => {
      expect(provider.id).toBe('topic-mastery');
      expect(provider.dashboardLevel).toBe('topic');
      expect(provider.description).toBeTruthy();
      expect(provider.version).toBe('1.0.0');
      expect(typeof provider.compute).toBe('function');
      expect(typeof provider.validateParams).toBe('function');
    });

    it('should have required properties', () => {
      expect(provider.id).toBe('topic-mastery');
      expect(provider.dashboardLevel).toBe('topic');
      expect(provider.description).toContain('mastery');
    });
  });

  describe('validateParams', () => {
    it('should throw error if courseId is missing', () => {
      const params: MetricParams = { topicId: 'topic-456' };
      expect(() => provider.validateParams(params)).toThrow(
        'courseId is required',
      );
    });

    it('should throw error if topicId is missing', () => {
      const params: MetricParams = { courseId: 'course-123' };
      expect(() => provider.validateParams(params)).toThrow(
        'topicId is required',
      );
    });

    it('should not throw if both courseId and topicId are provided', () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      expect(() => provider.validateParams(params)).not.toThrow();
    });
  });

  describe('compute', () => {
    it('should return MetricResult with correct structure', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      const statements: xAPIStatement[] = [];

      const result = await provider.compute(params, statements);

      expect(result).toHaveProperty('metricId', 'topic-mastery');
      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('computed');
      expect(result).toHaveProperty('metadata');
      expect(typeof result.value).toBe('number');
      expect(result.computed).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it('should return 0 mastery for empty statements', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      const statements: xAPIStatement[] = [];

      const result = await provider.compute(params, statements);

      expect(result.value).toBe(0);
      expect(result.metadata?.attemptCount).toBe(0);
      expect(result.metadata?.avgScore).toBe(0);
    });

    it('should calculate mastery from scaled scores', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/answered' },
          object: { id: 'quiz-1' },
          result: {
            score: { scaled: 0.85 }, // 85%
            success: true,
          },
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user2' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/answered' },
          object: { id: 'quiz-1' },
          result: {
            score: { scaled: 0.92 }, // 92%
            success: true,
          },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      // Average: (85 + 92) / 2 = 88.5
      expect(result.value).toBe(88.5);
      expect(result.metadata?.avgScore).toBe(88.5);
      expect(result.metadata?.attemptCount).toBe(2);
      expect(result.metadata?.successCount).toBe(2);
      expect(result.metadata?.successRate).toBe(1);
    });

    it('should calculate mastery from raw/min/max scores', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/answered' },
          object: { id: 'quiz-1' },
          result: {
            score: { raw: 8, min: 0, max: 10 }, // 80%
            success: true,
          },
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user2' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/answered' },
          object: { id: 'quiz-1' },
          result: {
            score: { raw: 9, min: 0, max: 10 }, // 90%
            success: true,
          },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      // Average: (80 + 90) / 2 = 85
      expect(result.value).toBe(85);
      expect(result.metadata?.avgScore).toBe(85);
      expect(result.metadata?.attemptCount).toBe(2);
    });

    it('should calculate mastery from raw/max scores (min assumed 0)', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/answered' },
          object: { id: 'quiz-1' },
          result: {
            score: { raw: 85, max: 100 }, // 85%
          },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      expect(result.value).toBe(85);
      expect(result.metadata?.avgScore).toBe(85);
    });

    it('should track success rate correctly', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/passed' },
          object: { id: 'quiz-1' },
          result: {
            score: { scaled: 0.85 },
            success: true,
          },
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user2' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/failed' },
          object: { id: 'quiz-1' },
          result: {
            score: { scaled: 0.45 },
            success: false,
          },
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user3' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/answered' },
          object: { id: 'quiz-1' },
          result: {
            score: { scaled: 0.78 },
            success: true,
          },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      expect(result.metadata?.attemptCount).toBe(3);
      expect(result.metadata?.successCount).toBe(2);
      expect(result.metadata?.successRate).toBeCloseTo(0.6667, 4);
    });

    it('should ignore statements without scores', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/answered' },
          object: { id: 'quiz-1' },
          result: {
            score: { scaled: 0.85 },
          },
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user2' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/answered' },
          object: { id: 'quiz-1' },
          // No result/score
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      expect(result.metadata?.attemptCount).toBe(1); // Only scored statement counted
      expect(result.value).toBe(85);
    });

    it('should ignore non-scored verbs', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/answered' },
          object: { id: 'quiz-1' },
          result: {
            score: { scaled: 0.85 },
          },
        } as xAPIStatement,
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user2' },
          },
          verb: { id: 'https://wiki.haski.app/variables/xapi.viewed' }, // Not scored verb
          object: { id: 'quiz-1' },
          result: {
            score: { scaled: 0.95 },
          },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      expect(result.metadata?.attemptCount).toBe(1); // Only scored verb counted
    });

    it('should handle HASKI custom verbs', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'https://wiki.haski.app/variables/xapi.answered' },
          object: { id: 'quiz-1' },
          result: {
            score: { scaled: 0.88 },
          },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      expect(result.value).toBe(88);
      expect(result.metadata?.attemptCount).toBe(1);
    });
  });

  describe('Stateless Behavior (REQ-FN-004)', () => {
    it('should not modify input parameters', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      const paramsCopy = { ...params };

      await provider.compute(params, []);

      expect(params).toEqual(paramsCopy);
    });

    it('should not modify input statements', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/answered' },
          object: { id: 'quiz-1' },
          result: {
            score: { scaled: 0.85 },
          },
        } as xAPIStatement,
      ];
      const statementsCopy = JSON.parse(JSON.stringify(statements));

      await provider.compute(params, statements);

      expect(statements).toEqual(statementsCopy);
    });
  });

  describe('Metadata', () => {
    it('should include all required metadata fields', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        topicId: 'topic-456',
      };
      const statements: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'http://adlnet.gov/expapi/verbs/answered' },
          object: { id: 'quiz-1' },
          result: {
            score: { scaled: 0.85 },
            success: true,
          },
        } as xAPIStatement,
      ];

      const result = await provider.compute(params, statements);

      expect(result.metadata).toHaveProperty('avgScore');
      expect(result.metadata).toHaveProperty('attemptCount');
      expect(result.metadata).toHaveProperty('successCount');
      expect(result.metadata).toHaveProperty('successRate');
      expect(result.metadata).toHaveProperty('unit', 'score');
      expect(result.metadata).toHaveProperty('courseId', 'course-123');
      expect(result.metadata).toHaveProperty('topicId', 'topic-456');
    });
  });
});
