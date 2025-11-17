// REQ-NF-002: Health/Readiness Endpoints - Unit Tests
// Tests for HealthController liveness and readiness probes

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';

describe('REQ-NF-002: HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let redisHealthIndicator: RedisHealthIndicator;

  const mockHealthCheckResult: HealthCheckResult = {
    status: 'ok',
    info: {},
    error: {},
    details: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: RedisHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    redisHealthIndicator =
      module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkLiveness', () => {
    it('should return health status with version and timestamp', async () => {
      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockHealthCheckResult);

      const result = await controller.checkLiveness();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('timestamp');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const checkSpy = healthCheckService.check as jest.Mock;
      expect(checkSpy).toHaveBeenCalledWith([]);
    });

    it('should include ISO 8601 timestamp', async () => {
      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockHealthCheckResult);

      const result = await controller.checkLiveness();

      expect((result as any).timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it('should not check external dependencies', async () => {
      const checkSpy = jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockHealthCheckResult);

      await controller.checkLiveness();

      expect(checkSpy).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const redisHealthySpy = redisHealthIndicator.isHealthy as jest.Mock;
      expect(redisHealthySpy).not.toHaveBeenCalled();
    });
  });

  describe('checkReadiness', () => {
    it('should return health status with version and timestamp', async () => {
      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockHealthCheckResult);

      const result = await controller.checkReadiness();

      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('timestamp');
    });

    it('should check Redis dependency', async () => {
      const mockChecks = [expect.any(Function)];
      const checkSpy = jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockHealthCheckResult);

      await controller.checkReadiness();

      expect(checkSpy).toHaveBeenCalledWith(mockChecks);
    });

    it('should include dependency statuses', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: {
          redis: { status: 'up' },
        },
        error: {},
        details: {
          redis: { status: 'up' },
        },
      };

      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await controller.checkReadiness();

      expect(result.info).toBeDefined();
      expect(result.details).toBeDefined();
    });
  });
});
