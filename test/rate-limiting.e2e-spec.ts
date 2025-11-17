// REQ-FN-024: E2E tests for Rate Limiting
// Tests rate limiting behavior, headers, and bypass for health endpoints

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('REQ-FN-024: Rate Limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Enable authentication for these tests
    process.env.AUTH_ENABLED = 'true';
    // Set lower rate limits for testing
    process.env.RATE_LIMIT_TTL = '60'; // 60 seconds
    process.env.RATE_LIMIT_MAX = '10'; // 10 requests for faster testing

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

    // Set global API prefix
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Rate Limit Headers', () => {
    it('should include X-RateLimit-* headers in successful responses', async () => {
      // Health endpoints have @SkipThrottle() so they won't have rate limit headers
      // Test with root endpoint instead
      const rootResponse = await request(app.getHttpServer())
        .get('/')
        .expect(200);

      expect(rootResponse.headers).toHaveProperty('x-ratelimit-limit');
      expect(rootResponse.headers).toHaveProperty('x-ratelimit-remaining');
      expect(rootResponse.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should decrement X-RateLimit-Remaining with each request', async () => {
      // Make first request
      const response1 = await request(app.getHttpServer()).get('/');

      const remaining1 = parseInt(
        response1.headers['x-ratelimit-remaining'],
        10,
      );

      // Make second request
      const response2 = await request(app.getHttpServer()).get('/');

      const remaining2 = parseInt(
        response2.headers['x-ratelimit-remaining'],
        10,
      );

      // Remaining should have decreased
      expect(remaining2).toBeLessThan(remaining1);
    });
  });

  describe('Rate Limit Enforcement', () => {
    it('should return 429 after exceeding rate limit', async () => {
      // Use a unique endpoint or wait to avoid rate limit from previous tests
      const endpoint = '/';

      // Make requests up to the limit
      const requests = [];
      for (let i = 0; i < 12; i++) {
        requests.push(request(app.getHttpServer()).get(endpoint));
      }

      const responses = await Promise.all(requests);

      // Check that at least one request returned 429
      const hasRateLimitError = responses.some((res) => res.status === 429);
      expect(hasRateLimitError).toBe(true);

      // Find the 429 response
      const rateLimitResponse = responses.find((res) => res.status === 429);
      if (rateLimitResponse) {
        expect(rateLimitResponse.body).toHaveProperty('message');
        expect(rateLimitResponse.body.message).toContain('Too many requests');
      }
    }, 15000); // Increase timeout for burst testing

    it('should include Retry-After header in 429 responses', async () => {
      // Make enough requests to trigger rate limiting
      const endpoint = '/';
      let rateLimitResponse;

      for (let i = 0; i < 15; i++) {
        const response = await request(app.getHttpServer()).get(endpoint);

        if (response.status === 429) {
          rateLimitResponse = response;
          break;
        }
      }

      if (rateLimitResponse) {
        expect(rateLimitResponse.headers).toHaveProperty('retry-after');
        const retryAfter = parseInt(
          rateLimitResponse.headers['retry-after'],
          10,
        );
        expect(retryAfter).toBeGreaterThan(0);
        expect(retryAfter).toBeLessThanOrEqual(60);
      }
    }, 15000);

    it('should set X-RateLimit-Remaining to 0 in 429 responses', async () => {
      const endpoint = '/';
      let rateLimitResponse;

      for (let i = 0; i < 15; i++) {
        const response = await request(app.getHttpServer()).get(endpoint);

        if (response.status === 429) {
          rateLimitResponse = response;
          break;
        }
      }

      if (rateLimitResponse) {
        expect(rateLimitResponse.headers['x-ratelimit-remaining']).toBe('0');
      }
    }, 15000);
  });

  describe('Health Endpoint Bypass', () => {
    it('should not rate limit /health/liveness endpoint', async () => {
      // Make many requests to health endpoint
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(request(app.getHttpServer()).get('/health/liveness'));
      }

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((res) => {
        expect(res.status).toBe(200);
      });
    }, 15000);

    it('should not rate limit /health/readiness endpoint', async () => {
      // Make many requests to health endpoint
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(request(app.getHttpServer()).get('/health/readiness'));
      }

      const responses = await Promise.all(requests);

      // All should succeed (200) or fail due to dependencies (503), but not 429
      responses.forEach((res) => {
        expect(res.status).not.toBe(429);
      });
    }, 15000);
  });

  describe('Error Response Format', () => {
    it('should return user-friendly error message without sensitive data', async () => {
      const endpoint = '/';

      // Trigger rate limit
      for (let i = 0; i < 15; i++) {
        const response = await request(app.getHttpServer()).get(endpoint);

        if (response.status === 429) {
          // Check error message
          expect(response.body).toHaveProperty('message');
          expect(response.body.message).toContain('Too many requests');

          // Should not contain stack trace or internal paths
          expect(JSON.stringify(response.body)).not.toContain('at ');
          expect(JSON.stringify(response.body)).not.toContain('/src/');
          expect(JSON.stringify(response.body)).not.toContain('Error:');

          break;
        }
      }
    }, 15000);
  });
});
