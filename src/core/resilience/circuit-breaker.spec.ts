// REQ-FN-017: Unit tests for Circuit Breaker
// Tests state machine logic, failure tracking, and recovery behavior

import { ConfigService } from '@nestjs/config';
import { CircuitBreaker } from './circuit-breaker';
import {
  CircuitBreakerState,
  CircuitBreakerOptions,
} from './circuit-breaker.interface';
import { CircuitBreakerOpenError } from './circuit-breaker.error';
import { LoggerService } from '../logger';

describe('REQ-FN-017: CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let mockLogger: jest.Mocked<LoggerService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'circuitBreaker.threshold') return 5;
        if (key === 'circuitBreaker.timeout') return 30000;
        if (key === 'circuitBreaker.halfOpenRequests') return 1;
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;
  });

  describe('Configuration', () => {
    it('should initialize with provided config', () => {
      const config: Partial<CircuitBreakerOptions> = {
        name: 'test-service',
        threshold: 3,
        timeout: 10000,
        halfOpenRequests: 2,
      };

      circuitBreaker = new CircuitBreaker(
        config,
        mockLogger,
        mockConfigService,
      );

      expect(circuitBreaker.config.name).toBe('test-service');
      expect(circuitBreaker.config.threshold).toBe(3);
      expect(circuitBreaker.config.timeout).toBe(10000);
      expect(circuitBreaker.config.halfOpenRequests).toBe(2);
    });

    it('should use environment defaults when config not provided', () => {
      circuitBreaker = new CircuitBreaker(
        { name: 'test' },
        mockLogger,
        mockConfigService,
      );

      expect(circuitBreaker.config.threshold).toBe(5);
      expect(circuitBreaker.config.timeout).toBe(30000);
      expect(circuitBreaker.config.halfOpenRequests).toBe(1);
    });

    it('should log initialization', () => {
      circuitBreaker = new CircuitBreaker(
        { name: 'test' },
        mockLogger,
        mockConfigService,
      );

      expect(mockLogger.setContext).toHaveBeenCalledWith('CircuitBreaker:test');
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker initialized'),
      );
    });
  });

  describe('State Machine - CLOSED State', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker(
        { name: 'test', threshold: 3, timeout: 1000 },
        mockLogger,
        mockConfigService,
      );
    });

    it('should start in CLOSED state', () => {
      const state = circuitBreaker.getState();

      expect(state.state).toBe(CircuitBreakerState.CLOSED);
      expect(state.failureCount).toBe(0);
      expect(state.successCount).toBe(0);
      expect(state.openedAt).toBeNull();
      expect(state.timeUntilRetry).toBeNull();
    });

    it('should allow requests in CLOSED state', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should increment failure count on error', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        'test error',
      );

      const state = circuitBreaker.getState();
      expect(state.failureCount).toBe(1);
      expect(state.state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should reset failure count on success after failures', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('error'))
        .mockResolvedValueOnce('success');

      // First call fails
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      expect(circuitBreaker.getState().failureCount).toBe(1);

      // Second call succeeds and resets
      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.getState().failureCount).toBe(0);
    });

    it('should transition to OPEN after threshold failures', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));

      // Execute threshold number of failures
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      const state = circuitBreaker.getState();
      expect(state.state).toBe(CircuitBreakerState.OPEN);
      expect(state.failureCount).toBe(3);
      expect(state.openedAt).not.toBeNull();
    });
  });

  describe('State Machine - OPEN State', () => {
    beforeEach(async () => {
      circuitBreaker = new CircuitBreaker(
        { name: 'test', threshold: 2, timeout: 1000 },
        mockLogger,
        mockConfigService,
      );

      // Trigger OPEN state
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      for (let i = 0; i < 2; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }
    });

    it('should reject requests immediately when OPEN', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        CircuitBreakerOpenError,
      );

      // Function should not be called
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should throw CircuitBreakerOpenError with correct details', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        CircuitBreakerOpenError,
      );

      try {
        await circuitBreaker.execute(mockFn);
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerOpenError);
        expect((error as CircuitBreakerOpenError).serviceName).toBe('test');
        expect((error as CircuitBreakerOpenError).state).toBe(
          CircuitBreakerState.OPEN,
        );
        expect(
          (error as CircuitBreakerOpenError).timeUntilRetry,
        ).toBeGreaterThanOrEqual(0);
      }
    });

    it('should calculate time until retry', () => {
      const state = circuitBreaker.getState();

      expect(state.timeUntilRetry).not.toBeNull();
      expect(state.timeUntilRetry!).toBeLessThanOrEqual(1000);
      expect(state.timeUntilRetry!).toBeGreaterThanOrEqual(0);
    });

    it('should log circuit opening', () => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('CLOSED → OPEN'),
      );
    });
  });

  describe('State Machine - HALF_OPEN State', () => {
    beforeEach(async () => {
      circuitBreaker = new CircuitBreaker(
        { name: 'test', threshold: 2, timeout: 100, halfOpenRequests: 1 },
        mockLogger,
        mockConfigService,
      );

      // Trigger OPEN state
      const mockFn = jest.fn().mockRejectedValue(new Error('test error'));
      for (let i = 0; i < 2; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }
    });

    it('should transition from OPEN to HALF_OPEN after timeout', async () => {
      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      const mockFn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(mockFn);

      // Should have logged transition to HALF_OPEN
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('OPEN → HALF_OPEN'),
      );
    });

    it('should transition to CLOSED on successful test request', async () => {
      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      const mockFn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(mockFn);

      const state = circuitBreaker.getState();
      expect(state.state).toBe(CircuitBreakerState.CLOSED);
      expect(state.failureCount).toBe(0);
    });

    it('should transition back to OPEN on failed test request', async () => {
      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      const mockFn = jest.fn().mockRejectedValue(new Error('still failing'));

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();

      const state = circuitBreaker.getState();
      expect(state.state).toBe(CircuitBreakerState.OPEN);
    });

    it('should allow limited requests in HALF_OPEN state', async () => {
      circuitBreaker = new CircuitBreaker(
        { name: 'test', threshold: 2, timeout: 100, halfOpenRequests: 2 },
        mockLogger,
        mockConfigService,
      );

      // Trigger OPEN
      const errorFn = jest.fn().mockRejectedValue(new Error('error'));
      for (let i = 0; i < 2; i++) {
        await expect(circuitBreaker.execute(errorFn)).rejects.toThrow();
      }

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // First request in HALF_OPEN
      const successFn = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successFn);

      // Should still be HALF_OPEN (needs 2 successes)
      expect(circuitBreaker.getState().state).toBe(
        CircuitBreakerState.HALF_OPEN,
      );

      // Second request should close circuit
      await circuitBreaker.execute(successFn);
      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('Manual Reset', () => {
    it('should reset to CLOSED state', async () => {
      circuitBreaker = new CircuitBreaker(
        { name: 'test', threshold: 2, timeout: 1000 },
        mockLogger,
        mockConfigService,
      );

      // Open circuit
      const mockFn = jest.fn().mockRejectedValue(new Error('error'));
      for (let i = 0; i < 2; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.OPEN);

      // Manual reset
      circuitBreaker.reset();

      const state = circuitBreaker.getState();
      expect(state.state).toBe(CircuitBreakerState.CLOSED);
      expect(state.failureCount).toBe(0);
      expect(state.openedAt).toBeNull();
    });

    it('should log manual reset', () => {
      circuitBreaker = new CircuitBreaker(
        { name: 'test', threshold: 2, timeout: 1000 },
        mockLogger,
        mockConfigService,
      );

      circuitBreaker.reset();

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('manually reset'),
      );
    });
  });

  describe('Error Propagation', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker(
        { name: 'test', threshold: 5, timeout: 1000 },
        mockLogger,
        mockConfigService,
      );
    });

    it('should propagate original error when circuit is CLOSED', async () => {
      const customError = new Error('Custom error message');
      const mockFn = jest.fn().mockRejectedValue(customError);

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        'Custom error message',
      );
    });

    it('should propagate original error in HALF_OPEN state', async () => {
      circuitBreaker = new CircuitBreaker(
        { name: 'test', threshold: 2, timeout: 100 },
        mockLogger,
        mockConfigService,
      );

      // Open circuit
      const errorFn = jest.fn().mockRejectedValue(new Error('error'));
      for (let i = 0; i < 2; i++) {
        await expect(circuitBreaker.execute(errorFn)).rejects.toThrow();
      }

      // Wait for timeout to transition to HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 150));

      const customError = new Error('Test error in half-open');
      const mockFn = jest.fn().mockRejectedValue(customError);

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        'Test error in half-open',
      );
    });
  });

  describe('Logging', () => {
    beforeEach(() => {
      circuitBreaker = new CircuitBreaker(
        { name: 'test', threshold: 2, timeout: 1000 },
        mockLogger,
        mockConfigService,
      );
    });

    it('should log request execution at DEBUG level', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      await circuitBreaker.execute(mockFn);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Executing request'),
      );
    });

    it('should log success at DEBUG level', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      await circuitBreaker.execute(mockFn);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Request succeeded'),
      );
    });

    it('should log failure at DEBUG level', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('error'));

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Request failed'),
      );
    });

    it('should log state transitions at INFO level', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('error'));

      // Trigger OPEN
      for (let i = 0; i < 2; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('CLOSED → OPEN'),
      );
    });
  });
});
