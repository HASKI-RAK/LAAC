// REQ-FN-018: E2E Test Constants
// Central configuration for E2E tests

/**
 * Test configuration constants
 */
export const TEST_CONFIG = {
  // Redis configuration for tests
  REDIS_HOST: process.env.TEST_REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.TEST_REDIS_PORT || '6379', 10),
  REDIS_DB: parseInt(process.env.TEST_REDIS_DB || '15', 10), // Use DB 15 for tests

  // Test timeouts (in milliseconds)
  DEFAULT_TIMEOUT: 30000, // 30 seconds for E2E tests
  LONG_TIMEOUT: 60000, // 60 seconds for long-running tests

  // API configuration
  API_PREFIX: 'api/v1',

  // JWT configuration
  JWT_SECRET: 'test-jwt-secret-min-32-characters-long-for-testing',

  // Test user data
  TEST_USER_ID: 'test-user-123',
  TEST_USERNAME: 'testuser',

  // Rate limiting (should match setup-e2e.ts)
  RATE_LIMIT_TTL: 60, // 60 seconds
  RATE_LIMIT_MAX: 100, // 100 requests per window
} as const;

/**
 * Test scopes for authorization testing
 */
export const TEST_SCOPES = {
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_WRITE: 'analytics:write',
  ADMIN_CACHE: 'admin:cache',
  ADMIN_CONFIG: 'admin:config',
} as const;

/**
 * Test endpoints
 */
export const TEST_ENDPOINTS = {
  // Public endpoints
  ROOT: '/',
  HEALTH: '/health',
  HEALTH_LIVENESS: '/health/liveness',
  HEALTH_READINESS: '/health/readiness',
  PROMETHEUS: '/prometheus',

  // Protected endpoints
  METRICS_CATALOG: '/api/v1/metrics',
  METRICS_DETAIL: (id: string) => `/api/v1/metrics/${id}`,
  METRICS_RESULTS: (id: string) => `/api/v1/metrics/${id}/results`,

  // Admin endpoints
  ADMIN_CACHE_INVALIDATE: '/admin/cache/invalidate',
} as const;

/**
 * Expected HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Test metric IDs
 */
export const TEST_METRICS = {
  UNKNOWN_METRIC: 'unknown-metric',
  TEST_METRIC: 'test-metric',
} as const;
