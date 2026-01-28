// Unit tests for CoursesTotalScoresProvider (REQ-FN-031, CSV v2 metric: courses-total-scores)

import { CoursesTotalScoresProvider } from './courses-total-scores.provider';
import { xAPIStatement } from '../../data-access';

const courseIri = (courseId: string) =>
  `https://lms.example.com/course/${courseId}`;

const scoredStatement = (
  courseId: string,
  elementId: string,
  score: number,
  timestamp: string,
): xAPIStatement => ({
  actor: {
    account: { name: 'user-1', homePage: 'https://moodle.example.com' },
  },
  verb: {
    id: 'http://adlnet.gov/expapi/verbs/scored',
    display: { 'en-US': 'scored' },
  },
  object: {
    id: elementId,
    definition: { type: 'http://adlnet.gov/expapi/activities/assessment' },
  },
  context: {
    contextActivities: {
      parent: [{ id: courseIri(courseId) }],
      grouping: [{ id: courseIri(courseId) }],
    },
  },
  result: { score: { raw: score, max: 100 } },
  timestamp,
});

describe('CoursesTotalScoresProvider (REQ-FN-031, CSV v2)', () => {
  let provider: CoursesTotalScoresProvider;

  beforeEach(() => {
    provider = new CoursesTotalScoresProvider();
  });

  describe('metadata', () => {
    it('should expose CSV v2 metadata', () => {
      expect(provider.id).toBe('courses-total-scores');
      expect(provider.dashboardLevel).toBe('course');
      expect(provider.description).toBe(
        'Total scores earned by a student in each course',
      );
      expect(provider.version).toBe('2.0.0');
      expect(provider.outputType).toBe('array');
      expect(provider.requiredParams).toEqual(['userId']);
      expect(provider.optionalParams).toEqual(['since', 'until']);
    });
  });

  describe('compute', () => {
    it('should sum best-attempt scores per element and aggregate per course', async () => {
      const statements: xAPIStatement[] = [
        scoredStatement('course-1', 'element-A', 10, '2026-01-01T10:00:00Z'),
        scoredStatement('course-1', 'element-A', 30, '2026-01-02T10:00:00Z'), // best attempt for element-A
        scoredStatement('course-1', 'element-B', 5, '2026-01-03T10:00:00Z'),
        scoredStatement('course-2', 'element-C', 50, '2026-01-01T11:00:00Z'),
        scoredStatement('course-2', 'element-C', 60, '2026-01-02T11:00:00Z'), // best attempt for element-C
        // Course with statements but no scores
        {
          ...scoredStatement(
            'course-3',
            'element-D',
            0,
            '2026-01-01T12:00:00Z',
          ),
          result: undefined,
        },
        // Statement without course context should be ignored
        {
          ...scoredStatement(
            'ignored-course',
            'element-X',
            99,
            '2026-01-04T10:00:00Z',
          ),
          context: undefined,
        },
      ];

      const result = await provider.compute({ userId: 'user-1' }, statements);

      expect(result.metricId).toBe('courses-total-scores');
      expect(result.value).toEqual([
        { courseId: 'course-1', totalScore: 35 },
        { courseId: 'course-2', totalScore: 60 },
        { courseId: 'course-3', totalScore: 0 },
      ]);
      expect(result.metadata).toMatchObject({
        courseCount: 3,
        userId: 'user-1',
      });
      expect(result.computed).toBeDefined();
    });

    it('should include time range metadata when provided', async () => {
      const result = await provider.compute(
        {
          userId: 'user-1',
          since: '2026-01-01T00:00:00Z',
          until: '2026-01-31T23:59:59Z',
        },
        [],
      );

      expect(result.metadata?.timeRange).toEqual({
        since: '2026-01-01T00:00:00Z',
        until: '2026-01-31T23:59:59Z',
      });
    });
  });

  describe('validateParams', () => {
    it('should require userId', () => {
      expect(() => provider.validateParams({})).toThrow(
        'userId is required for courses-total-scores metric',
      );
    });

    it('should validate time range ordering', () => {
      expect(() =>
        provider.validateParams({
          userId: 'user-1',
          since: '2026-02-01T00:00:00Z',
          until: '2026-01-01T00:00:00Z',
        }),
      ).toThrow('since timestamp must be before until timestamp');
    });

    it('should accept valid params', () => {
      expect(() => provider.validateParams({ userId: 'user-1' })).not.toThrow();
      expect(() =>
        provider.validateParams({
          userId: 'user-1',
          since: '2026-01-01T00:00:00Z',
          until: '2026-02-01T00:00:00Z',
        }),
      ).not.toThrow();
    });
  });
});
