// REQ-FN-018: E2E Test Helper - Real LRS Detection and Utilities
// Provides utilities for detecting and testing against real LRS instances

/**
 * Check if real LRS credentials are configured
 * @returns true if all required LRS environment variables are set and non-empty
 */
export function hasRealLRSConfig(): boolean {
  const lrsDomain = process.env.LRS_DOMAIN;
  const lrsUser = process.env.LRS_USER;
  const lrsSecret = process.env.LRS_SECRET;

  return (
    !!lrsDomain &&
    !!lrsUser &&
    !!lrsSecret &&
    lrsDomain !== 'undefined' &&
    lrsUser !== 'undefined' &&
    lrsSecret !== 'undefined'
  );
}

/**
 * Get real LRS configuration
 * @returns LRS configuration object or undefined if not configured
 */
export function getRealLRSConfig():
  | { domain: string; user: string; secret: string }
  | undefined {
  if (!hasRealLRSConfig()) {
    return undefined;
  }

  return {
    domain: process.env.LRS_DOMAIN!,
    user: process.env.LRS_USER!,
    secret: process.env.LRS_SECRET!,
  };
}

/**
 * Skip test if real LRS is not configured
 * Use this in test blocks that require real LRS
 */
export function skipIfNoRealLRS(): void {
  if (!hasRealLRSConfig()) {
    console.log(
      '⏭️  Skipping real LRS test - LRS_DOMAIN, LRS_USER, and LRS_SECRET not configured',
    );
  }
}

/**
 * Conditional describe block that only runs if real LRS is configured
 * @param name - Test suite name
 * @param fn - Test suite function
 */
export function describeRealLRS(name: string, fn: () => void): void {
  const config = getRealLRSConfig();

  if (config) {
    console.log(`✅ Real LRS configured: ${config.domain}`);
    describe(name, fn);
  } else {
    console.log(
      `⏭️  Skipping real LRS tests: ${name} - Set LRS_DOMAIN, LRS_USER, LRS_SECRET to enable`,
    );
    describe.skip(name, fn);
  }
}

/**
 * Conditional test that only runs if real LRS is configured
 * @param name - Test name
 * @param fn - Test function
 * @param timeout - Optional timeout in milliseconds
 */
export function itRealLRS(
  name: string,
  fn: jest.ProvidesCallback,
  timeout?: number,
): void {
  if (hasRealLRSConfig()) {
    it(name, fn, timeout);
  } else {
    it.skip(name, fn, timeout);
  }
}
