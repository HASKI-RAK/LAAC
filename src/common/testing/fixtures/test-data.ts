// REQ-NF-020: Test Fixtures - Sample Data for Tests
// Provides reusable test data to ensure consistency across tests

/**
 * Sample user data for authentication and authorization tests
 */
export const TEST_USERS = {
  ANALYTICS_USER: {
    userId: 'user-analytics-001',
    username: 'analytics-user',
    scopes: ['analytics:read'],
  },
  ANALYTICS_ADMIN: {
    userId: 'user-analytics-admin-001',
    username: 'analytics-admin',
    scopes: ['analytics:read', 'analytics:write'],
  },
  CACHE_ADMIN: {
    userId: 'user-cache-admin-001',
    username: 'cache-admin',
    scopes: ['admin:cache'],
  },
  CONFIG_ADMIN: {
    userId: 'user-config-admin-001',
    username: 'config-admin',
    scopes: ['admin:config'],
  },
  SUPER_ADMIN: {
    userId: 'user-super-admin-001',
    username: 'super-admin',
    scopes: [
      'analytics:read',
      'analytics:write',
      'admin:cache',
      'admin:config',
      'metrics:read',
      'metrics:write',
    ],
  },
  NO_SCOPES_USER: {
    userId: 'user-no-scopes-001',
    username: 'no-scopes-user',
    scopes: [],
  },
};

/**
 * Sample metric catalog items for testing
 */
export const TEST_METRICS = {
  COURSE_COMPLETION: {
    id: 'course-completion',
    dashboardLevel: 'course' as const,
    name: 'Course Completion Rate',
    description: 'Percentage of students who completed the course',
    version: '1.0.0',
  },
  TOPIC_ENGAGEMENT: {
    id: 'topic-engagement',
    dashboardLevel: 'topic' as const,
    name: 'Topic Engagement Score',
    description: 'Student engagement level for a specific topic',
    version: '1.0.0',
  },
  ELEMENT_VIEWS: {
    id: 'element-views',
    dashboardLevel: 'element' as const,
    name: 'Learning Element Views',
    description: 'Number of times a learning element was viewed',
    version: '1.0.0',
  },
};

/**
 * Sample xAPI statements for testing LRS interactions
 */
export const TEST_XAPI_STATEMENTS = [
  {
    id: 'statement-001',
    actor: {
      objectType: 'Agent' as const,
      name: 'Test Student',
      mbox: 'mailto:student@test.com',
    },
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { 'en-US': 'completed' },
    },
    object: {
      objectType: 'Activity' as const,
      id: 'http://example.com/course/123',
      definition: {
        name: { 'en-US': 'Introduction to Testing' },
        type: 'http://adlnet.gov/expapi/activities/course',
      },
    },
    timestamp: '2025-11-12T10:00:00.000Z',
  },
  {
    id: 'statement-002',
    actor: {
      objectType: 'Agent' as const,
      name: 'Test Student',
      mbox: 'mailto:student@test.com',
    },
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/experienced',
      display: { 'en-US': 'experienced' },
    },
    object: {
      objectType: 'Activity' as const,
      id: 'http://example.com/topic/456',
      definition: {
        name: { 'en-US': 'Unit Testing Basics' },
        type: 'http://adlnet.gov/expapi/activities/lesson',
      },
    },
    timestamp: '2025-11-12T11:00:00.000Z',
  },
] as const;

/**
 * Sample metric query parameters
 */
export const TEST_METRIC_QUERIES = {
  COURSE_LEVEL: {
    scope: 'course-123',
    filters: {},
  },
  TOPIC_LEVEL: {
    scope: 'topic-456',
    filters: {
      studentId: 'student-789',
    },
  },
  ELEMENT_LEVEL: {
    scope: 'element-789',
    filters: {
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
    },
  },
};

/**
 * Sample cache keys for testing cache operations
 */
export const TEST_CACHE_KEYS = {
  METRIC_RESULT: 'cache:course-completion:course:123:v1',
  USER_SESSION: 'session:user-analytics-001',
  RATE_LIMIT: 'ratelimit:192.168.1.1',
};

/**
 * Sample error scenarios for testing error handling
 */
export const TEST_ERRORS = {
  VALIDATION_ERROR: {
    statusCode: 400,
    message: 'Validation failed',
    error: 'Bad Request',
  },
  UNAUTHORIZED_ERROR: {
    statusCode: 401,
    message: 'Unauthorized',
    error: 'Unauthorized',
  },
  FORBIDDEN_ERROR: {
    statusCode: 403,
    message: 'Forbidden resource',
    error: 'Forbidden',
  },
  NOT_FOUND_ERROR: {
    statusCode: 404,
    message: 'Resource not found',
    error: 'Not Found',
  },
  INTERNAL_ERROR: {
    statusCode: 500,
    message: 'Internal server error',
    error: 'Internal Server Error',
  },
};

/**
 * Helper function to get a test user by role
 * @param role - User role key from TEST_USERS
 * @returns User object
 */
export function getTestUser(
  role: keyof typeof TEST_USERS,
): (typeof TEST_USERS)[keyof typeof TEST_USERS] {
  return TEST_USERS[role];
}

/**
 * Helper function to get a test metric by type
 * @param metricType - Metric type key from TEST_METRICS
 * @returns Metric object
 */
export function getTestMetric(
  metricType: keyof typeof TEST_METRICS,
): (typeof TEST_METRICS)[keyof typeof TEST_METRICS] {
  return TEST_METRICS[metricType];
}

/**
 * Helper function to create a custom xAPI statement
 * @param overrides - Partial statement to override defaults
 * @returns Complete xAPI statement
 */
export function createTestStatement(
  overrides: Partial<(typeof TEST_XAPI_STATEMENTS)[0]> = {},
): (typeof TEST_XAPI_STATEMENTS)[0] {
  return {
    ...TEST_XAPI_STATEMENTS[0],
    ...overrides,
  };
}
