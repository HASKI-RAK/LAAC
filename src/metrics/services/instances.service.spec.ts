// REQ-FN-017: Unit tests for Instances Service
// Tests for LRS instance metadata retrieval and health status mapping

/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { InstancesService } from './instances.service';
import { LRSClient } from '../../data-access/clients/lrs.client';
import { LoggerService } from '../../core/logger';
import { LRSHealthStatus } from '../../data-access/interfaces/lrs.interface';

describe('REQ-FN-017: InstancesService', () => {
  let service: InstancesService;
  let mockLRSClient: jest.Mocked<LRSClient>;
  let mockLogger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    // Create mocks
    mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    mockLRSClient = {
      instanceId: 'default',
      getInstanceHealth: jest.fn(),
    } as unknown as jest.Mocked<LRSClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstancesService,
        {
          provide: LRSClient,
          useValue: mockLRSClient,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<InstancesService>(InstancesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstances', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return healthy instance without lastSync field', async () => {
      const mockHealth: LRSHealthStatus = {
        instanceId: 'default',
        healthy: true,
        version: '1.0.3',
        responseTimeMs: 50,
      };

      mockLRSClient.getInstanceHealth.mockResolvedValue(mockHealth);

      const result = await service.getInstances();

      expect(result.instances).toHaveLength(1);
      expect(result.instances[0].id).toBe('default');
      expect(result.instances[0].name).toBe('Default LRS');
      expect(result.instances[0].status).toBe('healthy');
      // lastSync field removed - will be added when actual sync tracking is implemented
      expect(result.instances[0].lastSync).toBeUndefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Fetching LRS instances metadata',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'LRS instances metadata retrieved',
        expect.objectContaining({ count: 1 }),
      );
    });

    it('should return unavailable instance without lastSync', async () => {
      const mockHealth: LRSHealthStatus = {
        instanceId: 'default',
        healthy: false,
        error: 'Connection timeout',
      };

      mockLRSClient.getInstanceHealth.mockResolvedValue(mockHealth);

      const result = await service.getInstances();

      expect(result.instances).toHaveLength(1);
      expect(result.instances[0].id).toBe('default');
      expect(result.instances[0].status).toBe('unavailable');
      expect(result.instances[0].lastSync).toBeUndefined();
    });

    it('should return unavailable instance on health check error', async () => {
      mockLRSClient.getInstanceHealth.mockRejectedValue(
        new Error('Connection failed'),
      );

      const result = await service.getInstances();

      expect(result.instances).toHaveLength(1);
      expect(result.instances[0].status).toBe('unavailable');
      expect(result.instances[0].lastSync).toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch LRS instances metadata',
        expect.any(Error),
      );
    });

    it('should map hs-ke instance ID to correct name', async () => {
      // Create new mock with different instanceId
      const mockLRSClientHsKe = {
        instanceId: 'hs-ke',
        getInstanceHealth: jest.fn(),
      } as unknown as jest.Mocked<LRSClient>;

      const mockHealth: LRSHealthStatus = {
        instanceId: 'hs-ke',
        healthy: true,
      };

      mockLRSClientHsKe.getInstanceHealth.mockResolvedValue(mockHealth);

      // Create new service instance with different LRS client
      const serviceHsKe = new InstancesService(mockLRSClientHsKe, mockLogger);

      const result = await serviceHsKe.getInstances();

      expect(result.instances[0].id).toBe('hs-ke');
      expect(result.instances[0].name).toBe('Hochschule Kempten');
    });

    it('should map hs-rv instance ID to correct name', async () => {
      // Create new mock with different instanceId
      const mockLRSClientHsRv = {
        instanceId: 'hs-rv',
        getInstanceHealth: jest.fn(),
      } as unknown as jest.Mocked<LRSClient>;

      const mockHealth: LRSHealthStatus = {
        instanceId: 'hs-rv',
        healthy: true,
      };

      mockLRSClientHsRv.getInstanceHealth.mockResolvedValue(mockHealth);

      // Create new service instance with different LRS client
      const serviceHsRv = new InstancesService(mockLRSClientHsRv, mockLogger);

      const result = await serviceHsRv.getInstances();

      expect(result.instances[0].id).toBe('hs-rv');
      expect(result.instances[0].name).toBe('Hochschule Ravensburg-Weingarten');
    });

    it('should map unknown instance ID to generic name', async () => {
      // Create new mock with different instanceId
      const mockLRSClientUnknown = {
        instanceId: 'unknown-id',
        getInstanceHealth: jest.fn(),
      } as unknown as jest.Mocked<LRSClient>;

      const mockHealth: LRSHealthStatus = {
        instanceId: 'unknown-id',
        healthy: true,
      };

      mockLRSClientUnknown.getInstanceHealth.mockResolvedValue(mockHealth);

      // Create new service instance with different LRS client
      const serviceUnknown = new InstancesService(
        mockLRSClientUnknown,
        mockLogger,
      );

      const result = await serviceUnknown.getInstances();

      expect(result.instances[0].id).toBe('unknown-id');
      expect(result.instances[0].name).toBe('LRS Instance unknown-id');
    });
  });
});
