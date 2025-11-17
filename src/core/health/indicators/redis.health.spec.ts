// REQ-NF-002: Health/Readiness Endpoints - Redis Health Indicator Tests
// Unit tests for Redis connectivity health checks
// Note: Full integration tests with real Redis instance are in E2E tests

import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../config';

describe('REQ-NF-002: RedisHealthIndicator', () => {
  const mockRedisConfig = {
    host: 'localhost',
    port: 6379,
    password: '',
    ttl: 3600,
  };

  describe('configuration', () => {
    it('should throw error if Redis configuration is missing', () => {
      const configService = {
        get: jest.fn(() => undefined),
      } as unknown as ConfigService<Configuration>;

      expect(() => {
        // Import fresh to bypass module cache
        jest.resetModules();
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { RedisHealthIndicator } = require('./redis.health');

        new RedisHealthIndicator(configService);
      }).toThrow('Redis configuration is missing');
    });

    it('should accept valid Redis configuration', () => {
      const configService = {
        get: jest.fn(() => mockRedisConfig),
      } as unknown as ConfigService<Configuration>;

      // Should not throw during construction with valid config
      expect(() => {
        jest.resetModules();
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { RedisHealthIndicator } = require('./redis.health');

        const indicator = new RedisHealthIndicator(configService);
        expect(indicator).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('interface compliance', () => {
    it('should implement required health indicator methods', () => {
      const configService = {
        get: jest.fn(() => mockRedisConfig),
      } as unknown as ConfigService<Configuration>;

      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RedisHealthIndicator } = require('./redis.health');

      const indicator = new RedisHealthIndicator(configService);

      // Check that the indicator has the expected methods from HealthIndicator

      expect(indicator).toHaveProperty('isHealthy');

      expect(typeof indicator.isHealthy).toBe('function');

      expect(indicator).toHaveProperty('onApplicationShutdown');

      expect(typeof indicator.onApplicationShutdown).toBe('function');
    });
  });
});
