// REQ-NF-002: Health/Readiness Endpoints - E2E Tests
// End-to-end tests for health check endpoints
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('REQ-NF-002: Health Endpoints (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/health/liveness (GET)', () => {
    it('should return 200 OK with status', () => {
      return request(app.getHttpServer())
        .get('/health/liveness')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.status).toBe('ok');
        });
    });

    it('should include version and timestamp', () => {
      return request(app.getHttpServer())
        .get('/health/liveness')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('version');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body.version).toBe('0.0.1');
          // Verify timestamp is ISO 8601 format
          expect(res.body.timestamp).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
          );
        });
    });

    it('should not check external dependencies', () => {
      return request(app.getHttpServer())
        .get('/health/liveness')
        .expect(200)
        .expect((res) => {
          // Liveness should not include redis or lrs checks
          expect(res.body.details || {}).not.toHaveProperty('redis');
          expect(res.body.details || {}).not.toHaveProperty('lrs');
        });
    });

    it('should return JSON content-type', () => {
      return request(app.getHttpServer())
        .get('/health/liveness')
        .expect('Content-Type', /json/)
        .expect(200);
    });
  });

  describe('/health/readiness (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(['ok', 'error']).toContain(res.body.status);
        });
    });

    it('should include version and timestamp when healthy', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .expect((res) => {
          // Version and timestamp are included when status is ok
          if (res.body.status === 'ok') {
            expect(res.body).toHaveProperty('version');
            expect(res.body).toHaveProperty('timestamp');
            expect(res.body.version).toBe('0.0.1');
            // Verify timestamp is ISO 8601 format
            expect(res.body.timestamp).toMatch(
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
            );
          }
          // In error state, Terminus returns error structure
          // which may not have version/timestamp
        });
    });

    it('should check Redis and LRS dependencies', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .expect((res) => {
          // Should have details or error about checked services
          const details = res.body.details || {};
          const errors = res.body.error || {};
          const info = res.body.info || {};

          // At least one of these should be present (depending on status)
          const hasRedis =
            details.redis !== undefined ||
            errors.redis !== undefined ||
            info.redis !== undefined;
          const hasLrs =
            details.lrs !== undefined ||
            errors.lrs !== undefined ||
            info.lrs !== undefined;

          expect(hasRedis || hasLrs).toBe(true);
        });
    });

    it('should return JSON content-type', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .expect('Content-Type', /json/);
    });

    it('should return appropriate status code based on dependencies', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .then((res) => {
          // Should return 200 for healthy or 503 for unhealthy
          // In test environment, dependencies are expected to be unhealthy
          expect([200, 503]).toContain(res.status);

          if (res.status === 200 && res.body.status === 'ok') {
            expect(res.body.info || res.body.details).toBeDefined();
          } else if (res.status === 503) {
            expect(res.body.status).toBe('error');
            expect(res.body.error || res.body.details).toBeDefined();
          }
        });
    });
  });

  describe('Health endpoint public access', () => {
    it('liveness should be accessible without authentication', () => {
      return request(app.getHttpServer()).get('/health/liveness').expect(200); // Should not return 401 or 403
    });

    it('readiness should be accessible without authentication', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .then((res) => {
          // Should not return 401 or 403 (auth errors)
          expect([200, 503]).toContain(res.status);
        });
    });
  });
});
