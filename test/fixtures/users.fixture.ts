// REQ-FN-018: E2E Test Fixtures - User Data
// Sample user data for E2E tests

/**
 * Test user data structure
 */
export interface TestUser {
  id: string;
  username: string;
  scopes: string[];
  email?: string;
}

/**
 * Sample test users with different permission levels
 */
export const TEST_USERS: Record<string, TestUser> = {
  // User with analytics read permissions
  ANALYTICS_USER: {
    id: 'user-analytics-001',
    username: 'analytics-user',
    scopes: ['analytics:read'],
    email: 'analytics@test.example.com',
  },

  // User with analytics write permissions
  ANALYTICS_ADMIN: {
    id: 'user-analytics-admin-001',
    username: 'analytics-admin',
    scopes: ['analytics:read', 'analytics:write'],
    email: 'analytics-admin@test.example.com',
  },

  // User with admin cache permissions
  CACHE_ADMIN: {
    id: 'user-cache-admin-001',
    username: 'cache-admin',
    scopes: ['admin:cache', 'admin:config'],
    email: 'cache-admin@test.example.com',
  },

  // User with multiple scopes
  SUPER_ADMIN: {
    id: 'user-super-admin-001',
    username: 'super-admin',
    scopes: [
      'analytics:read',
      'analytics:write',
      'admin:cache',
      'admin:config',
    ],
    email: 'super-admin@test.example.com',
  },

  // User with no scopes
  LIMITED_USER: {
    id: 'user-limited-001',
    username: 'limited-user',
    scopes: [],
    email: 'limited@test.example.com',
  },

  // User with unrelated scopes
  OTHER_USER: {
    id: 'user-other-001',
    username: 'other-user',
    scopes: ['other:scope', 'unrelated:permission'],
    email: 'other@test.example.com',
  },
};

/**
 * Get a test user by role
 * @param role - User role key
 * @returns Test user object
 */
export function getTestUser(role: keyof typeof TEST_USERS): TestUser {
  return TEST_USERS[role];
}

/**
 * Get test user IDs
 * @returns Array of all test user IDs
 */
export function getTestUserIds(): string[] {
  return Object.values(TEST_USERS).map((user) => user.id);
}

/**
 * Get test users with specific scope
 * @param scope - Required scope
 * @returns Array of users with the specified scope
 */
export function getUsersWithScope(scope: string): TestUser[] {
  return Object.values(TEST_USERS).filter((user) =>
    user.scopes.includes(scope),
  );
}
