// Implements REQ-FN-017: Circuit Breaker Error
// Custom error thrown when circuit breaker is OPEN

import { CircuitBreakerState } from './circuit-breaker.interface';

/**
 * Error thrown when circuit breaker is OPEN
 * @remarks
 * Implements REQ-FN-017: Resilience & Fault Tolerance
 * Indicates that the circuit breaker has opened due to repeated failures
 * and requests are being rejected to prevent cascading failures
 */
export class CircuitBreakerOpenError extends Error {
  /**
   * Circuit breaker name/identifier
   */
  public readonly serviceName: string;

  /**
   * Current circuit breaker state (should be OPEN)
   */
  public readonly state: CircuitBreakerState;

  /**
   * Time in milliseconds until circuit attempts recovery (HALF_OPEN)
   */
  public readonly timeUntilRetry: number;

  constructor(serviceName: string, timeUntilRetry: number) {
    super(
      `Circuit breaker is OPEN for service: ${serviceName}. Service unavailable.`,
    );
    this.name = 'CircuitBreakerOpenError';
    this.serviceName = serviceName;
    this.state = CircuitBreakerState.OPEN;
    this.timeUntilRetry = timeUntilRetry;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CircuitBreakerOpenError);
    }
  }
}
