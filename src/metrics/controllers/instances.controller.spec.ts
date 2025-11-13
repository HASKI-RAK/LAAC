// REQ-FN-017: Unit tests for Instances Controller
// Tests for LRS instance metadata endpoint

/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { InstancesController } from './instances.controller';
import { InstancesService } from '../services/instances.service';
import { InstancesResponseDto, LRSInstanceDto } from '../dto/instance.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ScopesGuard } from '../../auth/guards/scopes.guard';

describe('REQ-FN-017: InstancesController', () => {
  let controller: InstancesController;
  let mockInstancesService: jest.Mocked<InstancesService>;

  beforeEach(async () => {
    // Create mock service
    mockInstancesService = {
      getInstances: jest.fn(),
    } as unknown as jest.Mocked<InstancesService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstancesController],
      providers: [
        {
          provide: InstancesService,
          useValue: mockInstancesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ScopesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InstancesController>(InstancesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstances', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should return list of instances', async () => {
      const mockInstances: LRSInstanceDto[] = [
        {
          id: 'hs-ke',
          name: 'Hochschule Kempten',
          status: 'healthy',
          lastSync: '2025-11-10T10:30:00Z',
        },
        {
          id: 'hs-rv',
          name: 'Hochschule Ravensburg-Weingarten',
          status: 'degraded',
          lastSync: '2025-11-10T10:28:15Z',
        },
      ];

      const mockResponse: InstancesResponseDto = {
        instances: mockInstances,
      };

      mockInstancesService.getInstances.mockResolvedValue(mockResponse);

      const result = await controller.getInstances();

      expect(result).toEqual(mockResponse);
      expect(result.instances).toHaveLength(2);
      expect(result.instances[0].id).toBe('hs-ke');
      expect(result.instances[1].id).toBe('hs-rv');
      expect(mockInstancesService.getInstances).toHaveBeenCalledTimes(1);
    });

    it('should return single instance', async () => {
      const mockInstance: LRSInstanceDto = {
        id: 'default',
        name: 'Default LRS',
        status: 'healthy',
        lastSync: '2025-11-10T10:30:00Z',
      };

      const mockResponse: InstancesResponseDto = {
        instances: [mockInstance],
      };

      mockInstancesService.getInstances.mockResolvedValue(mockResponse);

      const result = await controller.getInstances();

      expect(result).toEqual(mockResponse);
      expect(result.instances).toHaveLength(1);
      expect(result.instances[0].id).toBe('default');
      expect(mockInstancesService.getInstances).toHaveBeenCalledTimes(1);
    });

    it('should return instance with unavailable status', async () => {
      const mockInstance: LRSInstanceDto = {
        id: 'hs-ke',
        name: 'Hochschule Kempten',
        status: 'unavailable',
      };

      const mockResponse: InstancesResponseDto = {
        instances: [mockInstance],
      };

      mockInstancesService.getInstances.mockResolvedValue(mockResponse);

      const result = await controller.getInstances();

      expect(result).toEqual(mockResponse);
      expect(result.instances[0].status).toBe('unavailable');
      expect(result.instances[0].lastSync).toBeUndefined();
    });
  });
});
