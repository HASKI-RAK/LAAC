// E2E tests for Metrics Results Endpoint
// Implements REQ-FN-005: GET /api/v1/metrics/:id/results endpoint

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CacheService } from '../src/data-access/services/cache.service';
import { LRSClient } from '../src/data-access/clients/lrs.client';
import { xAPIStatement } from '../src/data-access';
import { generateTokenWithScopes } from './helpers/auth.helper';

describe('REQ-FN-005: Metrics Results Endpoint (e2e)', () => {
  let app: INestApplication;
  let cacheService: CacheService;
  let lrsClient: LRSClient;
  let authToken: string;

  // Mock xAPI statements
  const mockStatements: xAPIStatement[] = [
    {
      id: 'stmt-1',
      actor: {
        objectType: 'Agent',
        name: 'Student 1',
        account: { name: 'student-1', homePage: 'http://example.com' },
      },
      verb: {
        id: 'https://wiki.haski.app/variables/xapi.completed',
        display: { 'en-US': 'completed' },
      },
      object: {
        id: 'course-123',
        objectType: 'Activity',
        definition: { name: { 'en-US': 'Test Course' } },
      },
      timestamp: '2025-11-13T10:00:00Z',
    },
    {
      id: 'stmt-2',
      actor: {
        objectType: 'Agent',
        name: 'Student 2',
        account: { name: 'student-2', homePage: 'http://example.com' },
      },
      verb: {
        id: 'https://wiki.haski.app/variables/xapi.completed',
        display: { 'en-US': 'completed' },
      },
      object: {
        id: 'course-123',
        objectType: 'Activity',
        definition: { name: { 'en-US': 'Test Course' } },
      },
      timestamp: '2025-11-13T10:15:00Z',
    },
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global validation pipe (same as main.ts)
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/metrics/:id/results', () => {
    describe('Successful Computation', () => {
      it('should compute course-completion metric', async () => {
        // REQ-FN-005: Compute metric with cache miss
        // Mock LRS response since we're running without seed data
        const querySpy = jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          metricId: 'course-completion',
          value: expect.any(Number),
          timestamp: expect.any(String),
          computationTime: expect.any(Number),
          fromCache: false,
          metadata: expect.objectContaining({
            totalLearners: expect.any(Number),
            completedLearners: expect.any(Number),
            unit: 'percentage',
          }),
        });

        expect(response.body.value).toBeGreaterThanOrEqual(0);
        expect(response.body.value).toBeLessThanOrEqual(100);

        querySpy.mockRestore();
      });

      it('should support time-based filtering', async () => {
        // REQ-FN-005: Time range filters
        const querySpy = jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({
            courseId: 'course-123',
            since: '2025-01-01T00:00:00Z',
            until: '2025-12-31T23:59:59Z',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.fromCache).toBe(false);
        expect(querySpy).toHaveBeenCalledWith(
          expect.objectContaining({
            since: '2025-01-01T00:00:00Z',
            until: '2025-12-31T23:59:59Z',
          }),
        );

        querySpy.mockRestore();
      });

      describe('Parameter-aware LRS filters', () => {
        it('should translate courseId to activity filter', async () => {
          const querySpy = jest
            .spyOn(lrsClient, 'queryStatements')
            .mockResolvedValue(mockStatements);

          await request(app.getHttpServer())
            .get('/api/v1/metrics/course-completion/results')
            .query({ courseId: 'course-abc' })
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(querySpy).toHaveBeenCalledWith(
            expect.objectContaining({
              activity: 'course-abc',
              related_activities: true,
            }),
          );

          querySpy.mockRestore();
        });

        it('should prefer topicId when provided', async () => {
          const querySpy = jest
            .spyOn(lrsClient, 'queryStatements')
            .mockResolvedValue(mockStatements);

          await request(app.getHttpServer())
            .get('/api/v1/metrics/topic-mastery/results')
            .query({ courseId: 'course-abc', topicId: 'topic-xyz' })
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(querySpy).toHaveBeenCalledWith(
            expect.objectContaining({
              activity: 'topic-xyz',
              related_activities: true,
            }),
          );

          querySpy.mockRestore();
        });

        it('should prefer elementId for most specific scope', async () => {
          const querySpy = jest
            .spyOn(lrsClient, 'queryStatements')
            .mockResolvedValue(mockStatements);

          await request(app.getHttpServer())
            .get('/api/v1/metrics/course-completion/results')
            .query({ courseId: 'course-abc', elementId: 'element-111' })
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(querySpy).toHaveBeenCalledWith(
            expect.objectContaining({
              activity: 'element-111',
              related_activities: false,
            }),
          );

          querySpy.mockRestore();
        });
      });
    });

    describe('Cache Behavior', () => {
      it('should serve result from cache on second request', async () => {
        // REQ-FN-006: Cache-aside pattern - cache hit
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        // First request - cache miss
        const querySpy = jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const firstResponse = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(firstResponse.body.fromCache).toBe(false);

        // Second request - cache hit
        const secondResponse = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(secondResponse.body.fromCache).toBe(true);
        expect(secondResponse.body.value).toBe(firstResponse.body.value);

        // LRS should only be called once (for first request)
        expect(querySpy).toHaveBeenCalledTimes(1);
        querySpy.mockRestore();
      });

      it('should cache results with different parameters separately', async () => {
        // REQ-FN-006: Cache key differentiation
        const querySpy = jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        // Request with courseId=course-123
        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Request with courseId=course-456 (different cache key)
        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-456' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.fromCache).toBe(false);
        expect(querySpy).toHaveBeenCalledTimes(2);
        querySpy.mockRestore();
      });
    });

    describe('Error Handling', () => {
      it('should return 404 for nonexistent metric', async () => {
        // REQ-FN-005: Metric not found
        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/nonexistent-metric/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.message).toContain('not found in catalog');
      });

      it('should return 400 for invalid parameters', async () => {
        // REQ-FN-005: Parameter validation error
        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({}) // Missing required courseId
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.message).toContain('required');
      });

      it('should return 400 for invalid ISO 8601 timestamp', async () => {
        // REQ-FN-024: Input validation
        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({
            courseId: 'course-123',
            since: 'invalid-date',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        const message = response.body.message;
        if (Array.isArray(message)) {
          expect(message).toEqual(
            expect.arrayContaining([
              'since must be a valid ISO 8601 timestamp',
            ]),
          );
        } else {
          expect(message).toContain('ISO 8601');
        }
      });

      it('should return graceful degradation response when LRS is unavailable', async () => {
        // REQ-NF-003: Graceful degradation
        const querySpy = jest
          .spyOn(lrsClient, 'queryStatements')
          .mockRejectedValue(new Error('LRS connection failed'));

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.status).toMatch(/degraded|unavailable/);
        expect(response.body.value).toBeNull();
        expect(response.body.cause).toBe('LRS_UNAVAILABLE');
        expect(response.body.error || response.body.warning).toBeTruthy();
        querySpy.mockRestore();
      });

      it('should return 401 without authentication token', async () => {
        // REQ-FN-023: Authentication required
        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .expect(401);
      });
    });

    describe('Multiple Metrics', () => {
      it('should compute learning-engagement metric', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/learning-engagement/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          metricId: 'learning-engagement',
          value: expect.any(Number),
          fromCache: false,
        });
      });

      it('should compute topic-mastery metric', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/topic-mastery/results')
          .query({
            courseId: 'course-123',
            topicId: 'topic-456',
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          metricId: 'topic-mastery',
          value: expect.any(Number),
          fromCache: false,
        });
      });
    });

    describe('Response Format', () => {
      it('should include all required fields in response', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // REQ-FN-005: Response structure
        expect(response.body).toHaveProperty('metricId');
        expect(response.body).toHaveProperty('value');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('computationTime');
        expect(response.body).toHaveProperty('fromCache');
        expect(response.body).toHaveProperty('metadata');

        // Validate timestamp format (ISO 8601)
        expect(response.body.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
      });

      it('should return computation time in milliseconds', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mockStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.computationTime).toBeGreaterThanOrEqual(0);
        expect(response.body.computationTime).toBeLessThan(10000); // Less than 10 seconds
      });
    });

    describe('CSV-Compliant Course Metrics (REQ-FN-004, Story 14.1)', () => {
      // Mock xAPI statements with scores and durations for course metrics
      const courseMetricStatements: xAPIStatement[] = [
        {
          id: 'stmt-score-1',
          actor: {
            objectType: 'Agent',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/scored',
            display: { 'en-US': 'scored' },
          },
          object: {
            id: 'element-1',
            objectType: 'Activity',
            definition: { name: { 'en-US': 'Quiz 1' } },
          },
          result: {
            score: { raw: 85, max: 100 },
            duration: 'PT15M',
          },
          timestamp: '2025-11-13T10:00:00Z',
        },
        {
          id: 'stmt-score-2',
          actor: {
            objectType: 'Agent',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/scored',
            display: { 'en-US': 'scored' },
          },
          object: {
            id: 'element-2',
            objectType: 'Activity',
            definition: { name: { 'en-US': 'Quiz 2' } },
          },
          result: {
            score: { raw: 92, max: 100 },
            duration: 'PT20M',
          },
          timestamp: '2025-11-14T10:00:00Z',
        },
        {
          id: 'stmt-completion-1',
          actor: {
            objectType: 'Agent',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
          },
          object: {
            id: 'element-1',
            objectType: 'Activity',
            definition: { name: { 'en-US': 'Quiz 1' } },
          },
          result: { completion: true },
          timestamp: '2025-11-13T10:15:00Z',
        },
      ];

      it('should compute course-total-score metric (CO-001)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-total-score/results')
          .query({ userId: 'student-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          metricId: 'course-total-score',
          value: 177, // 85 + 92
          fromCache: false,
          metadata: expect.objectContaining({
            unit: 'points',
            elementCount: 2,
          }),
        });
      });

      it('should compute course-max-score metric (CO-002)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-max-score/results')
          .query({ courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          metricId: 'course-max-score',
          value: 200, // 100 + 100 (2 elements with max 100 each)
          fromCache: false,
          metadata: expect.objectContaining({
            unit: 'points',
            elementCount: 2,
          }),
        });
      });

      it('should compute course-time-spent metric (CO-003)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-time-spent/results')
          .query({ userId: 'student-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          metricId: 'course-time-spent',
          value: 2100, // PT15M (900s) + PT20M (1200s) = 2100s
          fromCache: false,
          metadata: expect.objectContaining({
            unit: 'seconds',
            activityCount: 2,
          }),
        });
      });

      it('should compute course-last-elements metric (CO-004)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-last-elements/results')
          .query({ userId: 'student-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('course-last-elements');
        expect(Array.isArray(response.body.value)).toBe(true);
        expect(response.body.fromCache).toBe(false);
        expect(response.body.metadata).toHaveProperty('count');
      });

      it('should compute course-completion-dates metric (CO-005)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-completion-dates/results')
          .query({ userId: 'student-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('course-completion-dates');
        expect(Array.isArray(response.body.value)).toBe(true);
        expect(response.body.fromCache).toBe(false);
        expect(response.body.value.length).toBeGreaterThanOrEqual(0);
        expect(response.body.metadata).toHaveProperty('count');
      });

      it('should validate required parameters for course metrics', async () => {
        // CO-001 requires userId and courseId
        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-total-score/results')
          .query({ courseId: 'course-123' }) // Missing userId
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        // CO-002 requires courseId only
        await request(app.getHttpServer())
          .get('/api/v1/metrics/course-max-score/results')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should cache course metric results', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(courseMetricStatements);

        // First request - cache miss
        const firstResponse = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-total-score/results')
          .query({ userId: 'student-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(firstResponse.body.fromCache).toBe(false);

        // Second request - cache hit
        const secondResponse = await request(app.getHttpServer())
          .get('/api/v1/metrics/course-total-score/results')
          .query({ userId: 'student-1', courseId: 'course-123' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(secondResponse.body.fromCache).toBe(true);
        expect(secondResponse.body.value).toBe(firstResponse.body.value);
      });
    });

    describe('Topic-Level CSV Metrics (TO-001 to TO-005)', () => {
      // Mock topic-level xAPI statements
      const topicMetricStatements: xAPIStatement[] = [
        {
          id: 'stmt-topic-1',
          actor: {
            objectType: 'Agent',
            name: 'Student 1',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/scored',
            display: { 'en-US': 'scored' },
          },
          object: {
            id: 'element-1',
            objectType: 'Activity',
            definition: {
              name: { 'en-US': 'Quiz 1' },
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/123/topic/5',
                  objectType: 'Activity',
                  definition: {
                    name: { 'en-US': 'Topic 5' },
                  },
                },
              ],
            },
          },
          result: {
            score: { raw: 85, max: 100 },
            duration: 'PT30M',
            completion: true,
          },
          timestamp: '2025-11-13T10:00:00Z',
        },
        {
          id: 'stmt-topic-2',
          actor: {
            objectType: 'Agent',
            name: 'Student 1',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
          },
          object: {
            id: 'element-2',
            objectType: 'Activity',
            definition: {
              name: { 'en-US': 'Lesson 2' },
              type: 'http://adlnet.gov/expapi/activities/lesson',
            },
          },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/123/topic/5',
                  objectType: 'Activity',
                  definition: {
                    name: { 'en-US': 'Topic 5' },
                  },
                },
              ],
            },
          },
          result: {
            score: { raw: 92, max: 100 },
            duration: 'PT45M',
            completion: true,
          },
          timestamp: '2025-11-14T10:00:00Z',
        },
        {
          id: 'stmt-topic-3',
          actor: {
            objectType: 'Agent',
            name: 'Student 1',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
          },
          object: {
            id: 'element-3',
            objectType: 'Activity',
            definition: {
              name: { 'en-US': 'Assignment 3' },
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
          context: {
            contextActivities: {
              parent: [
                {
                  id: 'https://moodle.example.com/course/123/topic/5',
                  objectType: 'Activity',
                  definition: {
                    name: { 'en-US': 'Topic 5' },
                  },
                },
              ],
            },
          },
          result: {
            score: { raw: 78, max: 100 },
            duration: 'PT1H15M',
            completion: true,
          },
          timestamp: '2025-11-15T10:00:00Z',
        },
      ];

      it('should compute topic-total-score metric (TO-001)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(topicMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/topic-total-score/results')
          .query({ userId: 'student-1', courseId: 'course-123', topicId: '5' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('topic-total-score');
        expect(typeof response.body.value).toBe('number');
        expect(response.body.value).toBeGreaterThanOrEqual(0);
        expect(response.body.fromCache).toBe(false);
        expect(response.body.metadata).toHaveProperty('unit', 'points');
        expect(response.body.metadata).toHaveProperty('elementCount');
        expect(response.body.metadata).toHaveProperty('avgScore');
        expect(response.body.metadata).toHaveProperty('userId', 'student-1');
        expect(response.body.metadata).toHaveProperty('courseId', 'course-123');
        expect(response.body.metadata).toHaveProperty('topicId', '5');
      });

      it('should compute topic-max-score metric (TO-002)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(topicMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/topic-max-score/results')
          .query({ courseId: 'course-123', topicId: '5' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('topic-max-score');
        expect(typeof response.body.value).toBe('number');
        expect(response.body.value).toBeGreaterThanOrEqual(0);
        expect(response.body.fromCache).toBe(false);
        expect(response.body.metadata).toHaveProperty('unit', 'points');
        expect(response.body.metadata).toHaveProperty('elementCount');
        expect(response.body.metadata).toHaveProperty('avgMaxScore');
        expect(response.body.metadata).toHaveProperty('courseId', 'course-123');
        expect(response.body.metadata).toHaveProperty('topicId', '5');
      });

      it('should compute topic-time-spent metric (TO-003)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(topicMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/topic-time-spent/results')
          .query({ userId: 'student-1', courseId: 'course-123', topicId: '5' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('topic-time-spent');
        expect(typeof response.body.value).toBe('number');
        expect(response.body.value).toBeGreaterThanOrEqual(0);
        expect(response.body.fromCache).toBe(false);
        expect(response.body.metadata).toHaveProperty('unit', 'seconds');
        expect(response.body.metadata).toHaveProperty('activityCount');
        expect(response.body.metadata).toHaveProperty('avgDuration');
        expect(response.body.metadata).toHaveProperty('userId', 'student-1');
        expect(response.body.metadata).toHaveProperty('courseId', 'course-123');
        expect(response.body.metadata).toHaveProperty('topicId', '5');
      });

      it('should compute topic-last-elements metric (TO-004)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(topicMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/topic-last-elements/results')
          .query({ userId: 'student-1', courseId: 'course-123', topicId: '5' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('topic-last-elements');
        expect(Array.isArray(response.body.value)).toBe(true);
        expect(response.body.fromCache).toBe(false);
        expect(response.body.metadata).toHaveProperty('count');
        expect(response.body.metadata).toHaveProperty('totalCompletions');
        expect(response.body.metadata).toHaveProperty('userId', 'student-1');
        expect(response.body.metadata).toHaveProperty('courseId', 'course-123');
        expect(response.body.metadata).toHaveProperty('topicId', '5');

        // Each element should have elementId and completedAt
        if (response.body.value.length > 0) {
          expect(response.body.value[0]).toHaveProperty('elementId');
          expect(response.body.value[0]).toHaveProperty('completedAt');
        }
      });

      it('should compute topic-completion-dates metric (TO-005)', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(topicMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/topic-completion-dates/results')
          .query({ userId: 'student-1', courseId: 'course-123', topicId: '5' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('topic-completion-dates');
        expect(Array.isArray(response.body.value)).toBe(true);
        expect(response.body.fromCache).toBe(false);
        expect(response.body.metadata).toHaveProperty('count');
        expect(response.body.metadata).toHaveProperty('totalCompletions');
        expect(response.body.metadata).toHaveProperty('userId', 'student-1');
        expect(response.body.metadata).toHaveProperty('courseId', 'course-123');
        expect(response.body.metadata).toHaveProperty('topicId', '5');

        // Each date should be ISO 8601 format
        if (response.body.value.length > 0) {
          expect(response.body.value[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        }
      });

      it('should validate required parameters for topic metrics', async () => {
        // TO-001 requires userId, courseId, and topicId
        await request(app.getHttpServer())
          .get('/api/v1/metrics/topic-total-score/results')
          .query({ userId: 'student-1', courseId: 'course-123' }) // Missing topicId
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        // TO-002 requires courseId and topicId
        await request(app.getHttpServer())
          .get('/api/v1/metrics/topic-max-score/results')
          .query({ courseId: 'course-123' }) // Missing topicId
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        // TO-003 requires userId, courseId, and topicId
        await request(app.getHttpServer())
          .get('/api/v1/metrics/topic-time-spent/results')
          .query({ courseId: 'course-123', topicId: '5' }) // Missing userId
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should cache topic metric results', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(topicMetricStatements);

        // First request - cache miss
        const firstResponse = await request(app.getHttpServer())
          .get('/api/v1/metrics/topic-total-score/results')
          .query({ userId: 'student-1', courseId: 'course-123', topicId: '5' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(firstResponse.body.fromCache).toBe(false);

        // Second request - cache hit
        const secondResponse = await request(app.getHttpServer())
          .get('/api/v1/metrics/topic-total-score/results')
          .query({ userId: 'student-1', courseId: 'course-123', topicId: '5' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(secondResponse.body.fromCache).toBe(true);
        expect(secondResponse.body.value).toBe(firstResponse.body.value);
      });

      it('should respect topic scoping via context.contextActivities.parent', async () => {
        // Mix statements from different topics
        const mixedTopicStatements: xAPIStatement[] = [
          ...topicMetricStatements,
          {
            id: 'stmt-other-topic',
            actor: {
              objectType: 'Agent',
              name: 'Student 1',
              account: { name: 'student-1', homePage: 'http://example.com' },
            },
            verb: {
              id: 'http://adlnet.gov/expapi/verbs/scored',
              display: { 'en-US': 'scored' },
            },
            object: {
              id: 'element-other',
              objectType: 'Activity',
              definition: {
                name: { 'en-US': 'Other Topic Quiz' },
                type: 'http://adlnet.gov/expapi/activities/assessment',
              },
            },
            context: {
              contextActivities: {
                parent: [
                  {
                    id: 'https://moodle.example.com/course/123/topic/99',
                    objectType: 'Activity',
                    definition: {
                      name: { 'en-US': 'Topic 99' },
                    },
                  },
                ],
              },
            },
            result: {
              score: { raw: 1000, max: 1000 }, // Large score to detect if included
            },
            timestamp: '2025-11-16T10:00:00Z',
          },
        ];

        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(mixedTopicStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/topic-total-score/results')
          .query({ userId: 'student-1', courseId: 'course-123', topicId: '5' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Should not include the score from topic 99
        expect(response.body.value).toBeLessThan(1000);
        expect(response.body.metadata.elementCount).toBe(3); // Only 3 from topic 5
      });
    });

    // REQ-FN-004: Element-Level CSV Metrics (EO-001 to EO-006)
    describe('Element-Level CSV Metrics (EO-001 to EO-006)', () => {
      const elementMetricStatements: xAPIStatement[] = [
        // Best attempt scenario: 3 attempts with different scores
        {
          id: 'stmt-element-attempt-1',
          actor: {
            objectType: 'Agent',
            name: 'Student 1',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/attempted',
            display: { 'en-US': 'attempted' },
          },
          object: {
            id: 'element-42',
            objectType: 'Activity',
            definition: {
              name: { 'en-US': 'Quiz 1' },
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
          result: {
            score: { raw: 75, max: 100 },
            completion: false,
            duration: 'PT15M',
          },
          timestamp: '2025-11-15T09:00:00Z',
        },
        {
          id: 'stmt-element-attempt-2',
          actor: {
            objectType: 'Agent',
            name: 'Student 1',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/attempted',
            display: { 'en-US': 'attempted' },
          },
          object: {
            id: 'element-42',
            objectType: 'Activity',
            definition: {
              name: { 'en-US': 'Quiz 1' },
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
          result: {
            score: { raw: 92, max: 100 },
            completion: true,
            duration: 'PT20M',
          },
          timestamp: '2025-11-15T10:30:00Z',
        },
        {
          id: 'stmt-element-attempt-3',
          actor: {
            objectType: 'Agent',
            name: 'Student 1',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/attempted',
            display: { 'en-US': 'attempted' },
          },
          object: {
            id: 'element-42',
            objectType: 'Activity',
            definition: {
              name: { 'en-US': 'Quiz 1' },
              type: 'http://adlnet.gov/expapi/activities/assessment',
            },
          },
          result: {
            score: { raw: 85, max: 100 },
            completion: false,
            duration: 'PT18M',
          },
          timestamp: '2025-11-15T12:00:00Z',
        },
      ];

      const topicCompletionStatements: xAPIStatement[] = [
        {
          id: 'stmt-element-1-complete',
          actor: {
            objectType: 'Agent',
            name: 'Student 1',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'https://wiki.haski.app/variables/xapi.completed',
            display: { 'en-US': 'completed' },
          },
          object: {
            id: 'element-1',
            objectType: 'Activity',
          },
          result: {
            completion: true,
          },
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          id: 'stmt-element-2-complete',
          actor: {
            objectType: 'Agent',
            name: 'Student 1',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'https://wiki.haski.app/variables/xapi.completed',
            display: { 'en-US': 'completed' },
          },
          object: {
            id: 'element-2',
            objectType: 'Activity',
          },
          result: {
            completion: true,
          },
          timestamp: '2025-11-14T09:00:00Z',
        },
        {
          id: 'stmt-element-3-complete',
          actor: {
            objectType: 'Agent',
            name: 'Student 1',
            account: { name: 'student-1', homePage: 'http://example.com' },
          },
          verb: {
            id: 'https://wiki.haski.app/variables/xapi.completed',
            display: { 'en-US': 'completed' },
          },
          object: {
            id: 'element-3',
            objectType: 'Activity',
          },
          result: {
            completion: true,
          },
          timestamp: '2025-11-13T08:00:00Z',
        },
      ];

      beforeEach(async () => {
        await cacheService.invalidatePattern('cache:*');
      });

      it('EO-001: should return completion status of best attempt', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(elementMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/element-completion-status/results')
          .query({ userId: 'student-1', elementId: 'element-42' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('element-completion-status');
        expect(response.body.value).toBe(true); // Best attempt (score 92) is completed
        expect(response.body.metadata.attemptCount).toBe(3);
        expect(response.body.metadata.bestScore).toBe(92);
        expect(response.body.metadata.bestAttemptDate).toBe(
          '2025-11-15T10:30:00Z',
        );
      });

      it('EO-002: should return date of best attempt', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(elementMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/element-best-attempt-date/results')
          .query({ userId: 'student-1', elementId: 'element-42' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('element-best-attempt-date');
        expect(response.body.value).toBe('2025-11-15T10:30:00Z'); // Best attempt timestamp
        expect(response.body.metadata.attemptCount).toBe(3);
        expect(response.body.metadata.bestScore).toBe(92);
      });

      it('EO-003: should return score of best attempt', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(elementMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/element-best-attempt-score/results')
          .query({ userId: 'student-1', elementId: 'element-42' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('element-best-attempt-score');
        expect(response.body.value).toBe(92); // Best attempt score
        expect(response.body.metadata.attemptCount).toBe(3);
        expect(response.body.metadata.bestAttemptDate).toBe(
          '2025-11-15T10:30:00Z',
        );
      });

      it('EO-004: should return total time spent on element', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(elementMetricStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/element-time-spent/results')
          .query({ userId: 'student-1', elementId: 'element-42' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('element-time-spent');
        // PT15M + PT20M + PT18M = 900 + 1200 + 1080 = 3180 seconds
        expect(response.body.value).toBe(3180);
        expect(response.body.metadata.unit).toBe('seconds');
        expect(response.body.metadata.attemptCount).toBe(3);
      });

      it('EO-005: should return last 3 completed elements in topic', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(topicCompletionStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/element-last-completed/results')
          .query({ userId: 'student-1', topicId: 'topic-1' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('element-last-completed');
        expect(response.body.value).toHaveLength(3);
        expect(response.body.value[0]).toEqual({
          elementId: 'element-1',
          completedAt: '2025-11-15T10:00:00Z',
        });
        expect(response.body.value[1]).toEqual({
          elementId: 'element-2',
          completedAt: '2025-11-14T09:00:00Z',
        });
        expect(response.body.value[2]).toEqual({
          elementId: 'element-3',
          completedAt: '2025-11-13T08:00:00Z',
        });
        expect(response.body.metadata.totalCompletions).toBe(3);
      });

      it('EO-006: should return completion dates of last 3 elements', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(topicCompletionStatements);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/element-completion-dates/results')
          .query({ userId: 'student-1', topicId: 'topic-1' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metricId).toBe('element-completion-dates');
        expect(response.body.value).toHaveLength(3);
        expect(response.body.value).toEqual([
          '2025-11-15T10:00:00Z',
          '2025-11-14T09:00:00Z',
          '2025-11-13T08:00:00Z',
        ]);
        expect(response.body.metadata.totalCompletions).toBe(3);
      });

      it('should validate required parameters for element metrics', async () => {
        // EO-001 requires userId and elementId
        await request(app.getHttpServer())
          .get('/api/v1/metrics/element-completion-status/results')
          .query({ userId: 'student-1' }) // Missing elementId
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        // EO-004 requires userId and elementId
        await request(app.getHttpServer())
          .get('/api/v1/metrics/element-time-spent/results')
          .query({ elementId: 'element-42' }) // Missing userId
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        // EO-005 requires userId and topicId
        await request(app.getHttpServer())
          .get('/api/v1/metrics/element-last-completed/results')
          .query({ userId: 'student-1' }) // Missing topicId
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should cache element metric results', async () => {
        jest
          .spyOn(lrsClient, 'queryStatements')
          .mockResolvedValue(elementMetricStatements);

        // First request - cache miss
        const firstResponse = await request(app.getHttpServer())
          .get('/api/v1/metrics/element-best-attempt-score/results')
          .query({ userId: 'student-1', elementId: 'element-42' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(firstResponse.body.fromCache).toBe(false);

        // Second request - cache hit
        const secondResponse = await request(app.getHttpServer())
          .get('/api/v1/metrics/element-best-attempt-score/results')
          .query({ userId: 'student-1', elementId: 'element-42' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(secondResponse.body.fromCache).toBe(true);
        expect(secondResponse.body.value).toBe(firstResponse.body.value);
      });

      it('should handle no attempts gracefully (return null)', async () => {
        jest.spyOn(lrsClient, 'queryStatements').mockResolvedValue([]);

        const response = await request(app.getHttpServer())
          .get('/api/v1/metrics/element-completion-status/results')
          .query({ userId: 'student-1', elementId: 'element-99' })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.value).toBeNull();
        expect(response.body.metadata.status).toBe('no_attempts');
        expect(response.body.metadata.attemptCount).toBe(0);
      });
    });
  });
});
