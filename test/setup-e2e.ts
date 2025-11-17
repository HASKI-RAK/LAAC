// REQ-FN-018: E2E test setup and configuration
// Sets up required environment variables and test infrastructure for E2E testing

// Set up required environment variables before any imports
process.env.JWT_SECRET = 'test-jwt-secret-min-32-characters-long-for-testing';

// LRS configuration - matches docker-compose.test.yml
// CI will provide LRS_URL, LRS_API_KEY, and LRS_API_SECRET via environment
// For local testing, these match the docker-compose.test.yml LRS service
process.env.LRS_INSTANCES =
  process.env.LRS_INSTANCES ||
  JSON.stringify([
    {
      id: 'local-dev',
      name: 'Local Development LRS',
      endpoint: process.env.LRS_URL || 'http://localhost:8090/xapi',
      timeoutMs: 10000,
      auth: {
        type: 'basic',
        username: process.env.LRS_API_KEY || 'test-api-key',
        password: process.env.LRS_API_SECRET || 'test-api-secret',
      },
    },
  ]);

process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.NODE_ENV = 'test';

// REQ-FN-024: Rate limiting configuration for testing
process.env.RATE_LIMIT_TTL = '60'; // 60 seconds window
process.env.RATE_LIMIT_MAX = '100'; // 100 requests per window

// Redis configuration for tests (use test database 15)
process.env.REDIS_HOST =
  process.env.TEST_REDIS_HOST || process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT =
  process.env.TEST_REDIS_PORT || process.env.REDIS_PORT || '6379';
process.env.REDIS_DB = process.env.TEST_REDIS_DB || '15';

// Enable authentication for E2E tests
process.env.AUTH_ENABLED = 'true';

// Set test timeout
jest.setTimeout(30000); // 30 seconds for E2E tests
