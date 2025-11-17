// REQ-FN-003: E2E tests for Metrics Catalog Endpoints
// Tests REST API endpoints for metrics catalog and discovery

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('REQ-FN-003: Metrics Catalog Endpoints (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    // Enable authentication for these tests
    process.env.AUTH_ENABLED = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same validation pipe as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Set global API prefix (e.g., /api/v1)
    const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
    app.setGlobalPrefix(apiPrefix, {
      exclude: ['/', 'health', 'health/liveness', 'health/readiness'], // Exclude public routes from prefix
    });

    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/metrics - List Catalog', () => {
    it('should return catalog populated from registered providers', async () => {
      const token = jwtService.sign({
        sub: 'user-123',
        username: 'testuser',
        scopes: ['analytics:read'],
      });

      return request(app.getHttpServer())
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(Array.isArray(res.body.items)).toBe(true);
          expect(res.body.items.length).toBeGreaterThanOrEqual(3);

          const completionMetric = res.body.items.find(
            (item: { id: string }) => item.id === 'course-completion',
          );

          expect(completionMetric).toMatchObject({
            id: 'course-completion',
            title: 'Course Completion Rate',
            requiredParams: ['courseId'],
            outputType: 'scalar',
          });
          expect(completionMetric.description).toContain('percentage');
        });
    });

    it('should return 401 without authentication token', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/metrics')
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 401);
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should return 403 without required analytics:read scope', async () => {
      const token = jwtService.sign({
        sub: 'user-456',
        username: 'limiteduser',
        scopes: ['other:scope'],
      });

      return request(app.getHttpServer())
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 403);
          expect(res.body.message).toContain('analytics:read');
        });
    });

    it('should return 200 with valid token and correct scope', async () => {
      const token = jwtService.sign({
        sub: 'user-789',
        username: 'authorizeduser',
        scopes: ['analytics:read', 'other:scope'],
      });

      return request(app.getHttpServer())
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
        });
    });

    it('should return consistent catalog structure across requests', async () => {
      const token = jwtService.sign({
        sub: 'user-123',
        scopes: ['analytics:read'],
      });

      const response1 = await request(app.getHttpServer())
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response1.body).toEqual(response2.body);
    });
  });

  describe('GET /api/v1/metrics/:id - Get Metric Detail', () => {
    it('should return provider metadata for existing metric', async () => {
      const token = jwtService.sign({
        sub: 'user-123',
        scopes: ['analytics:read'],
      });

      return request(app.getHttpServer())
        .get('/api/v1/metrics/course-completion')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            id: 'course-completion',
            title: 'Course Completion Rate',
            requiredParams: ['courseId'],
            outputType: 'scalar',
          });
          expect(res.body.example).toBeDefined();
        });
    });

    it('should return 404 for unknown metric ID', async () => {
      const token = jwtService.sign({
        sub: 'user-123',
        scopes: ['analytics:read'],
      });

      return request(app.getHttpServer())
        .get('/api/v1/metrics/unknown-metric')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 404);
          expect(res.body.message).toContain('unknown-metric');
          expect(res.body.message).toContain('not found');
        });
    });

    it('should return 401 without authentication token', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/metrics/test-metric')
        .expect(401);
    });

    it('should return 403 without required analytics:read scope', async () => {
      const token = jwtService.sign({
        sub: 'user-456',
        scopes: ['other:scope'],
      });

      return request(app.getHttpServer())
        .get('/api/v1/metrics/test-metric')
        .set('Authorization', `Bearer ${token}`)
        .expect(403)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 403);
          expect(res.body.message).toContain('analytics:read');
        });
    });

    it('should handle metric IDs with special characters', async () => {
      const token = jwtService.sign({
        sub: 'user-123',
        scopes: ['analytics:read'],
      });

      const specialIds = [
        'metric-with-dashes',
        'metric_with_underscores',
        'metric.with.dots',
        'metric123',
      ];

      for (const id of specialIds) {
        await request(app.getHttpServer())
          .get(`/api/v1/metrics/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      }
    });

    it('should return 404 with proper error structure', async () => {
      const token = jwtService.sign({
        sub: 'user-123',
        scopes: ['analytics:read'],
      });

      return request(app.getHttpServer())
        .get('/api/v1/metrics/nonexistent-metric')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode');
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('error');
        });
    });
  });

  describe('Authorization Scope Enforcement', () => {
    it('should allow access with analytics:read scope', async () => {
      const token = jwtService.sign({
        sub: 'user-authorized',
        scopes: ['analytics:read'],
      });

      await request(app.getHttpServer())
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/v1/metrics/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(404); // Not found, but auth passed (200 level before 404 check)
    });

    it('should deny access without analytics:read scope', async () => {
      const token = jwtService.sign({
        sub: 'user-unauthorized',
        scopes: ['admin:cache', 'admin:config'],
      });

      await request(app.getHttpServer())
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/v1/metrics/test')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should allow access with multiple scopes including analytics:read', async () => {
      const token = jwtService.sign({
        sub: 'user-multi-scope',
        scopes: ['admin:cache', 'analytics:read', 'other:scope'],
      });

      return request(app.getHttpServer())
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Response Structure', () => {
    it('catalog response should have items array property', async () => {
      const token = jwtService.sign({
        sub: 'user-123',
        scopes: ['analytics:read'],
      });

      return request(app.getHttpServer())
        .get('/api/v1/metrics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({
              items: expect.any(Array),
            }),
          );
        });
    });
  });
});
