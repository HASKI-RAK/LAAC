// REQ-NF-002: Health/Readiness Endpoints - LRS Health Indicator Tests
// REQ-FN-025: LRS Instance Health Monitoring - Unit Tests
// Unit tests for LRS (Learning Record Store) connectivity health checks

import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { LrsHealthIndicator } from './lrs.health';
import {
  LRSHealthSchedulerService,
  LRSInstanceHealthInfo,
} from '../services/lrs-health-scheduler.service';

describe('REQ-NF-002 & REQ-FN-025: LrsHealthIndicator', () => {
  let indicator: LrsHealthIndicator;
  let healthScheduler: LRSHealthSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LrsHealthIndicator,
        {
          provide: LRSHealthSchedulerService,
          useValue: {
            getOverallStatus: jest.fn(),
            getAllInstancesHealth: jest.fn(),
          },
        },
      ],
    }).compile();

    indicator = module.get<LrsHealthIndicator>(LrsHealthIndicator);
    healthScheduler = module.get<LRSHealthSchedulerService>(
      LRSHealthSchedulerService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy', () => {
    it('should return healthy status when all instances are healthy', async () => {
      const mockInstances = new Map<string, LRSInstanceHealthInfo>([
        [
          'default',
          {
            instanceId: 'default',
            status: 'healthy',
            latency: 100,
            lastCheck: new Date(),
          },
        ],
      ]);

      jest
        .spyOn(healthScheduler, 'getOverallStatus')
        .mockReturnValue('healthy');
      jest
        .spyOn(healthScheduler, 'getAllInstancesHealth')
        .mockReturnValue(mockInstances);

      const result = await indicator.isHealthy('lrs');

      expect(result).toEqual({
        lrs: {
          status: 'healthy',
          message: 'LRS status: healthy',
          instanceCount: 1,
        },
      });
    });

    it('should return healthy status when status is degraded (some instances down)', async () => {
      const mockInstances = new Map<string, LRSInstanceHealthInfo>([
        [
          'hs-ke',
          {
            instanceId: 'hs-ke',
            status: 'healthy',
            latency: 100,
            lastCheck: new Date(),
          },
        ],
        [
          'hs-rv',
          {
            instanceId: 'hs-rv',
            status: 'unhealthy',
            latency: 5000,
            lastCheck: new Date(),
            error: 'Connection timeout',
          },
        ],
      ]);

      jest
        .spyOn(healthScheduler, 'getOverallStatus')
        .mockReturnValue('degraded');
      jest
        .spyOn(healthScheduler, 'getAllInstancesHealth')
        .mockReturnValue(mockInstances);

      const result = await indicator.isHealthy('lrs');

      expect(result).toEqual({
        lrs: {
          status: 'degraded',
          message: 'LRS status: degraded',
          instanceCount: 2,
        },
      });
    });

    it('should throw HealthCheckError when all instances are unhealthy', async () => {
      const mockInstances = new Map<string, LRSInstanceHealthInfo>([
        [
          'default',
          {
            instanceId: 'default',
            status: 'unhealthy',
            latency: 5000,
            lastCheck: new Date(),
            error: 'Connection timeout',
          },
        ],
      ]);

      jest
        .spyOn(healthScheduler, 'getOverallStatus')
        .mockReturnValue('unhealthy');
      jest
        .spyOn(healthScheduler, 'getAllInstancesHealth')
        .mockReturnValue(mockInstances);

      await expect(indicator.isHealthy('lrs')).rejects.toThrow(
        HealthCheckError,
      );
    });

    it('should throw HealthCheckError with correct error details', async () => {
      const mockInstances = new Map<string, LRSInstanceHealthInfo>();

      jest
        .spyOn(healthScheduler, 'getOverallStatus')
        .mockReturnValue('unhealthy');
      jest
        .spyOn(healthScheduler, 'getAllInstancesHealth')
        .mockReturnValue(mockInstances);

      try {
        await indicator.isHealthy('lrs');
        fail('Expected HealthCheckError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        const healthCheckError = error as HealthCheckError;
        expect(healthCheckError.causes).toEqual({
          lrs: {
            status: 'unhealthy',
            message: 'All LRS instances are unhealthy',
            instanceCount: 0,
          },
        });
      }
    });
  });
});
