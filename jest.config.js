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
  ],

  // Directory where coverage reports will be output
  coverageDirectory: '../coverage',

  // Test environment (Node.js for backend services)
  testEnvironment: 'node',

  // Coverage thresholds (REQ-NF-020: 80% baseline)
  // Tests will fail if coverage drops below these thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
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

  // Maximum number of concurrent workers (50% of available cores)
  maxWorkers: '50%',
};
