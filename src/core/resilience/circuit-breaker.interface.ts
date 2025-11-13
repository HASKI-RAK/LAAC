// Implements REQ-FN-017: Circuit Breaker Interface
// Defines contract for circuit breaker pattern with state management

/**
 * Circuit breaker states
 * @remarks
 * - CLOSED (0): Normal operation, requests pass through
 * - OPEN (1): Service failing, requests fail fast
 * - HALF_OPEN (2): Testing recovery, limited requests allowed
 */
export enum CircuitBreakerState {
  CLOSED = 0,
  OPEN = 1,
  HALF_OPEN = 2,
}

/**
 * Configuration for circuit breaker
 */
export interface CircuitBreakerOptions {
  /**
   * Number of consecutive failures before opening circuit
   * @default 5
   */
  threshold: number;

  /**
   * Timeout in milliseconds before transitioning from OPEN to HALF_OPEN
   * @default 30000
   */
  timeout: number;

  /**
   * Number of successful requests required in HALF_OPEN to transition to CLOSED
   * @default 1
   */
  halfOpenRequests?: number;

  /**
   * Name/identifier for this circuit breaker (used in metrics and logging)
   */
  name: string;
}

/**
 * Circuit breaker state information
 */
export interface CircuitBreakerStateInfo {
  /**
   * Current state of the circuit breaker
   */
  state: CircuitBreakerState;

  /**
   * Current failure count
   */
  failureCount: number;

  /**
   * Current success count (used in HALF_OPEN)
   */
  successCount: number;

  /**
   * Timestamp of last state transition
   */
  lastStateChange: Date;

  /**
   * Timestamp when circuit was opened (null if not OPEN)
   */
  openedAt: Date | null;

  /**
   * Time remaining until HALF_OPEN transition (milliseconds, null if not OPEN)
   */
  timeUntilRetry: number | null;
}

/**
 * Circuit breaker interface
 * @remarks
 * Implements REQ-FN-017: Resilience & Fault Tolerance
 * Provides circuit breaker pattern to protect against cascading failures
 */
export interface ICircuitBreaker {
  /**
   * Get current circuit breaker configuration
   */
  readonly config: CircuitBreakerOptions;

  /**
   * Get current state information
   */
  getState(): CircuitBreakerStateInfo;

  /**
   * Execute a function with circuit breaker protection
   * @param fn - Async function to execute
   * @returns Promise resolving to function result
   * @throws CircuitBreakerOpenError if circuit is OPEN
   */
  execute<T>(fn: () => Promise<T>): Promise<T>;

  /**
   * Manually reset the circuit breaker to CLOSED state
   * Used for administrative purposes or testing
   */
  reset(): void;
}
