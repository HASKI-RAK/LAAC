// REQ-FN-017: E2E tests for Circuit Breaker Pattern
// Tests circuit breaker behavior in realistic service failure scenarios

/* eslint-disable @typescript-eslint/require-await */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CircuitBreaker, CircuitBreakerState } from '../src/core/resilience';
import { CircuitBreakerOpenError } from '../src/core/resilience/circuit-breaker.error';
import { LoggerService } from '../src/core/logger';
import {
  configFactory,
  configValidationSchema,
  Configuration,
} from '../src/core/config';

describe('REQ-FN-017: Circuit Breaker E2E', () => {
  let app: INestApplication;
  let circuitBreaker: CircuitBreaker;
  let logger: LoggerService;
  let configService: ConfigService<Configuration>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configFactory],
          validationSchema: configValidationSchema,
          validationOptions: {
            allowUnknown: true,
            abortEarly: false,
          },
        }),
      ],
      providers: [LoggerService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    logger = app.get<LoggerService>(LoggerService);
    configService = app.get<ConfigService<Configuration>>(ConfigService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Service Failure Simulation', () => {
    it('should protect against cascading failures from a flaky service', async () => {
      // Simulate a flaky external service
      let callCount = 0;
      const flakyService = jest.fn(async () => {
        callCount++;
        // Fail first 5 calls
        if (callCount <= 5) {
          throw new Error(`Service unavailable (attempt ${callCount})`);
        }
        return 'success';
      });

      circuitBreaker = new CircuitBreaker(
        {
          name: 'flaky-service',
          threshold: 5,
          timeout: 1000,
          halfOpenRequests: 1,
        },
        logger,
        configService,
      );

      // Execute 5 failures - should open circuit
      for (let i = 0; i < 5; i++) {
        await expect(circuitBreaker.execute(flakyService)).rejects.toThrow();
      }

      // Circuit should now be OPEN
      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.OPEN);

      // Next call should fail fast without calling service
      const callCountBeforeFastFail = flakyService.mock.calls.length;
      await expect(circuitBreaker.execute(flakyService)).rejects.toThrow(
        CircuitBreakerOpenError,
      );
      expect(flakyService.mock.calls.length).toBe(callCountBeforeFastFail);

      // Wait for timeout to allow HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Next call should transition to HALF_OPEN and succeed
      const result = await circuitBreaker.execute(flakyService);
      expect(result).toBe('success');
      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should handle transient errors and recover', async () => {
      let attemptCount = 0;
      const transientService = jest.fn(async () => {
        attemptCount++;
        // Fail on attempts 2 and 3
        if (attemptCount === 2 || attemptCount === 3) {
          throw new Error('Transient error');
        }
        return `attempt-${attemptCount}`;
      });

      circuitBreaker = new CircuitBreaker(
        {
          name: 'transient-service',
          threshold: 5,
          timeout: 1000,
        },
        logger,
        configService,
      );

      // First call succeeds
      await expect(circuitBreaker.execute(transientService)).resolves.toBe(
        'attempt-1',
      );

      // Second and third calls fail
      await expect(circuitBreaker.execute(transientService)).rejects.toThrow();
      await expect(circuitBreaker.execute(transientService)).rejects.toThrow();

      // Circuit should still be CLOSED (under threshold)
      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.CLOSED);
      expect(circuitBreaker.getState().failureCount).toBe(2);

      // Fourth call succeeds and resets failure count
      await expect(circuitBreaker.execute(transientService)).resolves.toBe(
        'attempt-4',
      );
      expect(circuitBreaker.getState().failureCount).toBe(0);
    });

    it('should prevent cascading failures with immediate fail-fast', async () => {
      const slowFailingService = jest.fn(async () => {
        // Simulate slow service that eventually fails
        await new Promise((resolve) => setTimeout(resolve, 100));
        throw new Error('Service timeout');
      });

      circuitBreaker = new CircuitBreaker(
        {
          name: 'slow-service',
          threshold: 3,
          timeout: 500,
        },
        logger,
        configService,
      );

      // Trigger circuit opening with 3 slow failures
      const start = Date.now();
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.execute(slowFailingService),
        ).rejects.toThrow('Service timeout');
      }
      const timeForFailures = Date.now() - start;

      // Circuit is now OPEN
      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.OPEN);

      // Multiple fail-fast attempts should be nearly instant
      const fastFailStart = Date.now();
      for (let i = 0; i < 10; i++) {
        await expect(
          circuitBreaker.execute(slowFailingService),
        ).rejects.toThrow(CircuitBreakerOpenError);
      }
      const fastFailTime = Date.now() - fastFailStart;

      // Fail-fast should be much faster than actual service calls
      expect(fastFailTime).toBeLessThan(timeForFailures / 3);
    });
  });

  describe('Recovery Scenarios', () => {
    it('should successfully recover when service becomes healthy', async () => {
      let serviceHealthy = false;
      const recoveringService = jest.fn(async () => {
        if (!serviceHealthy) {
          throw new Error('Service down');
        }
        return 'healthy';
      });

      circuitBreaker = new CircuitBreaker(
        {
          name: 'recovering-service',
          threshold: 3,
          timeout: 500,
        },
        logger,
        configService,
      );

      // Open circuit with failures
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.execute(recoveringService),
        ).rejects.toThrow();
      }

      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.OPEN);

      // Service becomes healthy
      serviceHealthy = true;

      // Wait for HALF_OPEN timeout
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Test request should succeed and close circuit
      const result = await circuitBreaker.execute(recoveringService);
      expect(result).toBe('healthy');
      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.CLOSED);

      // Subsequent requests should work normally
      await expect(circuitBreaker.execute(recoveringService)).resolves.toBe(
        'healthy',
      );
    });

    it('should reopen circuit if service still failing after timeout', async () => {
      const permanentlyFailingService = jest.fn(async () => {
        throw new Error('Permanent failure');
      });

      circuitBreaker = new CircuitBreaker(
        {
          name: 'permanent-failure',
          threshold: 2,
          timeout: 300,
        },
        logger,
        configService,
      );

      // Open circuit
      for (let i = 0; i < 2; i++) {
        await expect(
          circuitBreaker.execute(permanentlyFailingService),
        ).rejects.toThrow('Permanent failure');
      }

      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.OPEN);

      // Wait for HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Test request fails, circuit reopens
      await expect(
        circuitBreaker.execute(permanentlyFailingService),
      ).rejects.toThrow('Permanent failure');

      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.OPEN);
    });

    it('should require multiple successes to close when configured', async () => {
      let callCount = 0;
      const multiSuccessService = jest.fn(async () => {
        callCount++;
        // Fail first 2 calls (to open circuit), then fail first recovery attempt
        if (callCount <= 3) {
          throw new Error('Still recovering');
        }
        return 'recovered';
      });

      circuitBreaker = new CircuitBreaker(
        {
          name: 'multi-success',
          threshold: 2,
          timeout: 300,
          halfOpenRequests: 2, // Require 2 successes
        },
        logger,
        configService,
      );

      // Open circuit with 2 failures
      for (let i = 0; i < 2; i++) {
        await expect(
          circuitBreaker.execute(multiSuccessService),
        ).rejects.toThrow();
      }

      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.OPEN);

      // First recovery attempt fails, reopens
      await new Promise((resolve) => setTimeout(resolve, 400));
      await expect(
        circuitBreaker.execute(multiSuccessService),
      ).rejects.toThrow();

      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.OPEN);

      // Wait for another HALF_OPEN attempt - now service starts working
      await new Promise((resolve) => setTimeout(resolve, 400));

      // First success - should still be HALF_OPEN
      const result1 = await circuitBreaker.execute(multiSuccessService);
      expect(result1).toBe('recovered');
      expect(circuitBreaker.getState().state).toBe(
        CircuitBreakerState.HALF_OPEN,
      );

      // Second success - should close circuit
      const result2 = await circuitBreaker.execute(multiSuccessService);
      expect(result2).toBe('recovered');
      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('Configuration from Environment', () => {
    it('should use configuration from ConfigService', async () => {
      // Create circuit breaker using environment configuration
      circuitBreaker = new CircuitBreaker(
        { name: 'env-config-test' },
        logger,
        configService,
      );

      // Should use default values from config
      expect(circuitBreaker.config.threshold).toBe(5);
      expect(circuitBreaker.config.timeout).toBe(30000);
      expect(circuitBreaker.config.halfOpenRequests).toBe(1);
    });

    it('should allow config override', async () => {
      circuitBreaker = new CircuitBreaker(
        {
          name: 'override-test',
          threshold: 10,
          timeout: 60000,
          halfOpenRequests: 3,
        },
        logger,
        configService,
      );

      expect(circuitBreaker.config.threshold).toBe(10);
      expect(circuitBreaker.config.timeout).toBe(60000);
      expect(circuitBreaker.config.halfOpenRequests).toBe(3);
    });
  });

  describe('Manual Reset', () => {
    it('should allow manual reset for administrative purposes', async () => {
      const failingService = jest.fn(async () => {
        throw new Error('Service error');
      });

      circuitBreaker = new CircuitBreaker(
        {
          name: 'manual-reset-test',
          threshold: 2,
          timeout: 10000, // Long timeout
        },
        logger,
        configService,
      );

      // Open circuit
      for (let i = 0; i < 2; i++) {
        await expect(circuitBreaker.execute(failingService)).rejects.toThrow();
      }

      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.OPEN);

      // Manual reset
      circuitBreaker.reset();

      // Circuit should be closed immediately
      expect(circuitBreaker.getState().state).toBe(CircuitBreakerState.CLOSED);
      expect(circuitBreaker.getState().failureCount).toBe(0);
    });
  });

  describe('Error Context Preservation', () => {
    it('should preserve original error details', async () => {
      class CustomError extends Error {
        constructor(
          message: string,
          public code: string,
        ) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const serviceWithCustomError = jest.fn(async () => {
        throw new CustomError('Database connection failed', 'DB_CONN_ERR');
      });

      circuitBreaker = new CircuitBreaker(
        {
          name: 'error-context',
          threshold: 5,
          timeout: 1000,
        },
        logger,
        configService,
      );

      await expect(
        circuitBreaker.execute(serviceWithCustomError),
      ).rejects.toThrow(CustomError);

      try {
        await circuitBreaker.execute(serviceWithCustomError);
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        expect((error as CustomError).code).toBe('DB_CONN_ERR');
        expect((error as CustomError).message).toBe(
          'Database connection failed',
        );
      }
    });

    it('should provide circuit breaker error when circuit is OPEN', async () => {
      const service = jest.fn(async () => {
        throw new Error('Service error');
      });

      circuitBreaker = new CircuitBreaker(
        {
          name: 'cb-error-test',
          threshold: 2,
          timeout: 1000,
        },
        logger,
        configService,
      );

      // Open circuit
      for (let i = 0; i < 2; i++) {
        await expect(circuitBreaker.execute(service)).rejects.toThrow();
      }

      // Attempt call when OPEN
      await expect(circuitBreaker.execute(service)).rejects.toThrow(
        CircuitBreakerOpenError,
      );

      try {
        await circuitBreaker.execute(service);
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerOpenError);
        expect((error as CircuitBreakerOpenError).serviceName).toBe(
          'cb-error-test',
        );
        expect((error as CircuitBreakerOpenError).state).toBe(
          CircuitBreakerState.OPEN,
        );
        expect(
          (error as CircuitBreakerOpenError).timeUntilRetry,
        ).toBeGreaterThan(0);
      }
    });
  });
});
