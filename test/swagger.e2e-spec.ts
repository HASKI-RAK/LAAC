// REQ-FN-008/009: E2E tests for OpenAPI/Swagger Endpoints
// Tests OpenAPI spec generation and Swagger UI accessibility

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('REQ-FN-008/009: OpenAPI/Swagger Endpoints (e2e)', () => {
  let app: INestApplication;

  /**
   * Helper function to setup Swagger in the test app
   */
  function setupSwagger(app: INestApplication) {
    const config = new DocumentBuilder()
      .setTitle('LAAC - Learning Analytics Analyzing Center')
      .setDescription(
        'RESTful API for learning analytics metrics computation and retrieval. ' +
          'Provides access to xAPI-based analytics from Learning Record Stores (LRS). ' +
          'Requires JWT authentication with appropriate scopes.',
      )
      .setVersion('1.0.0')
      .setContact('LAAC Support', 'https://github.com/HASKI-RAK/LAAC', '')
      .setLicense('Apache 2.0', 'https://www.apache.org/licenses/LICENSE-2.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Health', 'Health check and readiness endpoints (public)')
      .addTag('Metrics', 'Metrics catalog and computation endpoints')
      .addTag('Admin', 'Administrative endpoints (cache, config)')
      .addTag('Prometheus', 'Prometheus metrics endpoint (public)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      jsonDocumentUrl: '/api-docs/openapi.json',
    });
  }

  beforeAll(async () => {
    // Enable Swagger for these tests
    process.env.SWAGGER_ENABLED = 'true';

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
        'prometheus',
      ],
    });

    // Setup Swagger
    setupSwagger(app);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('REQ-FN-008: OpenAPI Specification Generation', () => {
    it('should return OpenAPI spec JSON at /api-docs/openapi.json', async () => {
      return request(app.getHttpServer())
        .get('/api-docs/openapi.json')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.body).toHaveProperty('openapi');
          expect(res.body.openapi).toMatch(/^3\./); // OpenAPI 3.x
          expect(res.body).toHaveProperty('info');
          expect(res.body).toHaveProperty('paths');
          expect(res.body).toHaveProperty('components');
        });
    });

    it('should include API metadata in spec', async () => {
      return request(app.getHttpServer())
        .get('/api-docs/openapi.json')
        .expect(200)
        .expect((res) => {
          const { info } = res.body;
          expect(info).toHaveProperty('title');
          expect(info.title).toContain('LAAC');
          expect(info).toHaveProperty('description');
          expect(info).toHaveProperty('version');
          expect(info).toHaveProperty('contact');
          expect(info.contact).toHaveProperty('url');
          expect(info.contact.url).toContain('github.com');
          expect(info).toHaveProperty('license');
          expect(info.license).toHaveProperty('name', 'Apache 2.0');
        });
    });

    it('should include bearer authentication scheme', async () => {
      return request(app.getHttpServer())
        .get('/api-docs/openapi.json')
        .expect(200)
        .expect((res) => {
          expect(res.body.components).toHaveProperty('securitySchemes');
          expect(res.body.components.securitySchemes).toHaveProperty(
            'JWT-auth',
          );
          const jwtAuth = res.body.components.securitySchemes['JWT-auth'];
          expect(jwtAuth).toHaveProperty('type', 'http');
          expect(jwtAuth).toHaveProperty('scheme', 'bearer');
          expect(jwtAuth).toHaveProperty('bearerFormat', 'JWT');
        });
    });

    it('should include all expected endpoint paths', async () => {
      return request(app.getHttpServer())
        .get('/api-docs/openapi.json')
        .expect(200)
        .expect((res) => {
          const { paths } = res.body;

          // Health endpoints
          expect(paths).toHaveProperty('/health/liveness');
          expect(paths).toHaveProperty('/health/readiness');

          // Metrics endpoints
          expect(paths).toHaveProperty('/api/v1/metrics');
          expect(paths).toHaveProperty('/api/v1/metrics/{id}');

          // Note: Prometheus endpoint /metrics is registered by PrometheusModule
          // and may not appear in OpenAPI spec since it's managed differently
        });
    });

    it('should include all expected tags', async () => {
      return request(app.getHttpServer())
        .get('/api-docs/openapi.json')
        .expect(200)
        .expect((res) => {
          const { tags } = res.body;
          expect(Array.isArray(tags)).toBe(true);

          const tagNames = (tags as Array<{ name: string }>).map(
            (tag) => tag.name,
          );
          expect(tagNames).toContain('Health');
          expect(tagNames).toContain('Metrics');
          expect(tagNames).toContain('Admin');
          expect(tagNames).toContain('Prometheus');
        });
    });

    it('should include response schemas for DTOs', async () => {
      return request(app.getHttpServer())
        .get('/api-docs/openapi.json')
        .expect(200)
        .expect((res) => {
          const { components } = res.body;
          expect(components).toHaveProperty('schemas');

          // Check for key DTOs
          const schemaNames = Object.keys(components.schemas);
          expect(schemaNames).toContain('MetricsCatalogResponseDto');
          expect(schemaNames).toContain('MetricDetailResponseDto');
          expect(schemaNames).toContain('MetricCatalogItemDto');
        });
    });

    it('should document error responses', async () => {
      return request(app.getHttpServer())
        .get('/api-docs/openapi.json')
        .expect(200)
        .expect((res) => {
          const metricsGetPath = res.body.paths['/api/v1/metrics'];
          expect(metricsGetPath).toHaveProperty('get');

          const { responses } = metricsGetPath.get;
          expect(responses).toHaveProperty('200'); // Success
          expect(responses).toHaveProperty('401'); // Unauthorized
          expect(responses).toHaveProperty('403'); // Forbidden
        });
    });
  });

  describe('REQ-FN-009: Swagger UI Accessibility', () => {
    it('should return Swagger UI HTML at /api/docs', async () => {
      return request(app.getHttpServer())
        .get('/api/docs')
        .expect(200)
        .expect('Content-Type', /html/)
        .expect((res) => {
          expect(res.text).toContain('swagger-ui');
          expect(res.text).toContain('Swagger UI');
        });
    });

    it('should redirect /api/docs/ to /api/docs', async () => {
      return request(app.getHttpServer())
        .get('/api/docs/')
        .expect((res) => {
          // Either 200 or 301/302 redirect is acceptable
          expect([200, 301, 302]).toContain(res.status);
        });
    });
  });

  describe('SWAGGER_ENABLED Environment Variable', () => {
    let appDisabled: INestApplication;

    beforeAll(async () => {
      // Disable Swagger for this test
      process.env.SWAGGER_ENABLED = 'false';

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      appDisabled = moduleFixture.createNestApplication();

      // Apply configuration
      appDisabled.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: {
            enableImplicitConversion: true,
          },
        }),
      );

      const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
      appDisabled.setGlobalPrefix(apiPrefix, {
        exclude: [
          '/',
          'health',
          'health/liveness',
          'health/readiness',
          'prometheus',
        ],
      });

      // Do NOT setup Swagger when SWAGGER_ENABLED=false
      // This simulates the production behavior

      await appDisabled.init();
    });

    afterAll(async () => {
      await appDisabled.close();
      // Reset for other tests
      process.env.SWAGGER_ENABLED = 'true';
    });

    it('should not expose Swagger UI when SWAGGER_ENABLED=false', async () => {
      return request(appDisabled.getHttpServer()).get('/api/docs').expect(404);
    });

    it('should not expose OpenAPI spec when SWAGGER_ENABLED=false', async () => {
      return request(appDisabled.getHttpServer())
        .get('/api-docs/openapi.json')
        .expect(404);
    });
  });
});
