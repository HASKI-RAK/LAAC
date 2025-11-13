// Implements REQ-FN-017: Circuit Breaker Implementation
// Provides circuit breaker pattern with state machine logic

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CircuitBreakerState,
  CircuitBreakerOptions,
  CircuitBreakerStateInfo,
  ICircuitBreaker,
} from './circuit-breaker.interface';
import { CircuitBreakerOpenError } from './circuit-breaker.error';
import { LoggerService } from '../logger';
import { Configuration } from '../config/config.interface';

/**
 * Circuit breaker implementation
 * @remarks
 * Implements REQ-FN-017: Resilience & Fault Tolerance
 *
 * State machine:
 * - CLOSED: Normal operation, failures increment counter
 * - OPEN: Circuit open, all requests fail fast
 * - HALF_OPEN: Testing recovery, limited requests allowed
 *
 * Transitions:
 * - CLOSED → OPEN: After threshold failures
 * - OPEN → HALF_OPEN: After timeout period
 * - HALF_OPEN → CLOSED: After successful test request(s)
 * - HALF_OPEN → OPEN: If test request fails
 */
@Injectable()
export class CircuitBreaker implements ICircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastStateChange: Date = new Date();
  private openedAt: Date | null = null;
  private halfOpenAttempts = 0;

  public readonly config: CircuitBreakerOptions;

  constructor(
    config: Partial<CircuitBreakerOptions>,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService<Configuration>,
  ) {
    // Merge provided config with defaults from environment
    const envThreshold =
      this.configService.get('circuitBreaker.threshold', { infer: true }) || 5;
    const envTimeout =
      this.configService.get('circuitBreaker.timeout', { infer: true }) ||
      30000;
    const envHalfOpenRequests =
      this.configService.get('circuitBreaker.halfOpenRequests', {
        infer: true,
      }) || 1;

    this.config = {
      threshold: config.threshold ?? envThreshold,
      timeout: config.timeout ?? envTimeout,
      halfOpenRequests: config.halfOpenRequests ?? envHalfOpenRequests,
      name: config.name || 'unknown',
    };

    this.logger.setContext(`CircuitBreaker:${this.config.name}`);
    this.logger.log(
      `Circuit breaker initialized: threshold=${this.config.threshold}, timeout=${this.config.timeout}ms, halfOpenRequests=${this.config.halfOpenRequests}`,
    );
  }

  /**
   * Get current state information
   */
  getState(): CircuitBreakerStateInfo {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastStateChange: this.lastStateChange,
      openedAt: this.openedAt,
      timeUntilRetry: this.calculateTimeUntilRetry(),
    };
  }

  /**
   * Execute a function with circuit breaker protection
   * @param fn - Async function to execute
   * @returns Promise resolving to function result
   * @throws CircuitBreakerOpenError if circuit is OPEN
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitBreakerState.OPEN && this.shouldAttemptReset()) {
      this.transitionToHalfOpen();
    }

    // Reject immediately if circuit is OPEN
    if (this.state === CircuitBreakerState.OPEN) {
      const timeUntilRetry = this.calculateTimeUntilRetry() || 0;
      this.logger.debug(
        `Circuit breaker OPEN, failing fast. Retry in ${timeUntilRetry}ms`,
      );
      throw new CircuitBreakerOpenError(this.config.name, timeUntilRetry);
    }

    // In HALF_OPEN, only allow limited number of attempts
    if (
      this.state === CircuitBreakerState.HALF_OPEN &&
      this.halfOpenAttempts >= this.config.halfOpenRequests!
    ) {
      const timeUntilRetry = this.calculateTimeUntilRetry() || 0;
      this.logger.debug(
        `Circuit breaker HALF_OPEN with max attempts reached, failing fast`,
      );
      throw new CircuitBreakerOpenError(this.config.name, timeUntilRetry);
    }

    // Track attempt in HALF_OPEN
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenAttempts++;
    }

    try {
      this.logger.debug(
        `Executing request in ${CircuitBreakerState[this.state]} state`,
      );
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Reset circuit breaker to CLOSED state
   */
  reset(): void {
    this.logger.log('Circuit breaker manually reset to CLOSED');
    this.transitionToClosed();
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.logger.debug(
      `Request succeeded in ${CircuitBreakerState[this.state]} state`,
    );

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      this.logger.debug(
        `HALF_OPEN success count: ${this.successCount}/${this.config.halfOpenRequests}`,
      );

      // Transition to CLOSED if we've met the success threshold
      if (this.successCount >= this.config.halfOpenRequests!) {
        this.transitionToClosed();
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success in CLOSED state
      if (this.failureCount > 0) {
        this.logger.debug(
          `Resetting failure count from ${this.failureCount} to 0`,
        );
        this.failureCount = 0;
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(error: unknown): void {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    this.logger.debug(
      `Request failed in ${CircuitBreakerState[this.state]} state: ${errorMessage}`,
    );

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in HALF_OPEN immediately reopens the circuit
      this.transitionToOpen();
    } else if (this.state === CircuitBreakerState.CLOSED) {
      this.failureCount++;
      this.logger.debug(
        `Failure count: ${this.failureCount}/${this.config.threshold}`,
      );

      // Open circuit if threshold reached
      if (this.failureCount >= this.config.threshold) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    const oldState = this.state;
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.openedAt = null;
    this.halfOpenAttempts = 0;
    this.lastStateChange = new Date();

    this.logger.log(
      `Circuit breaker transitioned: ${CircuitBreakerState[oldState]} → CLOSED`,
    );
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    const oldState = this.state;
    this.state = CircuitBreakerState.OPEN;
    this.openedAt = new Date();
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.lastStateChange = new Date();

    this.logger.log(
      `Circuit breaker transitioned: ${CircuitBreakerState[oldState]} → OPEN (${this.failureCount} failures). Will attempt recovery in ${this.config.timeout}ms`,
    );
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    const oldState = this.state;
    this.state = CircuitBreakerState.HALF_OPEN;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.lastStateChange = new Date();

    this.logger.log(
      `Circuit breaker transitioned: ${CircuitBreakerState[oldState]} → HALF_OPEN (testing recovery)`,
    );
  }

  /**
   * Check if circuit should attempt reset from OPEN to HALF_OPEN
   */
  private shouldAttemptReset(): boolean {
    if (!this.openedAt) {
      return false;
    }

    const timeSinceOpen = Date.now() - this.openedAt.getTime();
    return timeSinceOpen >= this.config.timeout;
  }

  /**
   * Calculate time remaining until retry attempt (milliseconds)
   * Returns null if not in OPEN state
   */
  private calculateTimeUntilRetry(): number | null {
    if (this.state !== CircuitBreakerState.OPEN || !this.openedAt) {
      return null;
    }

    const timeSinceOpen = Date.now() - this.openedAt.getTime();
    const remaining = Math.max(0, this.config.timeout - timeSinceOpen);
    return remaining;
  }
}
