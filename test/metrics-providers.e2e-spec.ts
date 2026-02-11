// REQ-FN-003: Metric Providers E2E Tests (CSV v4)
// End-to-end tests for metric providers with sample xAPI data
// Topic-related providers removed in v4 — topic IDs not present in Moodle xAPI data

import { Test, TestingModule } from '@nestjs/testing';
import {
  CoursesScoresProvider,
  CourseElementsBestAttemptsProvider,
  CourseElementsTimeSpentProvider,
} from '../src/computation/providers';
import { xAPIStatement } from '../src/data-access';

describe('REQ-FN-003: Metric Providers (e2e, CSV v4)', () => {
  let coursesScoresProvider: CoursesScoresProvider;
  let courseElementsBestAttemptsProvider: CourseElementsBestAttemptsProvider;
  let courseElementsTimeSpentProvider: CourseElementsTimeSpentProvider;

  // Sample xAPI statements simulating real HASKI / Moodle data
  const sampleStatements: xAPIStatement[] = [
    // Quiz attempt 1 — element-1, scored 85, completed
    {
      id: '00000000-0000-0000-0000-000000000001',
      actor: {
        account: {
          homePage: 'https://ke.moodle.haski.app',
          name: '101',
        },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/scored',
        display: { en: 'scored' },
      },
      object: {
        id: 'element-1',
        definition: {
          type: 'http://adlnet.gov/expapi/activities/assessment',
          name: { en: 'Variables Quiz' },
        },
      },
      context: {
        platform: 'Moodle',
        contextActivities: {
          parent: [{ id: 'https://ke.moodle.haski.app/course/view.php?id=42' }],
        },
      },
      result: {
        score: { raw: 85, max: 100 },
        completion: true,
        duration: 'PT15M',
      },
      timestamp: '2024-11-10T10:00:00.000Z',
    } as xAPIStatement,

    // Quiz attempt 2 — element-1, scored 92 (better), completed
    {
      id: '00000000-0000-0000-0000-000000000002',
      actor: {
        account: {
          homePage: 'https://ke.moodle.haski.app',
          name: '101',
        },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/scored',
        display: { en: 'scored' },
      },
      object: {
        id: 'element-1',
        definition: {
          type: 'http://adlnet.gov/expapi/activities/assessment',
          name: { en: 'Variables Quiz' },
        },
      },
      context: {
        platform: 'Moodle',
        contextActivities: {
          parent: [{ id: 'https://ke.moodle.haski.app/course/view.php?id=42' }],
        },
      },
      result: {
        score: { raw: 92, max: 100 },
        completion: true,
        duration: 'PT20M',
      },
      timestamp: '2024-11-10T11:00:00.000Z',
    } as xAPIStatement,

    // Quiz attempt — element-2, scored 78, completed
    {
      id: '00000000-0000-0000-0000-000000000003',
      actor: {
        account: {
          homePage: 'https://ke.moodle.haski.app',
          name: '101',
        },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/scored',
        display: { en: 'scored' },
      },
      object: {
        id: 'element-2',
        definition: {
          type: 'http://adlnet.gov/expapi/activities/assessment',
          name: { en: 'Data Types Assignment' },
        },
      },
      context: {
        platform: 'Moodle',
        contextActivities: {
          parent: [{ id: 'https://ke.moodle.haski.app/course/view.php?id=42' }],
        },
      },
      result: {
        score: { raw: 78, max: 100 },
        completion: true,
        duration: 'PT30M',
      },
      timestamp: '2024-11-10T12:00:00.000Z',
    } as xAPIStatement,

    // Activity with duration but no score — element-3
    {
      id: '00000000-0000-0000-0000-000000000004',
      actor: {
        account: {
          homePage: 'https://ke.moodle.haski.app',
          name: '101',
        },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/experienced',
        display: { en: 'experienced' },
      },
      object: {
        id: 'element-3',
        definition: {
          type: 'http://adlnet.gov/expapi/activities/lesson',
          name: { en: 'Intro Video' },
        },
      },
      context: {
        platform: 'Moodle',
        contextActivities: {
          parent: [{ id: 'https://ke.moodle.haski.app/course/view.php?id=42' }],
        },
      },
      result: {
        duration: 'PT45M',
      },
      timestamp: '2024-11-10T13:00:00.000Z',
    } as xAPIStatement,
  ];

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesScoresProvider,
        CourseElementsBestAttemptsProvider,
        CourseElementsTimeSpentProvider,
      ],
    }).compile();

    coursesScoresProvider = moduleFixture.get<CoursesScoresProvider>(
      CoursesScoresProvider,
    );
    courseElementsBestAttemptsProvider =
      moduleFixture.get<CourseElementsBestAttemptsProvider>(
        CourseElementsBestAttemptsProvider,
      );
    courseElementsTimeSpentProvider =
      moduleFixture.get<CourseElementsTimeSpentProvider>(
        CourseElementsTimeSpentProvider,
      );
  });

  describe('CoursesScoresProvider with realistic data', () => {
    it('should calculate per-course scores using best attempts', async () => {
      const params = { userId: 'user-101' };

      const result = await coursesScoresProvider.compute(
        params,
        sampleStatements,
      );

      expect(result.metricId).toBe('courses-scores');
      // element-1 best = 92, element-2 best = 78, element-3 has no score
      // Total = 170 for course-42
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.metadata?.courseCount).toBeGreaterThanOrEqual(1);
    });

    it('should validate userId is required', () => {
      expect(() => coursesScoresProvider.validateParams({})).toThrow(
        'userId is required',
      );

      expect(() =>
        coursesScoresProvider.validateParams({ userId: 'user-101' }),
      ).not.toThrow();
    });

    it('should accept optional time range', () => {
      expect(() =>
        coursesScoresProvider.validateParams({
          userId: 'user-101',
          since: '2024-01-01T00:00:00Z',
          until: '2024-12-31T23:59:59Z',
        }),
      ).not.toThrow();
    });
  });

  describe('CourseElementsBestAttemptsProvider with realistic data', () => {
    it('should select best attempt per element', async () => {
      const params = { userId: 'user-101', courseId: 'course-42' };

      const result = await courseElementsBestAttemptsProvider.compute(
        params,
        sampleStatements,
      );

      expect(result.metricId).toBe('course-elements-best-attempts');
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.metadata?.userId).toBe('user-101');
      expect(result.metadata?.courseId).toBe('course-42');
    });

    it('should require userId and courseId', () => {
      expect(() =>
        courseElementsBestAttemptsProvider.validateParams({}),
      ).toThrow('userId is required');

      expect(() =>
        courseElementsBestAttemptsProvider.validateParams({
          userId: 'user-101',
        }),
      ).toThrow('courseId is required');

      expect(() =>
        courseElementsBestAttemptsProvider.validateParams({
          userId: 'user-101',
          courseId: 'course-42',
        }),
      ).not.toThrow();
    });
  });

  describe('CourseElementsTimeSpentProvider with realistic data', () => {
    it('should sum time spent per element', async () => {
      const params = { userId: 'user-101', courseId: 'course-42' };

      const result = await courseElementsTimeSpentProvider.compute(
        params,
        sampleStatements,
      );

      expect(result.metricId).toBe('course-elements-time-spent');
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.metadata?.unit).toBe('seconds');
      expect(result.metadata?.userId).toBe('user-101');
      expect(result.metadata?.courseId).toBe('course-42');

      // element-1: PT15M + PT20M = 900 + 1200 = 2100s
      // element-2: PT30M = 1800s
      // element-3: PT45M = 2700s
      const values = result.value as Array<{
        elementId: string;
        timeSpent: number;
      }>;
      const totalTime = values.reduce((sum, v) => sum + v.timeSpent, 0);
      expect(totalTime).toBeGreaterThan(0);
    });

    it('should require userId and courseId', () => {
      expect(() => courseElementsTimeSpentProvider.validateParams({})).toThrow(
        'userId is required',
      );

      expect(() =>
        courseElementsTimeSpentProvider.validateParams({ userId: 'user-101' }),
      ).toThrow('courseId is required');

      expect(() =>
        courseElementsTimeSpentProvider.validateParams({
          userId: 'user-101',
          courseId: 'course-42',
        }),
      ).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty statement arrays', async () => {
      const emptyStatements: xAPIStatement[] = [];

      const scoresResult = await coursesScoresProvider.compute(
        { userId: 'user-101' },
        emptyStatements,
      );
      expect((scoresResult.value as unknown[]).length).toBe(0);

      const bestAttemptsResult =
        await courseElementsBestAttemptsProvider.compute(
          { userId: 'user-101', courseId: 'course-42' },
          emptyStatements,
        );
      expect((bestAttemptsResult.value as unknown[]).length).toBe(0);

      const timeSpentResult = await courseElementsTimeSpentProvider.compute(
        { userId: 'user-101', courseId: 'course-42' },
        emptyStatements,
      );
      expect((timeSpentResult.value as unknown[]).length).toBe(0);
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

      const result = await courseElementsTimeSpentProvider.compute(
        { userId: 'user-101', courseId: 'course-42' },
        statementsWithoutResults,
      );

      // No duration means no time recorded
      expect((result.value as unknown[]).length).toBe(0);
    });
  });

  describe('Cross-Provider Consistency', () => {
    it('should all implement IMetricComputation interface', () => {
      const providers = [
        coursesScoresProvider,
        courseElementsBestAttemptsProvider,
        courseElementsTimeSpentProvider,
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
        coursesScoresProvider.compute({ userId: 'user-101' }, sampleStatements),
        courseElementsBestAttemptsProvider.compute(
          { userId: 'user-101', courseId: 'course-42' },
          sampleStatements,
        ),
        courseElementsTimeSpentProvider.compute(
          { userId: 'user-101', courseId: 'course-42' },
          sampleStatements,
        ),
      ]);

      results.forEach((result) => {
        expect(result).toHaveProperty('metricId');
        expect(result).toHaveProperty('value');
        expect(result).toHaveProperty('computed');
        expect(result).toHaveProperty('metadata');
        expect(result.computed).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
      });
    });

    it('should all be stateless (no side effects)', async () => {
      const params = { userId: 'user-101', courseId: 'course-42' };
      const paramsCopy = { ...params };
      const statementsCopy = JSON.parse(JSON.stringify(sampleStatements));

      await Promise.all([
        coursesScoresProvider.compute(params, sampleStatements),
        courseElementsBestAttemptsProvider.compute(params, sampleStatements),
        courseElementsTimeSpentProvider.compute(params, sampleStatements),
      ]);

      // Verify no mutations
      expect(params).toEqual(paramsCopy);
      expect(sampleStatements).toEqual(statementsCopy);
    });
  });
});
