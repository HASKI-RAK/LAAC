// REQ-FN-020: E2E test setup
// Sets up required environment variables for testing

// Set up required environment variables before any imports
process.env.JWT_SECRET = 'test-jwt-secret-min-32-characters-long-for-testing';
process.env.LRS_URL = 'https://test-lrs.example.com/xapi';
process.env.LRS_API_KEY = 'test-lrs-api-key';
process.env.LOG_LEVEL = 'debug';
process.env.NODE_ENV = 'test';
// REQ-FN-024: Rate limiting configuration for testing
process.env.RATE_LIMIT_TTL = '60'; // 60 seconds window
process.env.RATE_LIMIT_MAX = '100'; // 100 requests per window
