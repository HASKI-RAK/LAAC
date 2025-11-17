# Testing Guide

This document provides comprehensive information about testing the LAAC (Learning Analytics Adapter Component) application.

## Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [E2E Test Infrastructure](#e2e-test-infrastructure)
- [Deterministic LRS Fixtures](#deterministic-lrs-fixtures)
- [Writing Tests](#writing-tests)
- [Test Helpers and Utilities](#test-helpers-and-utilities)
- [Test Configuration](#test-configuration)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## Overview

LAAC uses **Jest** as the primary testing framework for both unit and end-to-end (E2E) tests. The testing strategy follows NestJS best practices and aims for **80% code coverage** (REQ-NF-020) as a quality baseline.

### Test Coverage Requirements

- **Unit Tests**: Located in `src/**/*.spec.ts` (co-located with source files)
- **E2E Tests**: Located in `test/**/*.e2e-spec.ts`
- **Coverage Target**: 80% overall (REQ-NF-020) - aspirational goal
- **Coverage Baseline**: 55% (prevents regressions, gradually increasing)
- **Coverage Reports**: Generated in `coverage/` directory

---

## Test Types

### 1. Unit Tests

Unit tests validate individual components, services, and utilities in isolation.

```bash
# Run all unit tests
yarn test

# Run unit tests in watch mode
yarn test:watch

# Run unit tests with coverage
yarn test:cov

# Debug unit tests
yarn test:debug
```

**Location**: `src/**/*.spec.ts`

**Naming Convention**: `<component-name>.spec.ts`

### 2. End-to-End (E2E) Tests

E2E tests validate the entire application flow, including HTTP requests, authentication, and integration between modules.

```bash
# Run all E2E tests
yarn test:e2e

# Run specific E2E test file
yarn test:e2e --testPathPattern=health.e2e-spec.ts

# Run E2E tests with coverage
yarn test:e2e --coverage
```

**Location**: `test/**/*.e2e-spec.ts`

**Naming Convention**: `<feature>.e2e-spec.ts`

---

## E2E Test Infrastructure

### Architecture

REQ-FN-018 defines the E2E test infrastructure with the following components:

```
test/
├── helpers/              # Test helper utilities
│   ├── auth.helper.ts    # JWT token generation
│   ├── redis.helper.ts   # Redis test management
│   └── request.helper.ts # HTTP request utilities
├── fixtures/             # Test data fixtures
│   └── users.fixture.ts  # Sample user data
├── constants.ts          # Test configuration constants
├── setup-e2e.ts         # Global E2E test setup
├── jest-e2e.json        # Jest E2E configuration
└── *.e2e-spec.ts        # E2E test files
```

### Test Setup Flow

1. **Global Setup** (`setup-e2e.ts`):
   - Sets environment variables
   - Configures test timeouts (30s)
   - Configures Redis test database (DB 15)

2. **Test Module Creation**:
   - Creates NestJS test application
   - Initializes with AppModule
   - Applies global pipes and interceptors

3. **Test Execution**:
   - Run test cases
   - Use helpers for authentication and requests

4. **Cleanup**:
   - Close application connections
   - Clean up test data

### Test Configuration

**File**: `test/jest-e2e.json`

```json
{
  "testTimeout": 30000, // 30 second timeout for E2E tests
  "testEnvironment": "node", // Node environment
  "testRegex": ".e2e-spec.ts$", // Match E2E test files
  "setupFiles": ["<rootDir>/setup-e2e.ts"]
}
```

---

## Test Helpers and Utilities

### 1. Authentication Helper (`test/helpers/auth.helper.ts`)

Generates JWT tokens for testing authenticated endpoints.

```typescript
import {
  generateJwt,
  generateAnalyticsToken,
  generateAdminToken,
} from './helpers/auth.helper';

// Generate valid token with custom options
const token = generateJwt({
  sub: 'user-123',
  username: 'testuser',
  scopes: ['analytics:read'],
});

// Generate analytics token (analytics:read scope)
const analyticsToken = generateAnalyticsToken();

// Generate admin token (admin:cache, admin:config scopes)
const adminToken = generateAdminToken();

// Generate expired token
const expiredToken = generateJwt({ expired: true });

// Generate invalid token
const invalidToken = generateJwt({ invalid: true });
```

### 2. Request Helper (`test/helpers/request.helper.ts`)

Simplifies making authenticated HTTP requests in tests.

```typescript
import { authenticatedGet, authenticatedPost } from './helpers/request.helper';

// Authenticated GET request
await authenticatedGet(app, '/api/v1/metrics', {
  scopes: ['analytics:read'],
}).expect(200);

// Authenticated POST request
await authenticatedPost(
  app,
  '/api/v1/metrics',
  {
    metricId: 'test-metric',
  },
  {
    scopes: ['analytics:write'],
  },
).expect(201);
```

### 3. Redis Helper (`test/helpers/redis.helper.ts`)

Manages test Redis instances (optional - most tests use in-memory storage).

````typescript
import { setupTestRedis, cleanupTestRedis, clearTestRedis } from './helpers/redis.helper';

// Setup Redis for tests
const redis = await setupTestRedis();

## Deterministic LRS Fixtures

Deterministic seeding keeps metrics-focused E2E tests stable and traceable (REQ-FN-005, REQ-FN-018). Each run loads a small, representative xAPI dataset into the local LRS before any specs execute.

### Fixture Layout

- `test/fixtures/xapi/course-mvp.json` — course-level statements for completion and engagement scenarios
- `test/fixtures/xapi/topic-mvp.json` — topic-level quiz attempts with scored verbs for mastery calculations
- `test/fixtures/xapi/element-mvp.json` — element-level interactions for fine-grained metrics and future expansion

You can add additional files alongside these defaults; the seeding script aggregates all selected fixtures.

### Automation Flow

1. `test/jest-e2e.json` registers `test/global-setup.js` as `globalSetup`.
2. The setup step imports `seedTestLRS()` from `scripts/seed-test-lrs.js`, loads the fixtures, waits for `/xapi/about`, and posts the statements.
3. `yarn test:e2e` (and CI) therefore run against a predictable dataset unless you explicitly opt out.

### Configuration Flags

- `SKIP_LRS_SEED=true yarn test:e2e` — bypass seeding when the LRS already contains the desired data.
- `LRS_FIXTURES="test/fixtures/xapi/course-mvp.json" yarn test:e2e` — override the default file list with a comma-separated set of absolute or repo-relative paths.
- `LRS_POST_READY_DELAY_MS=0 node scripts/seed-test-lrs.js` — shorten or disable the warm-up delay once the LRS is already responsive.

To refresh the dataset manually (e.g., while editing fixtures), run:

```bash
node scripts/seed-test-lrs.js
````

The script logs which files were ingested and how many statements were inserted, making it easy to verify coverage against `docs/SRS.md` requirements.

---

// Clear test data between tests
await clearTestRedis();

// Cleanup Redis after tests
await cleanupTestRedis();

````

### 4. Test Fixtures (`test/fixtures/users.fixture.ts`)

Provides sample test data with different permission levels.

```typescript
import { TEST_USERS, getTestUser } from './fixtures/users.fixture';

// Get user with analytics permissions
const analyticsUser = getTestUser('ANALYTICS_USER');

// Get super admin
const superAdmin = getTestUser('SUPER_ADMIN');
````

### 5. Test Constants (`test/constants.ts`)

Centralized test configuration values.

```typescript
import { TEST_CONFIG, TEST_SCOPES, TEST_ENDPOINTS } from './constants';

// Use test configuration
const redisHost = TEST_CONFIG.REDIS_HOST;
const timeout = TEST_CONFIG.DEFAULT_TIMEOUT;

// Use predefined endpoints
const metricsUrl = TEST_ENDPOINTS.METRICS_CATALOG;

// Use predefined scopes
const analyticsScope = TEST_SCOPES.ANALYTICS_READ;
```

---

## Writing Tests

### E2E Test Structure

```typescript
// REQ-FN-XXX: Feature Name - E2E Tests
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { generateJwt } from './helpers/auth.helper';

describe('REQ-FN-XXX: Feature Name (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /endpoint', () => {
    it('should return 200 with valid authentication', async () => {
      const token = generateJwt({ scopes: ['analytics:read'] });

      return request(app.getHttpServer())
        .get('/api/v1/endpoint')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
        });
    });

    it('should return 401 without authentication', async () => {
      return request(app.getHttpServer()).get('/api/v1/endpoint').expect(401);
    });
  });
});
```

### Unit Test Structure

```typescript
// REQ-FN-XXX: Feature Name - Unit Tests
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('REQ-FN-XXX: MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('myMethod', () => {
    it('should return expected value', () => {
      const result = service.myMethod();
      expect(result).toBe('expected');
    });
  });
});
```

### Unit Test Utilities

**Location**: `src/common/testing/`

The project provides shared testing utilities to simplify unit test setup and reduce boilerplate code.

#### 1. Test Module Helpers (`test-utils.ts`)

```typescript
import {
  createTestingModule,
  getTestService,
  createMockProvider,
  createSpyObj,
} from '@/common/testing';

// Create a testing module with providers
const module = await createTestingModule({
  providers: [MyService, { provide: LoggerService, useValue: mockLogger }],
});

// Create and retrieve service in one call
const service = await getTestService(
  { providers: [MyService, mockLoggerProvider] },
  MyService,
);

// Create a mock provider
const mockLoggerProvider = createMockProvider(LoggerService, {
  log: jest.fn(),
  error: jest.fn(),
});

// Create a spy object with multiple methods
const loggerSpy = createSpyObj(['log', 'error', 'warn']);
```

#### 2. Mock Logger (`mock-logger.ts`)

```typescript
import {
  createMockLogger,
  getMockLoggerProvider,
  createSilentLogger,
} from '@/common/testing';

// Create mock logger with jest.fn() methods
const mockLogger = createMockLogger();
await mockLogger.log('Test message');
expect(mockLogger.log).toHaveBeenCalledWith('Test message');

// Use as provider in testing module
const module = await Test.createTestingModule({
  providers: [MyService, getMockLoggerProvider()],
}).compile();

// Create silent logger for tests that don't need logging verification
const silentLogger = createSilentLogger();
```

#### 3. Mock Cache/Redis (`mock-cache.ts`)

```typescript
import {
  createMockRedis,
  createMockCache,
  getMockCacheProvider,
  getMockRedisProvider,
} from '@/common/testing';

// Mock Redis client with in-memory storage
const mockRedis = createMockRedis();
await mockRedis.set('key', 'value', 'EX', 3600);
const value = await mockRedis.get('key');
expect(value).toBe('value');

// Mock cache service
const mockCache = createMockCache();
await mockCache.set('metric:123', { data: 'value' });
const cached = await mockCache.get('metric:123');

// Use as provider
const module = await Test.createTestingModule({
  providers: [
    MyService,
    getMockCacheProvider('ICacheService'),
    getMockRedisProvider('REDIS_CLIENT'),
  ],
}).compile();
```

#### 4. Test Fixtures (`fixtures/test-data.ts`)

```typescript
import {
  TEST_USERS,
  TEST_METRICS,
  TEST_XAPI_STATEMENTS,
  getTestUser,
  getTestMetric,
  createTestStatement,
} from '@/common/testing';

// Use predefined test users
const analyticsUser = getTestUser('ANALYTICS_USER');
const superAdmin = getTestUser('SUPER_ADMIN');

// Use predefined test metrics
const courseMetric = getTestMetric('COURSE_COMPLETION');

// Use xAPI statement fixtures
const statement = TEST_XAPI_STATEMENTS[0];

// Create custom xAPI statement
const customStatement = createTestStatement({
  actor: { name: 'Custom Actor' },
});
```

### Testing Patterns

#### 1. Authentication Testing

```typescript
it('should deny access without auth token', async () => {
  return request(app.getHttpServer()).get('/api/v1/protected').expect(401);
});

it('should deny access with invalid token', async () => {
  return request(app.getHttpServer())
    .get('/api/v1/protected')
    .set('Authorization', 'Bearer invalid.token')
    .expect(401);
});

it('should allow access with valid token', async () => {
  const token = generateJwt({ scopes: ['analytics:read'] });
  return request(app.getHttpServer())
    .get('/api/v1/protected')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
});
```

#### 2. Authorization Testing

```typescript
it('should deny access without required scope', async () => {
  const token = generateJwt({ scopes: ['other:scope'] });
  return request(app.getHttpServer())
    .get('/api/v1/metrics')
    .set('Authorization', `Bearer ${token}`)
    .expect(403);
});

it('should allow access with required scope', async () => {
  const token = generateJwt({ scopes: ['analytics:read'] });
  return request(app.getHttpServer())
    .get('/api/v1/metrics')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
});
```

#### 3. Validation Testing

```typescript
it('should reject invalid request body', async () => {
  const token = generateJwt({ scopes: ['analytics:write'] });
  return request(app.getHttpServer())
    .post('/api/v1/metrics')
    .set('Authorization', `Bearer ${token}`)
    .send({ invalid: 'data' })
    .expect(400)
    .expect((res) => {
      expect(res.body.message).toContain('validation');
    });
});
```

---

## Jest Configuration

**REQ-NF-020**: The project uses Jest with TypeScript support and enforces 80% code coverage threshold.

### Configuration File

**File**: `jest.config.js` (root directory)

**Coverage Target**: The project aims for 80% code coverage (REQ-NF-020) as a quality baseline. The current threshold is set to prevent regressions while the codebase is being developed, and will be gradually increased to 80%.

```javascript
module.exports = {
  // TypeScript support via ts-jest
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  // Test file pattern
  testRegex: '.*\\.spec\\.ts$',

  // Coverage thresholds - gradually increasing to 80% target
  coverageThreshold: {
    global: {
      branches: 55, // Target: 80%
      functions: 45, // Target: 80%
      lines: 55, // Target: 80%
      statements: 55, // Target: 80%
    },
  },

  // Files excluded from coverage
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts', // Test files
    '!**/*.interface.ts', // Type definitions
    '!**/*.dto.ts', // DTOs (validated via class-validator)
    '!**/index.ts', // Barrel exports
    '!main.ts', // Application entry point
    '!**/testing/**', // Test utilities and fixtures
  ],
};
```

### Viewing Configuration

To see the complete Jest configuration:

```bash
yarn test --showConfig
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:

- **HTML Report**: `coverage/lcov-report/index.html` (open in browser)
- **LCOV Report**: `coverage/lcov.info` (for CI tools)
- **Console Summary**: Displayed after running `yarn test:cov`

The coverage threshold ensures that:

- Code coverage does not regress below current baseline
- New code should include adequate test coverage
- Critical paths (authentication, validation, metrics) are well-tested
- Gradual improvement toward 80% target (REQ-NF-020)

**Current Coverage**: ~55% (see latest coverage report)  
**Target Coverage**: 80% (REQ-NF-020)

Tests will **fail** if coverage drops below the configured thresholds, preventing regressions.

---

## Test Configuration

### Environment Variables

E2E tests use the following environment variables (configured in `test/setup-e2e.ts`):

```bash
NODE_ENV=test
JWT_SECRET=test-jwt-secret-min-32-characters-long-for-testing
LRS_URL=https://test-lrs.example.com/xapi
LRS_API_KEY=test-lrs-api-key
LOG_LEVEL=error
AUTH_ENABLED=true
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Optional: Redis for advanced testing
TEST_REDIS_HOST=localhost
TEST_REDIS_PORT=6379
TEST_REDIS_DB=15
```

### Test Isolation

- E2E tests use **database 15** for Redis (separate from production)
- Each test suite creates a fresh NestJS application instance
- Tests should clean up resources in `afterAll` hooks
- Use `beforeEach` for test-specific setup
- Use `afterEach` for test-specific cleanup

---

## CI/CD Integration

### GitHub Actions Workflow

REQ-FN-015: E2E tests run in the CI/CD pipeline.

**File**: `.github/workflows/ci-cd.yml`

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - name: Run E2E tests
      run: yarn test:e2e
```

### Test Execution Order

1. **Linting** (`yarn lint`)
2. **Unit Tests** (`yarn test`)
3. **E2E Tests** (`yarn test:e2e`)
4. **Coverage Report** (`yarn test:cov`)
5. **Build** (`yarn build`)

---

## Troubleshooting

### Common Issues

#### 1. Test Timeout

**Error**: `Exceeded timeout of 5000 ms`

**Solution**: E2E tests have a 30-second timeout. If tests still timeout, increase the timeout:

```typescript
it('long running test', async () => {
  // Test code
}, 60000); // 60 second timeout
```

#### 2. Redis Connection Error

**Error**: `Redis connection failed`

**Solution**: Most tests use in-memory storage and don't require Redis. If Redis is needed:

```bash
# Start Redis with Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or use Docker Compose (if configured)
docker-compose -f docker-compose.test.yml up -d redis
```

#### 3. Application Not Closing

**Error**: `Jest did not exit one second after the test run`

**Solution**: Ensure all connections are closed in `afterAll`:

```typescript
afterAll(async () => {
  await app.close();
});
```

#### 4. Module Resolution Error

**Error**: `Cannot find module '@/...'`

**Solution**: Ensure `moduleNameMapper` is configured in `jest-e2e.json`:

```json
{
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/../src/$1"
  }
}
```

---

## Best Practices

### 1. Test Naming

- Use descriptive test names that explain **what** is being tested
- Reference requirement IDs in describe blocks: `REQ-FN-XXX: Feature`
- Follow pattern: `it('should <expected behavior> when <condition>')`

### 2. Test Organization

- Group related tests in `describe` blocks
- Use `beforeAll` for expensive setup (app creation)
- Use `beforeEach` for test-specific setup
- Use `afterAll` for cleanup (close connections)
- Use `afterEach` for test-specific cleanup

### 3. Assertions

- Use clear, specific assertions
- Test both success and failure cases
- Validate response structure, not just status codes
- Use `expect.objectContaining()` for partial matches

### 4. Test Independence

- Tests should not depend on execution order
- Each test should set up its own data
- Clean up test data after execution
- Avoid shared mutable state

### 5. Performance

- Reuse application instances in `beforeAll` when possible
- Avoid unnecessary database operations
- Use in-memory storage for non-critical tests
- Keep tests fast and focused

---

## Coverage Reports

Generate and view coverage reports:

```bash
# Generate coverage report
yarn test:cov

# View HTML report
open coverage/lcov-report/index.html
```

Coverage reports show:

- Line coverage
- Branch coverage
- Function coverage
- Uncovered lines

---

## Additional Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Project SRS Requirements](docs/srs/)
- [Architecture Documentation](docs/architecture/)

---

## Related Requirements

- **REQ-FN-018**: E2E Test Setup & Configuration
- **REQ-NF-020**: 80% Code Coverage Target
- **REQ-FN-015**: CI/CD Pipeline Integration
- **REQ-FN-023**: Authentication Testing
- **REQ-FN-024**: Rate Limiting Testing

---

_Last Updated: 2025-11-12_
