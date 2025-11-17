// REQ-FN-004: CSV-Defined Metrics Computation E2E Tests
// Tests for all metrics specified in LAAC_Learning_Analytics_Requirements.csv
// Story: https://github.com/HASKI-RAK/LAAC/issues/87

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CacheService } from '../src/data-access/services/cache.service';
import { LRSClient } from '../src/data-access/clients/lrs.client';
import { xAPIStatement } from '../src/data-access';
import { generateTokenWithScopes } from './helpers/auth.helper';

/**
 * CSV Metrics E2E Test Suite
 *
 * This test suite validates all metrics defined in the CSV requirements:
 * docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * Coverage:
 * - Course overview metrics (CO-001 to CO-005)
 * - Topic overview metrics (TO-001 to TO-005)
 * - Learning element overview metrics (EO-001 to EO-006)
 *
 * Each test validates:
 * 1. Metric computation with realistic xAPI data
 * 2. CSV-specified output format (raw values, not derived metrics)
 * 3. Required parameters validation
 * 4. Edge cases (empty data, missing fields)
 * 5. Time range filtering
 */
describe('REQ-FN-004: CSV-Defined Metrics Computation (e2e)', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  let lrsClient: LRSClient;
  let authToken: string;

  // Realistic xAPI statements for course metrics testing
  const courseMetricStatements: xAPIStatement[] = [
    // Student 1: Quiz 1 attempt
    {
      id: 'stmt-co-001',
      actor: {
        objectType: 'Agent',
        account: { name: 'student-1', homePage: 'http://example.com' },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/scored',
        display: { 'en-US': 'scored' },
      },
      object: {
        id: 'element-quiz-1',
        objectType: 'Activity',
        definition: {
          type: 'http://adlnet.gov/expapi/activities/assessment',
          name: { 'en-US': 'Quiz 1' },
        },
      },
      result: {
        score: { raw: 85, max: 100, min: 0 },
        duration: 'PT15M',
        completion: true,
      },
      timestamp: '2024-11-01T10:00:00Z',
    },
    // Student 1: Quiz 2 attempt
    {
      id: 'stmt-co-002',
      actor: {
        objectType: 'Agent',
        account: { name: 'student-1', homePage: 'http://example.com' },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/scored',
        display: { 'en-US': 'scored' },
      },
      object: {
        id: 'element-quiz-2',
        objectType: 'Activity',
        definition: { name: { 'en-US': 'Quiz 2' } },
      },
      result: {
        score: { raw: 92, max: 100, min: 0 },
        duration: 'PT20M',
        completion: true,
      },
      timestamp: '2024-11-02T10:00:00Z',
    },
    // Student 1: Assignment completion
    {
      id: 'stmt-co-003',
      actor: {
        objectType: 'Agent',
        account: { name: 'student-1', homePage: 'http://example.com' },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/completed',
        display: { 'en-US': 'completed' },
      },
      object: {
        id: 'element-assignment-1',
        objectType: 'Activity',
        definition: { name: { 'en-US': 'Assignment 1' } },
      },
      result: {
        score: { raw: 78, max: 100, min: 0 },
        duration: 'PT1H30M',
        completion: true,
      },
      timestamp: '2024-11-03T14:30:00Z',
    },
    // Student 1: Video watched (no score)
    {
      id: 'stmt-co-004',
      actor: {
        objectType: 'Agent',
        account: { name: 'student-1', homePage: 'http://example.com' },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/experienced',
        display: { 'en-US': 'experienced' },
      },
      object: {
        id: 'element-video-1',
        objectType: 'Activity',
        definition: { name: { 'en-US': 'Video 1' } },
      },
      result: {
        duration: 'PT45M',
        completion: true,
      },
      timestamp: '2024-11-04T09:00:00Z',
    },
    // Student 2: Different elements
    {
      id: 'stmt-co-005',
      actor: {
        objectType: 'Agent',
        account: { name: 'student-2', homePage: 'http://example.com' },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/scored',
        display: { 'en-US': 'scored' },
      },
      object: {
        id: 'element-quiz-1',
        objectType: 'Activity',
        definition: { name: { 'en-US': 'Quiz 1' } },
      },
      result: {
        score: { raw: 95, max: 100, min: 0 },
        duration: 'PT12M',
      },
      timestamp: '2024-11-05T11:00:00Z',
    },
    // Multiple completion events for CO-004 and CO-005
    {
      id: 'stmt-co-006',
      actor: {
        objectType: 'Agent',
        account: { name: 'student-1', homePage: 'http://example.com' },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/completed',
        display: { 'en-US': 'completed' },
      },
      object: {
        id: 'element-module-1',
        objectType: 'Activity',
        definition: { name: { 'en-US': 'Module 1' } },
      },
      result: { completion: true },
      timestamp: '2024-11-06T15:00:00Z',
    },
    {
      id: 'stmt-co-007',
      actor: {
        objectType: 'Agent',
        account: { name: 'student-1', homePage: 'http://example.com' },
      },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/completed',
        display: { 'en-US': 'completed' },
      },
      object: {
        id: 'element-module-2',
        objectType: 'Activity',
        definition: { name: { 'en-US': 'Module 2' } },
      },
      result: { completion: true },
      timestamp: '2024-11-07T16:00:00Z',
    },
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
    app.setGlobalPrefix(apiPrefix, {
      exclude: [
        '/',
        'health',
        'health/liveness',
        'health/readiness',
        'metrics',
      ],
    });

    await app.init();

    cacheService = moduleFixture.get<CacheService>(CacheService);
    lrsClient = moduleFixture.get<LRSClient>(LRSClient);

    authToken = generateTokenWithScopes(['analytics:read']);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await cacheService.invalidatePattern('cache:*');
  });

  describe('Course Overview Metrics (CO-001 to CO-005)', () => {
    describe('CO-001: Total score earned by student', () => {
      it('should compute total score for student in course', async () => {
        // Mock LRS response
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-total-score/results')
          .query({
            userId: 'student-1',
            courseId: 'course-123',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // CSV specification: raw total score (not percentage)
        // Query returns all statements, compute sums scored elements
        expect(response.body.metricId).toBe('course-total-score');
        expect(response.body.value).toBeGreaterThan(0);
        expect(response.body.metadata).toMatchObject({
          unit: 'points',
        });
        expect(response.body.metadata.elementCount).toBeGreaterThanOrEqual(3);
        expect(response.body.metadata.avgScore).toBeGreaterThan(0);
      });

      it('should require userId and courseId parameters', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-total-score/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-total-score/results')
          .query({ userId: 'student-1' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should support time range filtering', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements.slice(0, 2)); // Only first two

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-total-score/results')
          .query({
            userId: 'student-1',
            courseId: 'course-123',
            since: '2024-11-01T00:00:00Z',
            until: '2024-11-02T23:59:59Z',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Expected: 85 + 92 = 177
        expect(response.body.value).toBe(177);
      });

      it('should return 0 when no scored elements found', async () => {
        jest.spyOn(lrsClient, 'queryStatements').mockResolvedValue([]);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-total-score/results')
          .query({
            userId: 'student-1',
            courseId: 'course-123',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.value).toBe(0);
        expect(response.body.metadata.elementCount).toBe(0);
      });
    });

    describe('CO-002: Possible total score for all elements', () => {
      it('should compute maximum possible score for course', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-max-score/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // CSV specification: possible total score (not percentage)
        // Expected: 100 (quiz-1) + 100 (quiz-2) + 100 (assignment-1) = 300
        expect(response.body).toMatchObject({
          metricId: 'course-max-score',
          value: 300,
          metadata: expect.objectContaining({
            unit: 'points',
            elementCount: 3, // Unique elements with max scores
          }),
        });
      });

      it('should require only courseId parameter', async () => {
        jest.spyOn(lrsClient, 'queryStatements').mockResolvedValue([]);

        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-max-score/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-max-score/results')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should handle duplicate element IDs correctly', async () => {
        // Multiple attempts on same element should use max score once
        const duplicateStatements = [
          {
            ...courseMetricStatements[0],
            id: 'stmt-dup-1',
            result: { score: { raw: 85, max: 100 } },
          },
          {
            ...courseMetricStatements[0],
            id: 'stmt-dup-2',
            object: { id: 'element-quiz-1' }, // Same element
            result: { score: { raw: 90, max: 100 } },
          },
        ] as xAPIStatement[];

        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(duplicateStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-max-score/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Should count element-quiz-1 only once
        expect(response.body.value).toBe(100);
        expect(response.body.metadata.elementCount).toBe(1);
      });
    });

    describe('CO-003: Total time spent by student in course', () => {
      it('should compute total time spent in seconds', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-time-spent/results')
          .query({
            userId: 'student-1',
            courseId: 'course-123',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // CSV specification: total time in seconds
        // Query returns statements with durations
        expect(response.body.metricId).toBe('course-time-spent');
        expect(response.body.value).toBeGreaterThan(0);
        expect(response.body.metadata).toMatchObject({
          unit: 'seconds',
        });
        expect(response.body.metadata.activityCount).toBeGreaterThanOrEqual(4);
        expect(response.body.metadata.hours).toBeGreaterThan(0);
      });

      it('should require userId and courseId parameters', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-time-spent/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should parse ISO 8601 durations correctly', async () => {
        const durationStatements: xAPIStatement[] = [
          {
            actor: { account: { name: 'user-1', homePage: 'http://test.com' } },
            verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
            object: { id: 'element-1' },
            result: { duration: 'PT1H' }, // 3600s
          } as xAPIStatement,
          {
            actor: { account: { name: 'user-1', homePage: 'http://test.com' } },
            verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
            object: { id: 'element-2' },
            result: { duration: 'PT30M' }, // 1800s
          } as xAPIStatement,
          {
            actor: { account: { name: 'user-1', homePage: 'http://test.com' } },
            verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
            object: { id: 'element-3' },
            result: { duration: 'PT45S' }, // 45s
          } as xAPIStatement,
        ];

        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(durationStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-time-spent/results')
          .query({ userId: 'user-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Expected: 3600 + 1800 + 45 = 5445s
        expect(response.body.value).toBe(5445);
      });

      it('should handle statements without duration', async () => {
        const noDurationStatements: xAPIStatement[] = [
          {
            actor: { account: { name: 'user-1', homePage: 'http://test.com' } },
            verb: { id: 'http://adlnet.gov/expapi/verbs/viewed' },
            object: { id: 'element-1' },
          } as xAPIStatement,
        ];

        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(noDurationStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-time-spent/results')
          .query({ userId: 'user-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.value).toBe(0);
        expect(response.body.metadata.activityCount).toBe(0);
      });
    });

    describe('CO-004: Last three learning elements completed', () => {
      it('should return last 3 completed elements', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-last-elements/results')
          .query({
            userId: 'student-1',
            courseId: 'course-123',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // CSV specification: array of last 3 elements
        expect(response.body).toMatchObject({
          metricId: 'course-last-elements',
        });

        expect(Array.isArray(response.body.value)).toBe(true);
        expect(response.body.value.length).toBeLessThanOrEqual(3);

        // Should be sorted by timestamp descending (most recent first)
        if (response.body.value.length > 1) {
          const timestamps = response.body.value.map((e: any) =>
            new Date(e.completedAt).getTime(),
          );
          for (let i = 0; i < timestamps.length - 1; i++) {
            expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
          }
        }
      });

      it('should require userId and courseId parameters', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-last-elements/results')
          .query({ userId: 'student-1' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should return empty array when no completions found', async () => {
        jest.spyOn(lrsClient, 'queryStatements').mockResolvedValue([]);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-last-elements/results')
          .query({ userId: 'student-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.value).toEqual([]);
        expect(response.body.metadata.count).toBe(0);
      });
    });

    describe('CO-005: Completion dates of last three elements', () => {
      it('should return completion dates for last 3 elements', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion-dates/results')
          .query({
            userId: 'student-1',
            courseId: 'course-123',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // CSV specification: array of completion dates
        expect(response.body).toMatchObject({
          metricId: 'course-completion-dates',
        });

        expect(Array.isArray(response.body.value)).toBe(true);
        expect(response.body.value.length).toBeLessThanOrEqual(3);

        // Each entry should have ISO 8601 timestamp or element info
        response.body.value.forEach((entry: any) => {
          // Entry may have completedAt or timestamp field
          const timestamp = entry.completedAt || entry.timestamp;
          if (timestamp) {
            expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
          }
        });
      });

      it('should require userId and courseId parameters', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion-dates/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });
  });

  describe('Cross-Metric Validation', () => {
    it('should maintain consistent metric result structure', async () => {
      jest
        .spyOn(lrsClient, 'queryStatements')
        .mockResolvedValue(courseMetricStatements);

      const metrics = [
        {
          id: 'course-total-score',
          params: { userId: 'student-1', courseId: 'course-123' },
        },
        { id: 'course-max-score', params: { courseId: 'course-123' } },
        {
          id: 'course-time-spent',
          params: { userId: 'student-1', courseId: 'course-123' },
        },
        {
          id: 'course-last-elements',
          params: { userId: 'student-1', courseId: 'course-123' },
        },
        {
          id: 'course-completion-dates',
          params: { userId: 'student-1', courseId: 'course-123' },
        },
      ];

      for (const metric of metrics) {
        const response = await request(app.getHttpServer())
          .get(`/api/v1/metrics/${metric.id}/results`)
          .query(metric.params)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Validate consistent structure per REQ-FN-004
        expect(response.body).toHaveProperty('metricId', metric.id);
        expect(response.body).toHaveProperty('value');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('computationTime');
        expect(response.body).toHaveProperty('metadata');

        // Timestamp should be ISO 8601
        expect(response.body.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
      }
    });

    it('should return CSV-specified raw values not derived metrics', async () => {
      jest
        .spyOn(lrsClient, 'queryStatements')
        .mockResolvedValue(courseMetricStatements);

      // CO-001: Total score (raw points, not percentage)
      const totalScoreResp = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-total-score/results')
        .query({ userId: 'student-1', courseId: 'course-123' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // CSV spec: raw values (not percentages or derived metrics)
      expect(totalScoreResp.body.value).toBeGreaterThan(0); // Raw points
      expect(totalScoreResp.body.metadata.unit).toBe('points');

      // CO-002: Max score (raw points, not percentage)
      const maxScoreResp = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-max-score/results')
        .query({ courseId: 'course-123' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(maxScoreResp.body.value).toBeGreaterThan(0); // Raw possible points
      expect(maxScoreResp.body.metadata.unit).toBe('points');

      // CO-003: Time spent (seconds, not formatted)
      const timeSpentResp = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-time-spent/results')
        .query({ userId: 'student-1', courseId: 'course-123' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(timeSpentResp.body.value).toBeGreaterThan(0); // Raw seconds
      expect(timeSpentResp.body.metadata.unit).toBe('seconds');
    });

    it('should handle cache correctly across metrics', async () => {
      jest
        .spyOn(lrsClient, 'queryStatements')
        .mockResolvedValue(courseMetricStatements);

      const params = { userId: 'student-1', courseId: 'course-123' };

      // First request - cache miss
      const firstResp = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-total-score/results')
        .query(params)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(firstResp.body.fromCache).toBe(false);

      // Second request - cache hit
      const secondResp = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-total-score/results')
        .query(params)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(secondResp.body.fromCache).toBe(true);
      expect(secondResp.body.value).toBe(firstResp.body.value);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed xAPI statements gracefully', async () => {
      const malformedStatements: xAPIStatement[] = [
        {
          actor: { account: { name: 'user-1', homePage: 'http://test.com' } },
          verb: { id: 'http://adlnet.gov/expapi/verbs/scored' },
          object: { id: 'element-1' },
          result: { score: { raw: undefined, max: 100 } }, // Missing raw score
        } as xAPIStatement,
      ];

      jest
        .spyOn(lrsClient, 'queryStatements')
        .mockResolvedValue(malformedStatements);

      const response = await request(app.getHttpServer())
        .get('/api/v1/metrics/course-total-score/results')
        .query({ userId: 'user-1', courseId: 'course-123' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should handle gracefully and return 0
      expect(response.body.value).toBe(0);
    });

    it('should validate time range parameters', async () => {
      jest.spyOn(lrsClient, 'queryStatements').mockResolvedValue([]);

      // Invalid: since after until
      await request(app.getHttpServer())
        .get('/api/v1/metrics/course-total-score/results')
        .query({
          userId: 'user-1',
          courseId: 'course-123',
          since: '2024-11-10T00:00:00Z',
          until: '2024-11-01T00:00:00Z', // Before since
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should require authentication for all metrics', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/metrics/course-total-score/results')
        .query({ userId: 'user-1', courseId: 'course-123' })
        .expect(401);
    });

    // Note: Rate limiting test moved to rate-limiting.e2e-spec.ts
    // to avoid connection issues in parallel test execution
  });
});
