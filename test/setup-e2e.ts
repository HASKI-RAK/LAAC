// REQ-FN-018: E2E test setup and configuration
// Sets up required environment variables and test infrastructure for E2E testing

// Set up required environment variables before any imports
process.env.JWT_SECRET = 'test-jwt-secret-min-32-characters-long-for-testing';

// LRS configuration with environment-aware defaults
// REQ-FN-026: Multi-instance LRS support
//
//
// See docs/LRS-CONFIGURATION.md for complete configuration guide

if (!process.env.LRS_INSTANCES) {
  const lrsUrl = process.env.LRS_DOMAIN || 'http://localhost:8090/xapi';
  const lrsApiKey = process.env.LRS_USER || 'test-api-key';
  const lrsApiSecret = process.env.LRS_SECRET || 'test-api-secret';

  // Detect environment: CI uses secrets (URL won't be localhost), local uses defaults
  const isCI = !lrsUrl.includes('localhost');
  const instanceName = isCI ? 'External LRS (CI/CD)' : 'Local Development LRS';
  const instanceId = isCI ? 'ci-external' : 'local-dev';

  process.env.LRS_INSTANCES = JSON.stringify([
    {
      id: instanceId,
      name: instanceName,
      endpoint: lrsUrl,
      timeoutMs: 10000,
      auth: {
        type: 'basic',
        username: lrsApiKey,
        password: lrsApiSecret,
      },
    },
  ]);

  // Log which environment is being used (without credentials)
  console.log(`[E2E Setup] Using LRS: ${instanceName} at ${lrsUrl}`);
}

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
