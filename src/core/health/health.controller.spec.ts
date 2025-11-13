// REQ-NF-002: Health/Readiness Endpoints - Unit Tests
// REQ-FN-025: LRS Instance Health Monitoring - Unit Tests
// Tests for HealthController liveness and readiness probes

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { LrsHealthIndicator } from './indicators/lrs.health';
import {
  LRSHealthSchedulerService,
  LRSInstanceHealthInfo,
} from './services/lrs-health-scheduler.service';

describe('REQ-NF-002: HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let redisHealthIndicator: RedisHealthIndicator;
  let lrsHealthIndicator: LrsHealthIndicator;
  let lrsHealthScheduler: LRSHealthSchedulerService;

  const mockHealthCheckResult: HealthCheckResult = {
    status: 'ok',
    info: {
      lrs: {
        status: 'up',
      },
    },
    error: {},
    details: {
      lrs: {
        status: 'up',
      },
    },
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
          provide: LrsHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
        {
          provide: LRSHealthSchedulerService,
          useValue: {
            getAllInstancesHealth: jest
              .fn()
              .mockReturnValue(new Map<string, LRSInstanceHealthInfo>()),
            getOverallStatus: jest.fn().mockReturnValue('healthy'),
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
    lrsHealthIndicator = module.get<LrsHealthIndicator>(LrsHealthIndicator);
    lrsHealthScheduler = module.get<LRSHealthSchedulerService>(
      LRSHealthSchedulerService,
    );
    // Mark as used to avoid lint errors
    expect(lrsHealthScheduler).toBeDefined();
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
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const lrsHealthySpy = lrsHealthIndicator.isHealthy as jest.Mock;
      expect(redisHealthySpy).not.toHaveBeenCalled();
      expect(lrsHealthySpy).not.toHaveBeenCalled();
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

    it('should check Redis and LRS dependencies', async () => {
      const mockChecks = [expect.any(Function), expect.any(Function)];
      const checkSpy = jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockHealthCheckResult);

      await controller.checkReadiness();

      expect(checkSpy).toHaveBeenCalledWith(mockChecks);
    });

    it('should include all dependency statuses', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: {
          redis: { status: 'up' },
          lrs: { status: 'up' },
        },
        error: {},
        details: {
          redis: { status: 'up' },
          lrs: { status: 'up' },
        },
      };

      jest.spyOn(healthCheckService, 'check').mockResolvedValue(mockResult);

      const result = await controller.checkReadiness();

      expect(result.info).toBeDefined();
      expect(result.details).toBeDefined();
    });
  });
});
