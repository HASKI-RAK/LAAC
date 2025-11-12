// REQ-NF-020: Test Utilities for Creating Test Modules
// Helper functions to simplify test setup and reduce boilerplate

import { Test, TestingModule } from '@nestjs/testing';
import { ModuleMetadata } from '@nestjs/common';

/**
 * Creates a NestJS testing module with the provided metadata
 * This is a convenience wrapper around Test.createTestingModule
 * that handles common setup patterns
 *
 * @param metadata - Module metadata (providers, imports, controllers, etc.)
 * @returns Compiled testing module
 *
 * @example
 * ```typescript
 * const module = await createTestingModule({
 *   providers: [MyService, { provide: LoggerService, useValue: mockLogger }],
 * });
 * const service = module.get<MyService>(MyService);
 * ```
 */
export async function createTestingModule(
  metadata: ModuleMetadata,
): Promise<TestingModule> {
  const moduleRef = await Test.createTestingModule(metadata).compile();
  return moduleRef;
}

/**
 * Creates a testing module and retrieves a specific service instance
 * Combines module creation and service retrieval in one call
 *
 * @param metadata - Module metadata
 * @param serviceClass - Service class to retrieve
 * @returns Service instance
 *
 * @example
 * ```typescript
 * const service = await getTestService(
 *   { providers: [MyService, mockLoggerProvider] },
 *   MyService
 * );
 * ```
 */
export async function getTestService<T>(
  metadata: ModuleMetadata,

  serviceClass: new (...args: any[]) => T,
): Promise<T> {
  const module = await createTestingModule(metadata);
  return module.get<T>(serviceClass);
}

/**
 * Creates a mock provider object for dependency injection
 * Useful for mocking services in test modules
 *
 * @param token - Injection token (usually the class itself)
 * @param mockImplementation - Mock implementation object
 * @returns Provider configuration object
 *
 * @example
 * ```typescript
 * const mockLoggerProvider = createMockProvider(LoggerService, {
 *   log: jest.fn(),
 *   error: jest.fn(),
 * });
 * ```
 */

export function createMockProvider<T = any>(
  token: any,
  mockImplementation: Partial<T>,
): { provide: any; useValue: Partial<T> } {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    provide: token,
    useValue: mockImplementation,
  };
}

/**
 * Creates a spy object with all methods as jest.fn()
 * Useful for creating test doubles of services
 *
 * @param methods - Array of method names to spy on
 * @returns Object with all methods as jest mock functions
 *
 * @example
 * ```typescript
 * const loggerSpy = createSpyObj(['log', 'error', 'warn']);
 * // loggerSpy.log, loggerSpy.error, loggerSpy.warn are all jest.fn()
 * ```
 */

export function createSpyObj<T = any>(methods: string[]): T {
  const spy: Record<string, jest.Mock> = {};
  methods.forEach((method) => {
    spy[method] = jest.fn();
  });
  return spy as T;
}

/**
 * Clears all mock calls and implementations
 * Should be called in beforeEach or afterEach to ensure test isolation
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   clearAllMocks();
 * });
 * ```
 */
export function clearAllMocks(): void {
  jest.clearAllMocks();
}

/**
 * Restores all mocks to their original implementation
 * Should be called in afterEach or afterAll
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   restoreAllMocks();
 * });
 * ```
 */
export function restoreAllMocks(): void {
  jest.restoreAllMocks();
}
