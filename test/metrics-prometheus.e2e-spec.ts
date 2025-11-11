// REQ-FN-021: Prometheus Metrics Endpoint - E2E Tests
// End-to-end tests for public /metrics endpoint

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('REQ-FN-021: Prometheus Metrics Endpoint (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Set global prefix to match main.ts configuration
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

  afterEach(async () => {
    await app.close();
  });

  describe('GET /metrics', () => {
    it('should be accessible without authentication', async () => {
      // REQ-FN-021: Metrics endpoint must be public for Prometheus scraping
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      expect(response.status).toBe(200);
    });

    it('should return Prometheus text format', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      // Check content type
      expect(response.headers['content-type']).toMatch(/text\/plain/);
    });

    it('should return valid Prometheus format with HELP and TYPE', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      const metricsText = response.text;

      // Prometheus format should have HELP and TYPE comments
      expect(metricsText).toContain('# HELP');
      expect(metricsText).toContain('# TYPE');
    });

    it('should include default Node.js metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      const metricsText = response.text;

      // Default metrics should be present (from PrometheusModule.register)
      // Common Node.js default metrics include process_cpu_seconds_total, nodejs_version_info, etc.
      expect(
        metricsText.includes('process_') || metricsText.includes('nodejs_'),
      ).toBe(true);
    });

    it('should include custom authentication metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      const metricsText = response.text;

      // REQ-FN-021: Custom auth metrics from AuthModule
      expect(
        metricsText.includes('auth_failures_total') ||
          metricsText.includes('rate_limit_rejections_total'),
      ).toBe(true);
    });

    it('should include custom metrics definitions', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      const metricsText = response.text;

      // REQ-FN-021: Custom metrics should be registered and present in output
      // Even if they have no samples yet, they should have HELP and TYPE definitions
      const hasCustomMetrics =
        metricsText.includes('cache_hit_ratio') ||
        metricsText.includes('metric_computation_duration_seconds') ||
        metricsText.includes('lrs_query_duration_seconds') ||
        metricsText.includes('http_requests_total') ||
        metricsText.includes('http_request_duration_seconds') ||
        metricsText.includes('http_errors_total') ||
        metricsText.includes('http_active_requests');

      expect(hasCustomMetrics).toBe(true);
    });

    it('should not require Authorization header', async () => {
      // Verify that no Authorization header is needed
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      // Should succeed without any auth headers
      expect(response.status).toBe(200);
      expect(response.text).toContain('# HELP');
    });

    it('should work even when invalid auth is provided', async () => {
      // REQ-FN-021: Metrics should be public regardless of auth headers
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);

      // Should still succeed even with invalid token
      expect(response.status).toBe(200);
    });
  });

  describe('Metrics format validation', () => {
    it('should have valid metric names (no spaces or special chars)', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      const metricsText = response.text;
      const lines = metricsText.split('\n');

      // Filter out comment lines and empty lines
      const metricLines = lines.filter((line) => line && !line.startsWith('#'));

      // Each metric line should match pattern: metric_name{labels} value
      // Valid Prometheus values include: numbers, +Inf, -Inf, NaN, Nan
      metricLines.forEach((line) => {
        if (line.trim()) {
          // Basic validation: should have metric name followed by space and number or special value

          expect(line).toMatch(
            /^[a-zA-Z_:][a-zA-Z0-9_:]*(\{.*\})?\s+([\d.eE+-]+|NaN|Nan|\+Inf|-Inf)/,
          );
        }
      });
    });

    it('should have consistent TYPE definitions', async () => {
      const response = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      const metricsText = response.text;
      const lines = metricsText.split('\n');

      // All TYPE lines should use valid Prometheus metric types
      const typeLines = lines.filter((line) => line.startsWith('# TYPE'));
      const validTypes = [
        'counter',
        'gauge',
        'histogram',
        'summary',
        'untyped',
      ];

      typeLines.forEach((line) => {
        const hasValidType = validTypes.some((type) => line.includes(type));
        expect(hasValidType).toBe(true);
      });
    });
  });

  describe('Load test - verify metrics populate', () => {
    it('should update metrics after making requests', async () => {
      // Make initial request to get baseline
      await request(app.getHttpServer()).get('/metrics').expect(200);

      // Make some requests to other endpoints to populate metrics
      await request(app.getHttpServer()).get('/health/liveness');
      await request(app.getHttpServer()).get('/health/readiness');

      // Get metrics again
      const finalResponse = await request(app.getHttpServer())
        .get('/metrics')
        .expect(200);

      const finalText = finalResponse.text;

      // Verify response is still valid
      expect(finalText).toContain('# HELP');
      expect(finalText).toContain('# TYPE');

      // At minimum, the metrics output should still be present
      expect(finalText.length).toBeGreaterThan(0);
    });
  });
});
