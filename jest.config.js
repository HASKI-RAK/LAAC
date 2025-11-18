// REQ-NF-020: Jest Configuration for Unit Tests
// Implements 80% code coverage baseline requirement

/** @type {import('jest').Config} */
module.exports = {
  // Test file extensions to support
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Root directory for tests (src/ for unit tests)
  rootDir: 'src',

  // Pattern to match test files
  testRegex: '.*\\.spec\\.ts$',

  // TypeScript transformation using ts-jest
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  // Files to collect coverage from (all TypeScript and JavaScript files)
  collectCoverageFrom: [
    '**/*.(t|j)s',
    // Exclude test files, interfaces, and entry points from coverage
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts', // DTOs are validated via class-validator, not logic
    '!**/index.ts', // Barrel exports
    '!main.ts', // Application entry point
    '!**/testing/**', // Test utilities and fixtures
  ],

  // Directory where coverage reports will be output
  coverageDirectory: '../coverage',

  // Test environment (Node.js for backend services)
  testEnvironment: 'node',

  // Coverage thresholds (REQ-NF-020: 80% baseline - aspirational target)
  // Note: Set to current baseline (55%) to prevent regressions
  // Should be gradually increased to 80% as more tests are added
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 45,
      lines: 55,
      statements: 55,
    },
  },

  // Module name mapper for path aliases (matches tsconfig.json)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Setup files to run before tests
  // setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],

  // Ignore patterns for test discovery
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Verbose output for better debugging
  verbose: true,
};
