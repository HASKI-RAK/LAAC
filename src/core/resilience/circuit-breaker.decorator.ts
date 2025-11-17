// Implements REQ-FN-017: Circuit Breaker Decorator
// Provides method decorator for applying circuit breaker to class methods

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { CircuitBreakerOptions } from './circuit-breaker.interface';
import { CircuitBreaker } from './circuit-breaker';

/**
 * Map to store circuit breaker instances per decorator configuration
 * Key format: `${className}.${methodName}.${configHash}`
 *
 * @remarks
 * This module-level Map persists across decorator instances and test runs.
 * When writing tests, call `clearCircuitBreakerInstances()` in beforeEach/afterEach
 * to ensure clean state between tests.
 *
 * Note: For production use, prefer direct instantiation of CircuitBreaker with
 * proper dependency injection over using the decorator pattern.
 */
const circuitBreakerInstances = new Map<string, CircuitBreaker>();

/**
 * Circuit breaker decorator configuration
 * Extends base config with optional logger and config service injection
 */
export interface CircuitBreakerDecoratorConfig
  extends Partial<CircuitBreakerOptions> {
  /**
   * Name for the circuit breaker (defaults to className.methodName)
   */
  name?: string;
}

/**
 * Method decorator that applies circuit breaker pattern to the decorated method
 *
 * @remarks
 * Implements REQ-FN-017: Resilience & Fault Tolerance
 *
 * **Important**: This decorator bypasses the application's centralized logging
 * infrastructure (LoggerService) and uses console methods directly. For production
 * use with proper logging, telemetry, and dependency injection, use the
 * CircuitBreaker class directly instead of this decorator.
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * class MyService {
 *   @CircuitBreakerDecorator({ threshold: 5, timeout: 30000 })
 *   async myMethod() {
 *     // method implementation
 *   }
 * }
 * ```
 *
 * Note: This decorator creates a shared circuit breaker instance per unique
 * method. For dependency injection support with proper logging and metrics,
 * use the CircuitBreaker class directly.
 *
 * @param config - Circuit breaker configuration
 */
export function CircuitBreakerDecorator(
  config: CircuitBreakerDecoratorConfig = {},
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const defaultName = `${className}.${propertyKey}`;

    // Generate a unique key for this circuit breaker instance
    // Sort config keys to ensure deterministic key generation
    const sortedConfig = Object.keys(config)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = config[key as keyof CircuitBreakerDecoratorConfig];
          return acc;
        },
        {} as Record<string, any>,
      );
    const instanceKey = `${defaultName}.${JSON.stringify(sortedConfig)}`;

    descriptor.value = async function (...args: any[]) {
      // Get or create circuit breaker instance
      let circuitBreaker = circuitBreakerInstances.get(instanceKey);

      if (!circuitBreaker) {
        // Create a minimal logger and config service for decorator usage
        // In production, the class should use dependency injection instead
        const minimalLogger: any = {
          setContext: () => {},
          log: (message: string) => console.log(`[CircuitBreaker] ${message}`),
          debug: (message: string) =>
            console.debug(`[CircuitBreaker] ${message}`),
          warn: (message: string) =>
            console.warn(`[CircuitBreaker] ${message}`),
          error: (message: string) =>
            console.error(`[CircuitBreaker] ${message}`),
        };

        const minimalConfigService: any = {
          get: (key: string) => {
            // Return defaults since we don't have access to real config in decorator
            if (key === 'circuitBreaker.threshold') return 5;
            if (key === 'circuitBreaker.timeout') return 30000;
            if (key === 'circuitBreaker.halfOpenRequests') return 1;
            return undefined;
          },
        };

        circuitBreaker = new CircuitBreaker(
          {
            ...config,
            name: config.name || defaultName,
          },
          minimalLogger,
          minimalConfigService,
        );

        circuitBreakerInstances.set(instanceKey, circuitBreaker);
      }

      // Execute the original method through the circuit breaker
      return circuitBreaker.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Clear all circuit breaker instances
 * Useful for testing to reset state between tests
 */
export function clearCircuitBreakerInstances(): void {
  circuitBreakerInstances.clear();
}
