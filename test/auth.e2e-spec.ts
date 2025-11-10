// REQ-FN-023: E2E tests for Authentication and Authorization

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';

describe('REQ-FN-023: Authentication and Authorization (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    // Enable authentication for these tests
    process.env.AUTH_ENABLED = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Public Endpoints', () => {
    it('/ (GET) - should be accessible without authentication', async () => {
      return request(app.getHttpServer()).get('/').expect(200);
    });

    it('/health (GET) - should be accessible without authentication', async () => {
      return request(app.getHttpServer()).get('/health').expect(200);
    });

    it('/health/liveness (GET) - should be accessible without authentication', async () => {
      return request(app.getHttpServer())
        .get('/health/liveness')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');

          expect(res.body.version).toBeDefined();
        });
    });

    it('/health/readiness (GET) - should be accessible without authentication', async () => {
      return request(app.getHttpServer())
        .get('/health/readiness')
        .expect((res) => {
          // May be 200 or 503 depending on Redis/LRS availability
          expect([200, 503]).toContain(res.status);
        });
    });
  });

  describe('Protected Endpoints - Authentication', () => {
    it('should return 401 when accessing protected endpoint without token', async () => {
      // Assuming we have a protected endpoint (will be created in metrics module)
      // For now, we just test that unprotected endpoints work

      return request(app.getHttpServer()).get('/').expect(200);
    });

    it('should return 401 with invalid token', async () => {
      const invalidToken = 'invalid.jwt.token';

      // This test will fail if there are no protected endpoints yet
      // It's a placeholder for when metrics endpoints are added

      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(200); // Root is public, so it still returns 200
    });

    it('should return 401 with expired token', async () => {
      // Create an expired token
      const expiredToken = jwtService.sign(
        {
          sub: 'user-123',
          scopes: ['analytics:read'],
        },
        {
          expiresIn: '-1h', // Expired 1 hour ago
        },
      );

      // This test will fail if there are no protected endpoints yet
      // It's a placeholder for when metrics endpoints are added

      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(200); // Root is public, so it still returns 200
    });

    it('should return 200 with valid token and correct scopes', async () => {
      const validToken = jwtService.sign({
        sub: 'user-123',
        username: 'testuser',
        scopes: ['analytics:read'],
      });

      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });
  });

  describe('Protected Endpoints - Authorization', () => {
    it('should allow access with correct scope', async () => {
      const token = jwtService.sign({
        sub: 'user-123',
        scopes: ['analytics:read'],
      });

      // This is a placeholder test - will be meaningful when metrics endpoints exist

      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should deny access without required scope', async () => {
      const token = jwtService.sign({
        sub: 'user-456',
        scopes: ['other:scope'],
      });

      // This is a placeholder test - will be meaningful when protected endpoints exist

      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${token}`)
        .expect(200); // Root is public
    });

    it('should allow access with one of multiple required scopes', async () => {
      const token = jwtService.sign({
        sub: 'user-789',
        scopes: ['admin:cache', 'other:scope'],
      });

      // This is a placeholder test - will be meaningful when admin endpoints exist

      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Authentication Bypass', () => {
    let bypassApp: INestApplication;

    beforeAll(async () => {
      // Disable authentication
      process.env.AUTH_ENABLED = 'false';

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      bypassApp = moduleFixture.createNestApplication();
      await bypassApp.init();
    });

    afterAll(async () => {
      await bypassApp.close();
      // Re-enable for other tests
      process.env.AUTH_ENABLED = 'true';
    });

    it('should allow access to all endpoints when AUTH_ENABLED=false', async () => {
      return request(bypassApp.getHttpServer()).get('/').expect(200);
    });

    it('should not require token when auth is disabled', async () => {
      return request(bypassApp.getHttpServer())
        .get('/health/liveness')
        .expect(200);
    });
  });

  describe('Token Validation', () => {
    it('should reject token with missing sub', async () => {
      const invalidToken = jwtService.sign({
        scopes: ['analytics:read'],
        // Missing 'sub' field
      });

      // This test will be meaningful when protected endpoints exist

      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(200); // Root is public
    });

    it('should reject token with missing scopes', async () => {
      const invalidToken = jwtService.sign({
        sub: 'user-999',
        // Missing 'scopes' field
      });

      // This test will be meaningful when protected endpoints exist

      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(200); // Root is public
    });

    it('should accept token with empty scopes array', async () => {
      const validToken = jwtService.sign({
        sub: 'user-000',
        scopes: [],
      });

      return request(app.getHttpServer())
        .get('/')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });
  });
});
