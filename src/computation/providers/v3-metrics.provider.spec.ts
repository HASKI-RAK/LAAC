// Unit tests for CSV v3 metric providers (REQ-FN-032)

import { CoursesScoresProvider } from './courses-scores.provider';
import { CoursesMaxScoresProvider } from './courses-max-scores.provider';
import { CoursesTimeSpentProvider } from './courses-time-spent.provider';
import { UserLastElementsProvider } from './user-last-elements.provider';
import { CourseTopicsScoresProvider } from './course-topics-scores.provider';
import { CourseTopicsMaxScoresProvider } from './course-topics-max-scores.provider';
import { CourseTopicsTimeSpentProvider } from './course-topics-time-spent.provider';
import { TopicElementsBestAttemptsProvider } from './topic-elements-best-attempts.provider';
import { TopicElementsMaxScoresProvider } from './topic-elements-max-scores.provider';
import { TopicElementsTimeSpentProvider } from './topic-elements-time-spent.provider';
import { xAPIStatement } from '../../data-access';

// Helper functions for creating test statements
const courseIri = (courseId: string) =>
  `https://lms.example.com/course/${courseId}`;
const topicIri = (topicId: string) =>
  `https://lms.example.com/topic/${topicId}`;

const createStatement = (
  elementId: string,
  options: {
    courseId?: string;
    topicId?: string;
    score?: number;
    maxScore?: number;
    duration?: string;
    completed?: boolean;
    timestamp?: string;
  },
): xAPIStatement => {
  const parents: Array<{ id: string }> = [];
  const groupings: Array<{ id: string }> = [];

  if (options.courseId) {
    groupings.push({ id: courseIri(options.courseId) });
    parents.push({ id: courseIri(options.courseId) });
  }
  if (options.topicId) {
    parents.push({ id: topicIri(options.topicId) });
  }

  return {
    actor: {
      account: { name: 'user-1', homePage: 'https://moodle.example.com' },
    },
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { 'en-US': 'completed' },
    },
    object: {
      id: elementId,
      definition: { type: 'http://adlnet.gov/expapi/activities/assessment' },
    },
    context: {
      contextActivities: {
        parent: parents,
        grouping: groupings,
      },
    },
    result: {
      score:
        options.score !== undefined || options.maxScore !== undefined
          ? {
              raw: options.score,
              max: options.maxScore,
            }
          : undefined,
      duration: options.duration,
      completion: options.completed,
    },
    timestamp: options.timestamp ?? '2026-02-01T10:00:00Z',
  };
};

// ============ CoursesScoresProvider Tests ============
describe('CoursesScoresProvider (REQ-FN-032, CSV v3)', () => {
  let provider: CoursesScoresProvider;

  beforeEach(() => {
    provider = new CoursesScoresProvider();
  });

  describe('metadata', () => {
    it('should expose CSV v3 metadata', () => {
      expect(provider.id).toBe('courses-scores');
      expect(provider.dashboardLevel).toBe('course');
      expect(provider.version).toBe('3.0.0');
      expect(provider.outputType).toBe('array');
      expect(provider.requiredParams).toEqual(['userId']);
      expect(provider.optionalParams).toEqual(['since', 'until']);
    });
  });

  describe('compute', () => {
    it('should sum best-attempt scores per element and aggregate per course', async () => {
      const statements: xAPIStatement[] = [
        createStatement('element-A', { courseId: 'course-1', score: 10 }),
        createStatement('element-A', {
          courseId: 'course-1',
          score: 30,
          timestamp: '2026-02-02T10:00:00Z',
        }), // best
        createStatement('element-B', { courseId: 'course-1', score: 5 }),
        createStatement('element-C', { courseId: 'course-2', score: 50 }),
      ];

      const result = await provider.compute({ userId: 'user-1' }, statements);

      expect(result.metricId).toBe('courses-scores');
      expect(result.value).toEqual([
        { courseId: 'course-1', score: 35 }, // 30 + 5
        { courseId: 'course-2', score: 50 },
      ]);
      expect(result.metadata).toMatchObject({ courseCount: 2 });
    });

    it('should return empty array for no data', async () => {
      const result = await provider.compute({ userId: 'user-1' }, []);
      expect(result.value).toEqual([]);
    });
  });

  describe('validateParams', () => {
    it('should throw if userId is missing', () => {
      expect(() => provider.validateParams({})).toThrow(
        'userId is required for courses-scores metric',
      );
    });

    it('should throw if since is after until', () => {
      expect(() =>
        provider.validateParams({
          userId: 'user-1',
          since: '2026-02-10T00:00:00Z',
          until: '2026-02-01T00:00:00Z',
        }),
      ).toThrow('since timestamp must be before until timestamp');
    });
  });
});

// ============ CoursesMaxScoresProvider Tests ============
describe('CoursesMaxScoresProvider (REQ-FN-032, CSV v3)', () => {
  let provider: CoursesMaxScoresProvider;

  beforeEach(() => {
    provider = new CoursesMaxScoresProvider();
  });

  describe('metadata', () => {
    it('should expose CSV v3 metadata', () => {
      expect(provider.id).toBe('courses-max-scores');
      expect(provider.version).toBe('3.0.0');
      expect(provider.requiredParams).toEqual(['userId']);
    });
  });

  describe('compute', () => {
    it('should sum max scores per element and aggregate per course', async () => {
      const statements: xAPIStatement[] = [
        createStatement('element-A', { courseId: 'course-1', maxScore: 100 }),
        createStatement('element-B', { courseId: 'course-1', maxScore: 50 }),
        createStatement('element-C', { courseId: 'course-2', maxScore: 75 }),
      ];

      const result = await provider.compute({ userId: 'user-1' }, statements);

      expect(result.metricId).toBe('courses-max-scores');
      expect(result.value).toEqual([
        { courseId: 'course-1', maxScore: 150 },
        { courseId: 'course-2', maxScore: 75 },
      ]);
    });
  });
});

// ============ CoursesTimeSpentProvider Tests ============
describe('CoursesTimeSpentProvider (REQ-FN-032, CSV v3)', () => {
  let provider: CoursesTimeSpentProvider;

  beforeEach(() => {
    provider = new CoursesTimeSpentProvider();
  });

  describe('metadata', () => {
    it('should expose CSV v3 metadata', () => {
      expect(provider.id).toBe('courses-time-spent');
      expect(provider.version).toBe('3.0.0');
    });
  });

  describe('compute', () => {
    it('should sum time across all attempts per course', async () => {
      const statements: xAPIStatement[] = [
        createStatement('element-A', {
          courseId: 'course-1',
          duration: 'PT30M',
        }),
        createStatement('element-A', {
          courseId: 'course-1',
          duration: 'PT15M',
        }),
        createStatement('element-B', {
          courseId: 'course-2',
          duration: 'PT1H',
        }),
      ];

      const result = await provider.compute({ userId: 'user-1' }, statements);

      expect(result.metricId).toBe('courses-time-spent');
      expect(result.value).toEqual([
        { courseId: 'course-1', timeSpent: 2700 }, // 30*60 + 15*60
        { courseId: 'course-2', timeSpent: 3600 },
      ]);
      expect(result.metadata).toMatchObject({ unit: 'seconds' });
    });
  });
});

// ============ UserLastElementsProvider Tests ============
describe('UserLastElementsProvider (REQ-FN-032, CSV v3)', () => {
  let provider: UserLastElementsProvider;

  beforeEach(() => {
    provider = new UserLastElementsProvider();
  });

  describe('metadata', () => {
    it('should expose CSV v3 metadata', () => {
      expect(provider.id).toBe('user-last-elements');
      expect(provider.version).toBe('3.0.0');
    });
  });

  describe('compute', () => {
    it('should return last 3 completed elements across all courses', async () => {
      const statements: xAPIStatement[] = [
        createStatement('element-A', {
          courseId: 'course-1',
          completed: true,
          timestamp: '2026-02-01T10:00:00Z',
        }),
        createStatement('element-B', {
          courseId: 'course-2',
          completed: true,
          timestamp: '2026-02-02T10:00:00Z',
        }),
        createStatement('element-C', {
          courseId: 'course-1',
          completed: true,
          timestamp: '2026-02-03T10:00:00Z',
        }),
        createStatement('element-D', {
          courseId: 'course-2',
          completed: true,
          timestamp: '2026-02-04T10:00:00Z',
        }),
      ];

      const result = await provider.compute({ userId: 'user-1' }, statements);

      expect(result.metricId).toBe('user-last-elements');
      expect(result.value).toHaveLength(3);
      expect(result.value).toEqual([
        { elementId: 'element-D', completedAt: '2026-02-04T10:00:00Z' },
        { elementId: 'element-C', completedAt: '2026-02-03T10:00:00Z' },
        { elementId: 'element-B', completedAt: '2026-02-02T10:00:00Z' },
      ]);
    });

    it('should exclude non-completed elements', async () => {
      const statements: xAPIStatement[] = [
        createStatement('element-A', {
          courseId: 'course-1',
          completed: true,
          timestamp: '2026-02-01T10:00:00Z',
        }),
        createStatement('element-B', {
          courseId: 'course-1',
          completed: false,
        }),
      ];

      const result = await provider.compute({ userId: 'user-1' }, statements);
      expect(result.value).toHaveLength(1);
    });
  });
});

// ============ CourseTopicsScoresProvider Tests ============
describe('CourseTopicsScoresProvider (REQ-FN-032, CSV v3)', () => {
  let provider: CourseTopicsScoresProvider;

  beforeEach(() => {
    provider = new CourseTopicsScoresProvider();
  });

  describe('metadata', () => {
    it('should expose CSV v3 metadata', () => {
      expect(provider.id).toBe('course-topics-scores');
      expect(provider.dashboardLevel).toBe('topic');
      expect(provider.version).toBe('3.0.0');
      expect(provider.requiredParams).toEqual(['userId', 'courseId']);
    });
  });

  describe('compute', () => {
    it('should sum best-attempt scores per topic within the course', async () => {
      const statements: xAPIStatement[] = [
        createStatement('element-A', {
          courseId: 'course-1',
          topicId: 'topic-1',
          score: 20,
        }),
        createStatement('element-A', {
          courseId: 'course-1',
          topicId: 'topic-1',
          score: 30,
          timestamp: '2026-02-02T10:00:00Z',
        }), // best
        createStatement('element-B', {
          courseId: 'course-1',
          topicId: 'topic-2',
          score: 50,
        }),
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.metricId).toBe('course-topics-scores');
      expect(result.value).toEqual([
        { topicId: 'topic-1', score: 30 },
        { topicId: 'topic-2', score: 50 },
      ]);
    });
  });

  describe('validateParams', () => {
    it('should throw if courseId is missing', () => {
      expect(() => provider.validateParams({ userId: 'user-1' })).toThrow(
        'courseId is required for course-topics-scores metric',
      );
    });
  });
});

// ============ CourseTopicsMaxScoresProvider Tests ============
describe('CourseTopicsMaxScoresProvider (REQ-FN-032, CSV v3)', () => {
  let provider: CourseTopicsMaxScoresProvider;

  beforeEach(() => {
    provider = new CourseTopicsMaxScoresProvider();
  });

  describe('metadata', () => {
    it('should expose CSV v3 metadata', () => {
      expect(provider.id).toBe('course-topics-max-scores');
      expect(provider.dashboardLevel).toBe('topic');
      expect(provider.version).toBe('3.0.0');
      expect(provider.requiredParams).toEqual(['userId', 'courseId']);
    });
  });

  describe('compute', () => {
    it('should sum max scores per topic within the course', async () => {
      const statements: xAPIStatement[] = [
        createStatement('element-A', {
          courseId: 'course-1',
          topicId: 'topic-1',
          maxScore: 100,
        }),
        createStatement('element-B', {
          courseId: 'course-1',
          topicId: 'topic-1',
          maxScore: 50,
        }),
        createStatement('element-C', {
          courseId: 'course-1',
          topicId: 'topic-2',
          maxScore: 75,
        }),
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.metricId).toBe('course-topics-max-scores');
      expect(result.value).toEqual([
        { topicId: 'topic-1', maxScore: 150 },
        { topicId: 'topic-2', maxScore: 75 },
      ]);
    });
  });

  describe('validateParams', () => {
    it('should throw if courseId is missing', () => {
      expect(() => provider.validateParams({ userId: 'user-1' })).toThrow(
        'courseId is required for course-topics-max-scores metric',
      );
    });
  });
});

// ============ CourseTopicsTimeSpentProvider Tests ============
describe('CourseTopicsTimeSpentProvider (REQ-FN-032, CSV v3)', () => {
  let provider: CourseTopicsTimeSpentProvider;

  beforeEach(() => {
    provider = new CourseTopicsTimeSpentProvider();
  });

  describe('metadata', () => {
    it('should expose CSV v3 metadata', () => {
      expect(provider.id).toBe('course-topics-time-spent');
      expect(provider.dashboardLevel).toBe('topic');
      expect(provider.version).toBe('3.0.0');
      expect(provider.requiredParams).toEqual(['userId', 'courseId']);
    });
  });

  describe('compute', () => {
    it('should sum time per topic within the course', async () => {
      const statements: xAPIStatement[] = [
        createStatement('element-A', {
          courseId: 'course-1',
          topicId: 'topic-1',
          duration: 'PT15M',
        }),
        createStatement('element-B', {
          courseId: 'course-1',
          topicId: 'topic-1',
          duration: 'PT10M',
        }),
        createStatement('element-C', {
          courseId: 'course-1',
          topicId: 'topic-2',
          duration: 'PT30M',
        }),
      ];

      const result = await provider.compute(
        { userId: 'user-1', courseId: 'course-1' },
        statements,
      );

      expect(result.metricId).toBe('course-topics-time-spent');
      expect(result.value).toEqual([
        { topicId: 'topic-1', timeSpent: 1500 }, // 25 min
        { topicId: 'topic-2', timeSpent: 1800 }, // 30 min
      ]);
      expect(result.metadata).toMatchObject({ unit: 'seconds' });
    });
  });

  describe('validateParams', () => {
    it('should throw if courseId is missing', () => {
      expect(() => provider.validateParams({ userId: 'user-1' })).toThrow(
        'courseId is required for course-topics-time-spent metric',
      );
    });
  });
});

// ============ TopicElementsBestAttemptsProvider Tests ============
describe('TopicElementsBestAttemptsProvider (REQ-FN-032, CSV v3)', () => {
  let provider: TopicElementsBestAttemptsProvider;

  beforeEach(() => {
    provider = new TopicElementsBestAttemptsProvider();
  });

  describe('metadata', () => {
    it('should expose CSV v3 metadata', () => {
      expect(provider.id).toBe('topic-elements-best-attempts');
      expect(provider.dashboardLevel).toBe('element');
      expect(provider.version).toBe('3.0.0');
      expect(provider.requiredParams).toEqual(['userId', 'topicId']);
    });
  });

  describe('compute', () => {
    it('should return best attempt info for each element in topic', async () => {
      const statements: xAPIStatement[] = [
        createStatement('element-A', {
          topicId: 'topic-1',
          score: 70,
          completed: false,
          timestamp: '2026-02-01T10:00:00Z',
        }),
        createStatement('element-A', {
          topicId: 'topic-1',
          score: 85,
          completed: true,
          timestamp: '2026-02-02T10:00:00Z',
        }),
        createStatement('element-B', {
          topicId: 'topic-1',
          score: 60,
          completed: true,
          timestamp: '2026-02-01T11:00:00Z',
        }),
      ];

      const result = await provider.compute(
        { userId: 'user-1', topicId: 'topic-1' },
        statements,
      );

      expect(result.metricId).toBe('topic-elements-best-attempts');
      expect(result.value).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            elementId: 'element-A',
            score: 85,
            completionStatus: true,
          }),
          expect.objectContaining({
            elementId: 'element-B',
            score: 60,
            completionStatus: true,
          }),
        ]),
      );
    });
  });

  describe('validateParams', () => {
    it('should throw if topicId is missing', () => {
      expect(() => provider.validateParams({ userId: 'user-1' })).toThrow(
        'topicId is required for topic-elements-best-attempts metric',
      );
    });
  });
});

// ============ TopicElementsMaxScoresProvider Tests ============
describe('TopicElementsMaxScoresProvider (REQ-FN-032, CSV v3)', () => {
  let provider: TopicElementsMaxScoresProvider;

  beforeEach(() => {
    provider = new TopicElementsMaxScoresProvider();
  });

  describe('compute', () => {
    it('should return max score for each element in topic', async () => {
      const statements: xAPIStatement[] = [
        createStatement('element-A', { topicId: 'topic-1', maxScore: 100 }),
        createStatement('element-B', { topicId: 'topic-1', maxScore: 50 }),
      ];

      const result = await provider.compute(
        { userId: 'user-1', topicId: 'topic-1' },
        statements,
      );

      expect(result.value).toEqual([
        { elementId: 'element-A', score: 100 },
        { elementId: 'element-B', score: 50 },
      ]);
    });
  });
});

// ============ TopicElementsTimeSpentProvider Tests ============
describe('TopicElementsTimeSpentProvider (REQ-FN-032, CSV v3)', () => {
  let provider: TopicElementsTimeSpentProvider;

  beforeEach(() => {
    provider = new TopicElementsTimeSpentProvider();
  });

  describe('compute', () => {
    it('should sum time per element in topic', async () => {
      const statements: xAPIStatement[] = [
        createStatement('element-A', { topicId: 'topic-1', duration: 'PT10M' }),
        createStatement('element-A', { topicId: 'topic-1', duration: 'PT5M' }),
        createStatement('element-B', { topicId: 'topic-1', duration: 'PT20M' }),
      ];

      const result = await provider.compute(
        { userId: 'user-1', topicId: 'topic-1' },
        statements,
      );

      expect(result.value).toEqual([
        { elementId: 'element-A', timeSpent: 900 }, // 15 min
        { elementId: 'element-B', timeSpent: 1200 }, // 20 min
      ]);
    });
  });
});
