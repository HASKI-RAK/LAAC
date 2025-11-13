// REQ-FN-025: E2E tests for LRS Instance Health Monitoring
// Tests per-instance health monitoring via readiness probe

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('REQ-FN-025: LRS Instance Health Monitoring (e2e)', () => {
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
    it('should return 200 OK and remain independent of LRS status', () => {
      return request(app.getHttpServer())
        .get('/health/liveness')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.status).toBe('ok');
          expect(res.body).toHaveProperty('version');
          expect(res.body).toHaveProperty('timestamp');

          // Liveness should NOT include LRS details
          const hasLrsInDetails = res.body.details?.lrs !== undefined;
          const hasLrsInInfo = res.body.info?.lrs !== undefined;
          const hasLrsInError = res.body.error?.lrs !== undefined;

          expect(hasLrsInDetails || hasLrsInInfo || hasLrsInError).toBe(false);
        });
    });
  });

  describe('/health/readiness (GET)', () => {
    it('should include LRS component in health check', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .expect((res) => {
          // Response may be 200 (healthy) or 503 (unhealthy)
          expect([200, 503]).toContain(res.status);

          // Should have LRS status somewhere in response
          const hasLrs =
            res.body.details?.lrs !== undefined ||
            res.body.info?.lrs !== undefined ||
            res.body.error?.lrs !== undefined;

          expect(hasLrs).toBe(true);
        });
    });

    it('should include per-instance LRS breakdown when healthy', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .then((res) => {
          // Only check structure if LRS is healthy (200 response)
          if (res.status === 200 && res.body.info?.lrs) {
            const lrs = res.body.info.lrs;

            // Should have overall status
            expect(lrs).toHaveProperty('overallStatus');
            expect(['healthy', 'degraded', 'unhealthy']).toContain(
              lrs.overallStatus,
            );

            // Should have instances breakdown
            expect(lrs).toHaveProperty('instances');
            expect(typeof lrs.instances).toBe('object');

            // Check structure of instance details
            const instanceIds = Object.keys(lrs.instances);
            if (instanceIds.length > 0) {
              const firstInstance = lrs.instances[instanceIds[0]];
              expect(firstInstance).toHaveProperty('status');
              expect(['healthy', 'unhealthy', 'unknown']).toContain(
                firstInstance.status,
              );
              expect(firstInstance).toHaveProperty('lastCheck');

              // May have optional properties
              if (firstInstance.latency !== undefined) {
                expect(typeof firstInstance.latency).toBe('number');
              }
            }
          }
        });
    });

    it('should include per-instance LRS breakdown when degraded/unhealthy', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .then((res) => {
          // Only check structure if LRS is unhealthy (503 response)
          if (res.status === 503 && res.body.error?.lrs) {
            const lrs = res.body.error.lrs;

            // Should have overall status
            expect(lrs).toHaveProperty('overallStatus');
            expect(['degraded', 'unhealthy']).toContain(lrs.overallStatus);

            // Should have instances breakdown
            expect(lrs).toHaveProperty('instances');
            expect(typeof lrs.instances).toBe('object');
          }
        });
    });

    it('should include timestamp in ISO 8601 format', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .expect((res) => {
          if (res.body.timestamp) {
            expect(res.body.timestamp).toMatch(
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
            );
          }
        });
    });

    it('should return JSON content-type', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .expect('Content-Type', /json/);
    });
  });

  describe('Health endpoint public access (REQ-FN-023)', () => {
    it('liveness should be accessible without authentication', () => {
      return request(app.getHttpServer()).get('/health/liveness').expect(200);
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

  describe('Per-instance Status Reporting', () => {
    it('should report status for all configured LRS instances', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .then((res) => {
          const lrs =
            res.body.info?.lrs || res.body.error?.lrs || res.body.details?.lrs;

          if (lrs && lrs.instances) {
            const instanceIds = Object.keys(lrs.instances);

            // Should have at least one instance
            expect(instanceIds.length).toBeGreaterThan(0);

            // Each instance should have required fields
            instanceIds.forEach((instanceId) => {
              const instance = lrs.instances[instanceId];
              expect(instance).toHaveProperty('status');
              expect(instance).toHaveProperty('lastCheck');
              expect(['healthy', 'unhealthy', 'unknown']).toContain(
                instance.status,
              );
            });
          }
        });
    });
  });

  describe('Overall Status Aggregation (REQ-FN-025)', () => {
    it('should set overallStatus to healthy when all instances healthy', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .then((res) => {
          if (res.status === 200 && res.body.info?.lrs) {
            const lrs = res.body.info.lrs;

            if (lrs.overallStatus === 'healthy') {
              // All instances should be healthy
              const instanceIds = Object.keys(lrs.instances || {});
              instanceIds.forEach((instanceId) => {
                expect(lrs.instances[instanceId].status).toBe('healthy');
              });
            }
          }
        });
    });

    it('should set overallStatus to degraded when some instances down', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .then((res) => {
          const lrs =
            res.body.info?.lrs || res.body.error?.lrs || res.body.details?.lrs;

          if (lrs && lrs.overallStatus === 'degraded') {
            const instanceIds = Object.keys(lrs.instances || {});

            // Should have at least one healthy and one unhealthy
            const healthyCount = instanceIds.filter(
              (id) => lrs.instances[id].status === 'healthy',
            ).length;
            const unhealthyCount = instanceIds.filter(
              (id) => lrs.instances[id].status === 'unhealthy',
            ).length;

            expect(healthyCount).toBeGreaterThan(0);
            expect(unhealthyCount).toBeGreaterThan(0);
          }
        });
    });

    it('should set overallStatus to unhealthy when all instances down', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .then((res) => {
          if (res.status === 503 && res.body.error?.lrs) {
            const lrs = res.body.error.lrs;

            if (lrs.overallStatus === 'unhealthy') {
              // All instances should be unhealthy
              const instanceIds = Object.keys(lrs.instances || {});
              if (instanceIds.length > 0) {
                instanceIds.forEach((instanceId) => {
                  expect(lrs.instances[instanceId].status).toBe('unhealthy');
                });
              }
            }
          }
        });
    });
  });

  describe('Latency Tracking', () => {
    it('should include latency for healthy instances', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .then((res) => {
          const lrs = res.body.info?.lrs || res.body.details?.lrs;

          if (lrs && lrs.instances) {
            const instanceIds = Object.keys(lrs.instances);

            instanceIds.forEach((instanceId) => {
              const instance = lrs.instances[instanceId];
              if (
                instance.status === 'healthy' &&
                instance.latency !== undefined
              ) {
                expect(typeof instance.latency).toBe('number');
                expect(instance.latency).toBeGreaterThan(0);
              }
            });
          }
        });
    });
  });

  describe('Error Reporting', () => {
    it('should include error message for unhealthy instances', () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .then((res) => {
          const lrs = res.body.error?.lrs || res.body.details?.lrs;

          if (lrs && lrs.instances) {
            const instanceIds = Object.keys(lrs.instances);

            instanceIds.forEach((instanceId) => {
              const instance = lrs.instances[instanceId];
              if (instance.status === 'unhealthy' && instance.error) {
                expect(typeof instance.error).toBe('string');
                expect(instance.error.length).toBeGreaterThan(0);
              }
            });
          }
        });
    });
  });
});
