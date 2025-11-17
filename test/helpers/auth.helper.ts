// REQ-FN-018: E2E Test Helper - JWT Token Generation
// Provides utilities for generating valid and invalid JWT tokens for E2E tests

import { JwtService, JwtSignOptions } from '@nestjs/jwt';

/**
 * Options for generating test JWT tokens
 */
export interface TestTokenOptions {
  sub?: string;
  username?: string;
  scopes?: string[];
  expiresIn?: JwtSignOptions['expiresIn'];
  expired?: boolean;
  invalid?: boolean;
}

/**
 * Default test JWT secret (matches setup-e2e.ts)
 */
const TEST_JWT_SECRET = 'test-jwt-secret-min-32-characters-long-for-testing';

/**
 * Generate a valid JWT token for testing
 * @param options - Token generation options
 * @returns JWT token string
 */
export function generateJwt(options: TestTokenOptions = {}): string {
  const {
    sub = 'test-user-123',
    username = 'testuser',
    scopes = ['analytics:read'],
    expiresIn = '1h',
    expired = false,
    invalid = false,
  } = options;

  // Return invalid token if requested
  if (invalid) {
    return 'invalid.jwt.token.format';
  }

  const jwtService = new JwtService({
    secret: TEST_JWT_SECRET,
  });

  // Generate expired token
  if (expired) {
    return jwtService.sign(
      {
        sub,
        username,
        scopes,
      },
      {
        expiresIn: '-1h', // Expired 1 hour ago
      },
    );
  }

  // Generate valid token
  return jwtService.sign(
    {
      sub,
      username,
      scopes,
    },
    {
      expiresIn,
    },
  );
}

/**
 * Generate an expired JWT token for testing
 * @param options - Token generation options (excluding expired flag)
 * @returns Expired JWT token string
 */
export function generateExpiredJwt(
  options: Omit<TestTokenOptions, 'expired'> = {},
): string {
  return generateJwt({ ...options, expired: true });
}

/**
 * Generate an invalid JWT token for testing
 * @returns Invalid JWT token string
 */
export function generateInvalidJwt(): string {
  return generateJwt({ invalid: true });
}

/**
 * Generate a JWT token with analytics:read scope
 * @param options - Additional token options
 * @returns JWT token with analytics:read scope
 */
export function generateAnalyticsToken(
  options: Omit<TestTokenOptions, 'scopes'> = {},
): string {
  return generateJwt({ ...options, scopes: ['analytics:read'] });
}

/**
 * Generate a JWT token with admin:cache scope
 * @param options - Additional token options
 * @returns JWT token with admin:cache scope
 */
export function generateAdminToken(
  options: Omit<TestTokenOptions, 'scopes'> = {},
): string {
  return generateJwt({ ...options, scopes: ['admin:cache', 'admin:config'] });
}

/**
 * Generate a JWT token with multiple scopes
 * @param scopes - Array of scope strings
 * @param options - Additional token options
 * @returns JWT token with specified scopes
 */
export function generateTokenWithScopes(
  scopes: string[],
  options: Omit<TestTokenOptions, 'scopes'> = {},
): string {
  return generateJwt({ ...options, scopes });
}

/**
 * Generate a JWT token without any scopes
 * @param options - Additional token options
 * @returns JWT token with empty scopes array
 */
export function generateTokenWithoutScopes(
  options: Omit<TestTokenOptions, 'scopes'> = {},
): string {
  return generateJwt({ ...options, scopes: [] });
}
