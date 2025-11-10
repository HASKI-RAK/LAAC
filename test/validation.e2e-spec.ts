// REQ-FN-024: Input validation E2E tests
// End-to-end tests for global ValidationPipe and DTO validation

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Controller,
  Post,
  Body,
  Get,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { PaginationDto } from '../src/common/dto/pagination.dto';
import { MetricQueryDto } from '../src/metrics/dto/metric-query.dto';
import { CacheInvalidateDto } from '../src/admin/dto/cache-invalidate.dto';
import { ApiTags } from '@nestjs/swagger';

// Test controller to verify validation behavior
@ApiTags('Test')
@Controller('test-validation')
class TestValidationController {
  @Get('pagination')
  testPagination(@Query() query: PaginationDto) {
    return { success: true, data: query };
  }

  @Get('metric-query')
  testMetricQuery(@Query() query: MetricQueryDto) {
    return { success: true, data: query };
  }

  @Post('cache-invalidate')
  testCacheInvalidate(@Body() body: CacheInvalidateDto) {
    return { success: true, data: body };
  }

  @Post('test-whitelist')
  testWhitelist(@Body() body: MetricQueryDto) {
    return { success: true, data: body };
  }
}

describe('REQ-FN-024: Input Validation Pipeline (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TestValidationController],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same ValidationPipe configuration as in main.ts
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

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('PaginationDto validation', () => {
    it('should accept valid pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/test-validation/pagination?page=2&limit=20')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.page).toBe(2);
          expect(res.body.data.limit).toBe(20);
        });
    });

    it('should apply default values when parameters are missing', () => {
      return request(app.getHttpServer())
        .get('/test-validation/pagination')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.page).toBe(1);
          expect(res.body.data.limit).toBe(10);
        });
    });

    it('should transform string to number', () => {
      return request(app.getHttpServer())
        .get('/test-validation/pagination?page=5&limit=50')
        .expect(200)
        .expect((res) => {
          expect(typeof res.body.data.page).toBe('number');
          expect(typeof res.body.data.limit).toBe('number');
        });
    });

    it('should reject page=0 with 400 error', () => {
      return request(app.getHttpServer())
        .get('/test-validation/pagination?page=0')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual(
            expect.arrayContaining([
              expect.stringContaining('page must not be less than 1'),
            ]),
          );
        });
    });

    it('should reject negative page with 400 error', () => {
      return request(app.getHttpServer())
        .get('/test-validation/pagination?page=-1')
        .expect(400);
    });

    it('should reject limit > 100 with 400 error', () => {
      return request(app.getHttpServer())
        .get('/test-validation/pagination?limit=101')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual(
            expect.arrayContaining([
              expect.stringContaining('limit must not be greater than 100'),
            ]),
          );
        });
    });

    it('should reject non-integer page with 400 error', () => {
      return request(app.getHttpServer())
        .get('/test-validation/pagination?page=1.5')
        .expect(400);
    });

    it('should reject non-numeric page with 400 error', () => {
      return request(app.getHttpServer())
        .get('/test-validation/pagination?page=abc')
        .expect(400);
    });
  });

  describe('MetricQueryDto validation', () => {
    it('should accept valid metric query parameters', () => {
      return request(app.getHttpServer())
        .get(
          '/test-validation/metric-query?courseId=course-123&start=2025-01-01T00:00:00.000Z',
        )
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.courseId).toBe('course-123');
          expect(res.body.data.start).toBe('2025-01-01T00:00:00.000Z');
        });
    });

    it('should accept valid dashboard level', () => {
      return request(app.getHttpServer())
        .get('/test-validation/metric-query?level=course')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.level).toBe('course');
        });
    });

    it('should reject invalid ISO 8601 date with 400 error', () => {
      return request(app.getHttpServer())
        .get('/test-validation/metric-query?start=not-a-date')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual(
            expect.arrayContaining([
              expect.stringContaining('start must be a valid ISO 8601 date'),
            ]),
          );
        });
    });

    it('should reject invalid dashboard level with 400 error', () => {
      return request(app.getHttpServer())
        .get('/test-validation/metric-query?level=invalid')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual(
            expect.arrayContaining([expect.stringContaining('level')]),
          );
        });
    });

    it('should accept all valid filters', () => {
      const params = new URLSearchParams({
        courseId: 'course-123',
        topicId: 'topic-456',
        elementId: 'element-789',
        userId: 'user-001',
        start: '2025-01-01T00:00:00.000Z',
        end: '2025-12-31T23:59:59.999Z',
        level: 'topic',
      });

      return request(app.getHttpServer())
        .get(`/test-validation/metric-query?${params.toString()}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.courseId).toBe('course-123');
          expect(res.body.data.topicId).toBe('topic-456');
          expect(res.body.data.level).toBe('topic');
        });
    });
  });

  describe('CacheInvalidateDto validation', () => {
    it('should accept valid cache key', () => {
      return request(app.getHttpServer())
        .post('/test-validation/cache-invalidate')
        .send({ key: 'cache:course-completion:course:123:v1' })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.key).toBe(
            'cache:course-completion:course:123:v1',
          );
        });
    });

    it('should accept valid cache pattern', () => {
      return request(app.getHttpServer())
        .post('/test-validation/cache-invalidate')
        .send({ pattern: 'cache:course-completion:*' })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.pattern).toBe('cache:course-completion:*');
        });
    });

    it('should accept all=true', () => {
      return request(app.getHttpServer())
        .post('/test-validation/cache-invalidate')
        .send({ all: true })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.all).toBe(true);
        });
    });

    it('should reject invalid pattern with special characters', () => {
      return request(app.getHttpServer())
        .post('/test-validation/cache-invalidate')
        .send({ pattern: 'cache:invalid@pattern' })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual(
            expect.arrayContaining([
              expect.stringContaining('Pattern must contain only'),
            ]),
          );
        });
    });
  });

  describe('Whitelist and forbidNonWhitelisted behavior', () => {
    it('should strip unknown properties (whitelist)', () => {
      return request(app.getHttpServer())
        .post('/test-validation/test-whitelist')
        .send({
          courseId: 'course-123',
          unknownProperty: 'should-be-stripped',
          anotherUnknown: 123,
        })
        .expect(400); // forbidNonWhitelisted causes rejection instead of stripping
    });

    it('should reject request with unknown properties when forbidNonWhitelisted is true', () => {
      return request(app.getHttpServer())
        .post('/test-validation/test-whitelist')
        .send({
          courseId: 'course-123',
          hackerField: 'malicious-value',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual(
            expect.arrayContaining([
              expect.stringContaining('property hackerField should not exist'),
            ]),
          );
        });
    });
  });

  describe('Error response format', () => {
    it('should return structured validation error with field details', () => {
      return request(app.getHttpServer())
        .get('/test-validation/pagination?page=0&limit=200')
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('error');
          expect(res.body).toHaveProperty('statusCode');
          expect(res.body.statusCode).toBe(400);
          expect(Array.isArray(res.body.message)).toBe(true);
          expect(res.body.message.length).toBeGreaterThan(0);
        });
    });

    it('should not leak stack traces in validation errors', () => {
      return request(app.getHttpServer())
        .get('/test-validation/pagination?page=invalid')
        .expect(400)
        .expect((res) => {
          expect(res.body).not.toHaveProperty('stack');
          expect(JSON.stringify(res.body)).not.toContain('at ');
        });
    });

    it('should provide meaningful error messages', () => {
      return request(app.getHttpServer())
        .get('/test-validation/pagination?page=0')
        .expect(400)
        .expect((res) => {
          expect(Array.isArray(res.body.message)).toBe(true);
          const messages = res.body.message as string[];
          expect(messages.some((msg) => msg.includes('page'))).toBe(true);
        });
    });
  });

  describe('Type transformation', () => {
    it('should transform string numbers to actual numbers', () => {
      return request(app.getHttpServer())
        .get('/test-validation/pagination?page=5&limit=25')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.page).toBe(5);
          expect(res.body.data.limit).toBe(25);
          expect(typeof res.body.data.page).toBe('number');
          expect(typeof res.body.data.limit).toBe('number');
        });
    });

    it('should transform boolean strings to actual booleans', () => {
      return request(app.getHttpServer())
        .post('/test-validation/cache-invalidate')
        .send({ all: 'true' })
        .expect(201)
        .expect((res) => {
          expect(res.body.data.all).toBe(true);
          expect(typeof res.body.data.all).toBe('boolean');
        });
    });
  });
});
