// REQ-NF-020: Mock LoggerService for Testing
// Provides a mock implementation of LoggerService for unit tests

import { LoggerService } from '@nestjs/common';

/**
 * Mock implementation of LoggerService for testing
 * All methods are jest mock functions that can be spied on and have expectations set
 *
 * @example
 * ```typescript
 * const mockLogger = createMockLogger();
 * const module = await Test.createTestingModule({
 *   providers: [
 *     MyService,
 *     { provide: LoggerService, useValue: mockLogger },
 *   ],
 * }).compile();
 *
 * // In test
 * expect(mockLogger.log).toHaveBeenCalledWith('Expected message');
 * ```
 */
export interface MockLogger extends LoggerService {
  log: jest.Mock;
  error: jest.Mock;
  warn: jest.Mock;
  debug: jest.Mock;
  verbose: jest.Mock;
  fatal?: jest.Mock;
  setContext?: jest.Mock;
}

/**
 * Creates a mock LoggerService instance with all methods as jest.fn()
 * @returns Mock logger instance
 */
export function createMockLogger(): MockLogger {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    fatal: jest.fn(),
    setContext: jest.fn(),
  };
}

/**
 * Creates a mock LoggerService provider for NestJS testing modules
 * @returns Provider configuration for dependency injection
 *
 * @example
 * ```typescript
 * const module = await Test.createTestingModule({
 *   providers: [MyService, getMockLoggerProvider()],
 * }).compile();
 * ```
 */
export function getMockLoggerProvider() {
  return {
    provide: 'LoggerService',
    useValue: createMockLogger(),
  };
}

/**
 * Creates a silent logger that doesn't output anything
 * Useful for tests where you don't want console pollution but need a logger instance
 * @returns Silent logger instance
 */
export function createSilentLogger(): LoggerService {
  return {
    log: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    verbose: () => {},
  };
}
