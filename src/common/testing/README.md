# Testing Utilities - REQ-NF-020

This directory contains shared testing utilities, mock implementations, and fixtures to simplify unit test creation and reduce boilerplate code.

## Quick Reference

```typescript
import {
  // Module creation helpers
  createTestingModule,
  getTestService,
  createMockProvider,
  createSpyObj,
  clearAllMocks,
  restoreAllMocks,

  // Mock implementations
  createMockLogger,
  getMockLoggerProvider,
  createSilentLogger,
  createMockRedis,
  createMockCache,
  getMockCacheProvider,
  getMockRedisProvider,

  // Test fixtures
  TEST_USERS,
  TEST_METRICS,
  TEST_XAPI_STATEMENTS,
  TEST_METRIC_QUERIES,
  TEST_CACHE_KEYS,
  TEST_ERRORS,
  getTestUser,
  getTestMetric,
  createTestStatement,
} from '@/common/testing';
```

## File Structure

```
src/common/testing/
├── index.ts                    # Barrel export for all utilities
├── test-utils.ts               # Module creation helpers
├── mock-logger.ts              # LoggerService mock implementations
├── mock-cache.ts               # Redis/Cache mock implementations
└── fixtures/
    └── test-data.ts            # Test data and fixtures
```

## Usage Examples

### Basic Service Test

```typescript
import { Test } from '@nestjs/testing';
import { createMockLogger } from '@/common/testing';
import { MyService } from './my.service';
import { LoggerService } from '@/core/logger';

describe('MyService', () => {
  let service: MyService;
  const mockLogger = createMockLogger();

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MyService, { provide: LoggerService, useValue: mockLogger }],
    }).compile();

    service = module.get<MyService>(MyService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log messages', () => {
    service.doSomething();
    expect(mockLogger.log).toHaveBeenCalledWith('Expected message');
  });
});
```

### Service with Cache

```typescript
import { createMockCache, getMockCacheProvider } from '@/common/testing';

describe('CachedService', () => {
  let service: CachedService;
  let mockCache: ReturnType<typeof createMockCache>;

  beforeEach(async () => {
    mockCache = createMockCache();

    const module = await Test.createTestingModule({
      providers: [
        CachedService,
        { provide: 'ICacheService', useValue: mockCache },
      ],
    }).compile();

    service = module.get<CachedService>(CachedService);
  });

  it('should cache results', async () => {
    await mockCache.set('key', { data: 'value' });
    const result = await service.getData('key');

    expect(mockCache.get).toHaveBeenCalledWith('key');
    expect(result).toEqual({ data: 'value' });
  });
});
```

### Using Test Fixtures

```typescript
import { getTestUser, getTestMetric, TEST_USERS } from '@/common/testing';

describe('Authorization Tests', () => {
  it('should have correct scopes for analytics user', () => {
    const user = getTestUser('ANALYTICS_USER');
    expect(user.scopes).toContain('analytics:read');
    expect(user.userId).toBe('user-analytics-001');
  });

  it('should have super admin with all scopes', () => {
    const admin = getTestUser('SUPER_ADMIN');
    expect(admin.scopes).toContain('analytics:read');
    expect(admin.scopes).toContain('admin:cache');
  });

  it('should use course completion metric', () => {
    const metric = getTestMetric('COURSE_COMPLETION');
    expect(metric.id).toBe('course-completion');
    expect(metric.dashboardLevel).toBe('course');
  });
});
```

### Redis Mock Example

```typescript
import { createMockRedis } from '@/common/testing';

describe('RedisService', () => {
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    mockRedis = createMockRedis();
  });

  it('should set and get values', async () => {
    await mockRedis.set('key', 'value');
    const result = await mockRedis.get('key');
    expect(result).toBe('value');
  });

  it('should support expiration', async () => {
    await mockRedis.set('key', 'value', 'EX', 3600);
    const ttl = await mockRedis.ttl('key');
    expect(ttl).toBeGreaterThan(0);
  });

  it('should support pattern matching', async () => {
    await mockRedis.set('cache:metric:1', 'value1');
    await mockRedis.set('cache:metric:2', 'value2');
    const keys = await mockRedis.keys('cache:metric:*');
    expect(keys).toHaveLength(2);
  });
});
```

## Test Patterns

### Setup and Teardown

```typescript
describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    // Create fresh module for each test
    const module = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
    jest.clearAllMocks(); // Clear mock call history
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Restore original implementations
  });
});
```

### Mock Provider Pattern

```typescript
import { createMockProvider, createSpyObj } from '@/common/testing';

// Create a provider with specific mock implementation
const mockCacheProvider = createMockProvider('ICacheService', {
  get: jest.fn().mockResolvedValue({ data: 'cached' }),
  set: jest.fn().mockResolvedValue(true),
});

// Create a spy object with multiple methods
const apiClientSpy = createSpyObj(['get', 'post', 'put', 'delete']);
```

## Available Fixtures

### Users

- `ANALYTICS_USER` - User with `analytics:read` scope
- `ANALYTICS_ADMIN` - User with `analytics:read` and `analytics:write` scopes
- `CACHE_ADMIN` - User with `admin:cache` scope
- `CONFIG_ADMIN` - User with `admin:config` scope
- `SUPER_ADMIN` - User with all scopes
- `NO_SCOPES_USER` - User with no scopes

### Metrics

- `COURSE_COMPLETION` - Course-level completion metric
- `TOPIC_ENGAGEMENT` - Topic-level engagement metric
- `ELEMENT_VIEWS` - Element-level views metric

### xAPI Statements

- `TEST_XAPI_STATEMENTS` - Array of sample xAPI statements
- Use `createTestStatement(overrides)` to create custom statements

## Best Practices

1. **Import from index**: Always import from `@/common/testing` for consistency
2. **Clear mocks**: Use `jest.clearAllMocks()` in `beforeEach` to reset call history
3. **Restore mocks**: Use `jest.restoreAllMocks()` in `afterEach` to restore originals
4. **Use fixtures**: Reuse provided fixtures instead of creating test data in tests
5. **Mock at boundaries**: Mock external dependencies (cache, database, HTTP clients)
6. **Test behavior, not implementation**: Focus on what the code does, not how it does it

## Coverage Guidelines

- **Target**: 80% code coverage (REQ-NF-020)
- **Current**: 55% baseline
- **Run coverage**: `yarn test:cov`
- **View report**: `open coverage/lcov-report/index.html`

Coverage thresholds are configured in `jest.config.js` and will prevent regressions below the baseline.

## Related Documentation

- [Testing Guide](../../../../docs/TESTING.md) - Comprehensive testing documentation
- [Jest Configuration](../../../../jest.config.js) - Jest configuration file
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing) - Official NestJS testing guide

## Contributing

When adding new utilities:

1. Add implementation to appropriate file (`test-utils.ts`, `mock-*.ts`, or `fixtures/`)
2. Export from `index.ts`
3. Add JSDoc comments with examples
4. Update this README with usage examples
5. Ensure ESLint and Prettier pass
