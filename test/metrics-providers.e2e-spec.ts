// REQ-FN-003: Metric Providers E2E Tests
// End-to-end tests for metric providers with sample xAPI data

import { Test, TestingModule } from '@nestjs/testing';
import {
  CourseCompletionProvider,
  LearningEngagementProvider,
  TopicMasteryProvider,
} from '../src/computation/providers';
import { xAPIStatement } from '../src/data-access';

describe('REQ-FN-003: Metric Providers (e2e)', () => {
  let courseCompletionProvider: CourseCompletionProvider;
  let learningEngagementProvider: LearningEngagementProvider;
  let topicMasteryProvider: TopicMasteryProvider;

  // Sample xAPI statements simulating real HASKI data
  const sampleStatements: xAPIStatement[] = [
    // Course completion statements
    {
      id: '00000000-0000-0000-0000-000000000001',
      actor: {
        account: {
          homePage: 'https://ke.moodle.haski.app',
          name: '101',
        },
      },
      verb: {
        id: 'https://wiki.haski.app/variables/xapi.completed',
        display: { en: 'completed' },
      },
      object: {
        id: 'https://ke.moodle.haski.app/course/view.php?id=42',
        definition: {
          type: 'http://adlnet.gov/expapi/activities/course',
          name: { en: 'Introduction to Programming' },
        },
      },
      context: {
        platform: 'Moodle',
        language: 'en',
      },
      timestamp: '2024-11-10T14:30:00.000Z',
    } as xAPIStatement,

    // Engagement: User viewing course content
    {
      id: '00000000-0000-0000-0000-000000000002',
      actor: {
        account: {
          homePage: 'https://ke.haski.app',
          name: '101',
        },
      },
      verb: {
        id: 'https://wiki.haski.app/variables/xapi.viewed',
        display: { en: 'viewed' },
      },
      object: {
        id: 'https://ke.haski.app/module/42/topic/1',
        definition: {
          type: 'http://activitystrea.ms/schema/1.0/page',
          name: { en: 'Variables and Data Types' },
        },
      },
      context: {
        platform: 'Frontend',
        language: 'en',
      },
      result: {
        duration: 'PT15M30S', // 15 minutes 30 seconds
      },
      timestamp: '2024-11-10T10:00:00.000Z',
    } as xAPIStatement,

    // Engagement: User interacting with content
    {
      id: '00000000-0000-0000-0000-000000000003',
      actor: {
        account: {
          homePage: 'https://ke.haski.app',
          name: '102',
        },
      },
      verb: {
        id: 'https://wiki.haski.app/variables/xapi.clicked',
        display: { en: 'clicked' },
      },
      object: {
        id: 'https://ke.haski.app/module/42/topic/1/element/1',
      },
      context: {
        platform: 'Frontend',
        language: 'en',
      },
      result: {
        duration: 'PT5M',
      },
      timestamp: '2024-11-10T10:30:00.000Z',
    } as xAPIStatement,

    // Topic mastery: Quiz answered with score
    {
      id: '00000000-0000-0000-0000-000000000004',
      actor: {
        account: {
          homePage: 'https://ke.moodle.haski.app',
          name: '101',
        },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/answered',
        display: { en: 'answered' },
      },
      object: {
        id: 'https://ke.moodle.haski.app/mod/quiz/view.php?id=123',
        definition: {
          type: 'http://adlnet.gov/expapi/activities/assessment',
          name: { en: 'Variables Quiz' },
        },
      },
      context: {
        platform: 'Moodle',
        language: 'en',
        contextActivities: {
          parent: [
            {
              id: 'https://ke.moodle.haski.app/course/view.php?id=42&section=1',
            },
          ],
        },
      },
      result: {
        score: {
          scaled: 0.85,
          raw: 85,
          min: 0,
          max: 100,
        },
        success: true,
        completion: true,
      },
      timestamp: '2024-11-10T11:00:00.000Z',
    } as xAPIStatement,

    // Topic mastery: Another quiz attempt
    {
      id: '00000000-0000-0000-0000-000000000005',
      actor: {
        account: {
          homePage: 'https://ke.moodle.haski.app',
          name: '102',
        },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/answered',
        display: { en: 'answered' },
      },
      object: {
        id: 'https://ke.moodle.haski.app/mod/quiz/view.php?id=123',
      },
      context: {
        platform: 'Moodle',
        language: 'en',
      },
      result: {
        score: {
          scaled: 0.92,
          raw: 92,
          min: 0,
          max: 100,
        },
        success: true,
        completion: true,
      },
      timestamp: '2024-11-10T11:15:00.000Z',
    } as xAPIStatement,

    // Failed quiz attempt
    {
      id: '00000000-0000-0000-0000-000000000006',
      actor: {
        account: {
          homePage: 'https://ke.moodle.haski.app',
          name: '103',
        },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/failed',
        display: { en: 'failed' },
      },
      object: {
        id: 'https://ke.moodle.haski.app/mod/quiz/view.php?id=123',
      },
      result: {
        score: {
          scaled: 0.45,
          raw: 45,
          min: 0,
          max: 100,
        },
        success: false,
        completion: true,
      },
      timestamp: '2024-11-10T11:30:00.000Z',
    } as xAPIStatement,

    // Engagement: Long duration activity
    {
      id: '00000000-0000-0000-0000-000000000007',
      actor: {
        account: {
          homePage: 'https://ke.haski.app',
          name: '103',
        },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/experienced',
        display: { en: 'experienced' },
      },
      object: {
        id: 'https://ke.haski.app/module/42/video/1',
      },
      context: {
        platform: 'Frontend',
        language: 'en',
      },
      result: {
        duration: 'PT1H30M', // 1 hour 30 minutes
      },
      timestamp: '2024-11-10T12:00:00.000Z',
    } as xAPIStatement,

    // Course completion: Second learner
    {
      id: '00000000-0000-0000-0000-000000000008',
      actor: {
        account: {
          homePage: 'https://ke.moodle.haski.app',
          name: '102',
        },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/completed',
        display: { en: 'completed' },
      },
      object: {
        id: 'https://ke.moodle.haski.app/course/view.php?id=42',
      },
      context: {
        platform: 'Moodle',
        language: 'en',
      },
      timestamp: '2024-11-10T15:00:00.000Z',
    } as xAPIStatement,

    // Engagement: Multiple clicks
    {
      id: '00000000-0000-0000-0000-000000000009',
      actor: {
        account: {
          homePage: 'https://ke.haski.app',
          name: '101',
        },
      },
      verb: {
        id: 'https://wiki.haski.app/variables/xapi.clicked',
        display: { en: 'clicked' },
      },
      object: {
        id: 'https://ke.haski.app/module/42/button/next',
      },
      result: {
        duration: 'PT2M',
      },
      timestamp: '2024-11-10T13:00:00.000Z',
    } as xAPIStatement,

    // Additional engagement
    {
      id: '00000000-0000-0000-0000-000000000010',
      actor: {
        account: {
          homePage: 'https://ke.haski.app',
          name: '102',
        },
      },
      verb: {
        id: 'http://activitystrea.ms/schema/1.0/open',
        display: { en: 'opened' },
      },
      object: {
        id: 'https://ke.haski.app/module/42/topic/2',
      },
      result: {
        duration: 'PT20M',
      },
      timestamp: '2024-11-10T14:00:00.000Z',
    } as xAPIStatement,
  ];

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        CourseCompletionProvider,
        LearningEngagementProvider,
        TopicMasteryProvider,
      ],
    }).compile();

    courseCompletionProvider = moduleFixture.get<CourseCompletionProvider>(
      CourseCompletionProvider,
    );
    learningEngagementProvider = moduleFixture.get<LearningEngagementProvider>(
      LearningEngagementProvider,
    );
    topicMasteryProvider =
      moduleFixture.get<TopicMasteryProvider>(TopicMasteryProvider);
  });

  describe('CourseCompletionProvider with realistic data', () => {
    it('should calculate course completion rate correctly', async () => {
      const params = { courseId: 'course-42' };

      const result = await courseCompletionProvider.compute(
        params,
        sampleStatements,
      );

      // 2 completed (user 101, 102) out of 3 total learners (101, 102, 103) = 66.67%
      expect(result.metricId).toBe('course-completion');
      expect(result.value).toBeCloseTo(66.67, 1);
      expect(result.metadata?.totalLearners).toBe(3);
      expect(result.metadata?.completedLearners).toBe(2);
      expect(result.metadata?.unit).toBe('percentage');
    });

    it('should handle date filtering', async () => {
      const params = {
        courseId: 'course-42',
        since: '2024-11-10T14:00:00.000Z',
        until: '2024-11-10T16:00:00.000Z',
      };

      // This should still work with validation
      courseCompletionProvider.validateParams(params);
      const result = await courseCompletionProvider.compute(
        params,
        sampleStatements,
      );

      expect(result.metadata?.timeRange).toEqual({
        since: '2024-11-10T14:00:00.000Z',
        until: '2024-11-10T16:00:00.000Z',
      });
    });
  });

  describe('LearningEngagementProvider with realistic data', () => {
    it('should calculate engagement score from activities', async () => {
      const params = { courseId: 'course-42' };

      const result = await learningEngagementProvider.compute(
        params,
        sampleStatements,
      );

      expect(result.metricId).toBe('learning-engagement');
      expect(result.value).toBeGreaterThan(0);
      expect(result.metadata?.activityCount).toBeGreaterThan(0);
      expect(result.metadata?.totalDurationMinutes).toBeGreaterThan(0);
      expect(result.metadata?.unit).toBe('score');
    });

    it('should parse durations correctly from statements', async () => {
      const params = { courseId: 'course-42' };

      const result = await learningEngagementProvider.compute(
        params,
        sampleStatements,
      );

      // Total duration should include:
      // - PT15M30S = 15.5 min
      // - PT5M = 5 min
      // - PT1H30M = 90 min
      // - PT2M = 2 min
      // - PT20M = 20 min
      // Total = 132.5 minutes
      expect(result.metadata?.totalDurationMinutes).toBeCloseTo(132.5, 1);
    });

    it('should support topic-level filtering', async () => {
      const params = { courseId: 'course-42', topicId: 'topic-1' };

      learningEngagementProvider.validateParams(params);
      const result = await learningEngagementProvider.compute(
        params,
        sampleStatements,
      );

      expect(result.metadata?.topicId).toBe('topic-1');
    });
  });

  describe('TopicMasteryProvider with realistic data', () => {
    it('should calculate topic mastery from quiz scores', async () => {
      const params = { courseId: 'course-42', topicId: 'topic-1' };

      const result = await topicMasteryProvider.compute(
        params,
        sampleStatements,
      );

      expect(result.metricId).toBe('topic-mastery');
      // Average of 85, 92, 45 = 74
      expect(result.value).toBeCloseTo(74, 0);
      expect(result.metadata?.attemptCount).toBe(3);
      expect(result.metadata?.avgScore).toBeCloseTo(74, 0);
      expect(result.metadata?.unit).toBe('score');
    });

    it('should track success rate correctly', async () => {
      const params = { courseId: 'course-42', topicId: 'topic-1' };

      const result = await topicMasteryProvider.compute(
        params,
        sampleStatements,
      );

      // 2 success out of 3 attempts = 0.6667
      expect(result.metadata?.successCount).toBe(2);
      expect(result.metadata?.successRate).toBeCloseTo(0.6667, 4);
    });

    it('should require both courseId and topicId', () => {
      expect(() =>
        topicMasteryProvider.validateParams({ courseId: 'course-42' }),
      ).toThrow('topicId is required');

      expect(() =>
        topicMasteryProvider.validateParams({ topicId: 'topic-1' }),
      ).toThrow('courseId is required');

      expect(() =>
        topicMasteryProvider.validateParams({
          courseId: 'course-42',
          topicId: 'topic-1',
        }),
      ).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty statement arrays', async () => {
      const emptyStatements: xAPIStatement[] = [];

      const completionResult = await courseCompletionProvider.compute(
        { courseId: 'course-42' },
        emptyStatements,
      );
      expect(completionResult.value).toBe(0);

      const engagementResult = await learningEngagementProvider.compute(
        { courseId: 'course-42' },
        emptyStatements,
      );
      expect(engagementResult.value).toBe(0);

      const masteryResult = await topicMasteryProvider.compute(
        { courseId: 'course-42', topicId: 'topic-1' },
        emptyStatements,
      );
      expect(masteryResult.value).toBe(0);
    });

    it('should handle statements without results', async () => {
      const statementsWithoutResults: xAPIStatement[] = [
        {
          actor: {
            account: { homePage: 'https://example.com', name: 'user1' },
          },
          verb: { id: 'https://wiki.haski.app/variables/xapi.viewed' },
          object: { id: 'activity-1' },
        } as xAPIStatement,
      ];

      const result = await learningEngagementProvider.compute(
        { courseId: 'course-42' },
        statementsWithoutResults,
      );

      // Should still count activities even without duration
      expect(result.metadata?.activityCount).toBe(1);
      expect(result.metadata?.totalDurationMinutes).toBe(0);
    });
  });

  describe('Cross-Provider Consistency', () => {
    it('should all implement IMetricComputation interface', () => {
      const providers = [
        courseCompletionProvider,
        learningEngagementProvider,
        topicMasteryProvider,
      ];

      providers.forEach((provider) => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('dashboardLevel');
        expect(provider).toHaveProperty('description');
        expect(provider).toHaveProperty('version');
        expect(typeof provider.compute).toBe('function');
        expect(typeof provider.validateParams).toBe('function');
      });
    });

    it('should all return consistent MetricResult structure', async () => {
      const results = await Promise.all([
        courseCompletionProvider.compute(
          { courseId: 'course-42' },
          sampleStatements,
        ),
        learningEngagementProvider.compute(
          { courseId: 'course-42' },
          sampleStatements,
        ),
        topicMasteryProvider.compute(
          { courseId: 'course-42', topicId: 'topic-1' },
          sampleStatements,
        ),
      ]);

      results.forEach((result) => {
        expect(result).toHaveProperty('metricId');
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('computed');
        expect(result).toHaveProperty('metadata');
        expect(typeof result.value).toBe('number');
        expect(result.computed).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
      });
    });

    it('should all be stateless (no side effects)', async () => {
      const params = { courseId: 'course-42', topicId: 'topic-1' };
      const paramsCopy = { ...params };
      const statementsCopy = JSON.parse(JSON.stringify(sampleStatements));

      await Promise.all([
        courseCompletionProvider.compute(params, sampleStatements),
        learningEngagementProvider.compute(params, sampleStatements),
        topicMasteryProvider.compute(params, sampleStatements),
      ]);

      // Verify no mutations
      expect(params).toEqual(paramsCopy);
      expect(sampleStatements).toEqual(statementsCopy);
    });
  });
});
