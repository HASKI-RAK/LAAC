// REQ-FN-007: Unit tests for Cache Controller
// Tests cache invalidation endpoint with mocked service

/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CacheController } from './cache.controller';
import { CacheAdminService } from '../services/cache.admin.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ScopesGuard } from '../../auth/guards/scopes.guard';

describe('REQ-FN-007: CacheController', () => {
  let controller: CacheController;
  let cacheAdminService: jest.Mocked<CacheAdminService>;

  beforeEach(async () => {
    const mockCacheAdminService = {
      invalidateCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheController],
      providers: [
        {
          provide: CacheAdminService,
          useValue: mockCacheAdminService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ScopesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CacheController>(CacheController);
    cacheAdminService = module.get(CacheAdminService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /admin/cache/invalidate', () => {
    describe('single key invalidation', () => {
      it('should invalidate a single cache key', async () => {
        const dto = {
          key: 'cache:test:key',
        };
        const mockResponse = {
          status: 'success' as const,
          invalidatedCount: 1,
          message: 'Successfully invalidated cache key: cache:test:key',
          timestamp: '2025-11-12T15:30:00.000Z',
        };
        cacheAdminService.invalidateCache.mockResolvedValue(mockResponse);

        const req = {
          user: { sub: 'admin-123', username: 'admin' },
        };

        const result = await controller.invalidateCache(dto as any, req);

        expect(result).toEqual(mockResponse);
        expect(cacheAdminService.invalidateCache).toHaveBeenCalledWith(
          dto,
          'admin-123',
        );
      });

      it('should extract admin user from JWT sub', async () => {
        const dto = {
          key: 'cache:test:key',
        };
        cacheAdminService.invalidateCache.mockResolvedValue({
          status: 'success',
          invalidatedCount: 1,
          message: 'Success',
          timestamp: '2025-11-12T15:30:00.000Z',
        });

        const req = {
          user: { sub: 'user-456' },
        };

        await controller.invalidateCache(dto as any, req);

        expect(cacheAdminService.invalidateCache).toHaveBeenCalledWith(
          dto,
          'user-456',
        );
      });

      it('should fall back to username if sub is missing', async () => {
        const dto = {
          key: 'cache:test:key',
        };
        cacheAdminService.invalidateCache.mockResolvedValue({
          status: 'success',
          invalidatedCount: 1,
          message: 'Success',
          timestamp: '2025-11-12T15:30:00.000Z',
        });

        const req = {
          user: { username: 'admin-user' },
        };

        await controller.invalidateCache(dto as any, req);

        expect(cacheAdminService.invalidateCache).toHaveBeenCalledWith(
          dto,
          'admin-user',
        );
      });

      it('should use "unknown" if no user info is available', async () => {
        const dto = {
          key: 'cache:test:key',
        };
        cacheAdminService.invalidateCache.mockResolvedValue({
          status: 'success',
          invalidatedCount: 1,
          message: 'Success',
          timestamp: '2025-11-12T15:30:00.000Z',
        });

        const req = {
          user: {},
        };

        await controller.invalidateCache(dto as any, req);

        expect(cacheAdminService.invalidateCache).toHaveBeenCalledWith(
          dto,
          'unknown',
        );
      });
    });

    describe('pattern-based invalidation', () => {
      it('should invalidate keys matching pattern', async () => {
        const dto = {
          pattern: 'cache:metrics:*',
        };
        const mockResponse = {
          status: 'success' as const,
          invalidatedCount: 5,
          message:
            'Successfully invalidated 5 cache entries matching pattern: cache:metrics:*',
          timestamp: '2025-11-12T15:30:00.000Z',
        };
        cacheAdminService.invalidateCache.mockResolvedValue(mockResponse);

        const req = {
          user: { sub: 'admin-123' },
        };

        const result = await controller.invalidateCache(dto as any, req);

        expect(result).toEqual(mockResponse);
        expect(cacheAdminService.invalidateCache).toHaveBeenCalledWith(
          dto,
          'admin-123',
        );
      });
    });

    describe('all entries invalidation', () => {
      it('should invalidate all cache entries', async () => {
        const dto = {
          all: true,
        };
        const mockResponse = {
          status: 'success' as const,
          invalidatedCount: 10,
          message: 'Successfully invalidated all 10 cache entries',
          timestamp: '2025-11-12T15:30:00.000Z',
        };
        cacheAdminService.invalidateCache.mockResolvedValue(mockResponse);

        const req = {
          user: { sub: 'admin-123' },
        };

        const result = await controller.invalidateCache(dto as any, req);

        expect(result).toEqual(mockResponse);
        expect(cacheAdminService.invalidateCache).toHaveBeenCalledWith(
          dto,
          'admin-123',
        );
      });
    });

    describe('validation', () => {
      it('should throw BadRequestException when no operation is specified', async () => {
        const dto = {};

        const req = {
          user: { sub: 'admin-123' },
        };

        await expect(
          controller.invalidateCache(dto as any, req),
        ).rejects.toThrow(BadRequestException);
        await expect(
          controller.invalidateCache(dto as any, req),
        ).rejects.toThrow(
          'At least one of key, pattern, or all must be specified',
        );

        expect(cacheAdminService.invalidateCache).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when all fields are undefined', async () => {
        const dto = {
          key: undefined,
          pattern: undefined,
          all: undefined,
        };

        const req = {
          user: { sub: 'admin-123' },
        };

        await expect(
          controller.invalidateCache(dto as any, req),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('error responses', () => {
      it('should return error response from service', async () => {
        const dto = {
          key: 'cache:error:key',
        };
        const mockErrorResponse = {
          status: 'error' as const,
          invalidatedCount: 0,
          message: 'Cache invalidation failed: Redis connection failed',
          timestamp: '2025-11-12T15:30:00.000Z',
        };
        cacheAdminService.invalidateCache.mockResolvedValue(mockErrorResponse);

        const req = {
          user: { sub: 'admin-123' },
        };

        const result = await controller.invalidateCache(dto as any, req);

        expect(result).toEqual(mockErrorResponse);
        expect(result.status).toBe('error');
      });
    });

    describe('response format', () => {
      it('should return response with all required fields', async () => {
        const dto = {
          key: 'cache:test:key',
        };
        const mockResponse = {
          status: 'success' as const,
          invalidatedCount: 1,
          message: 'Success message',
          timestamp: '2025-11-12T15:30:00.000Z',
        };
        cacheAdminService.invalidateCache.mockResolvedValue(mockResponse);

        const req = {
          user: { sub: 'admin-123' },
        };

        const result = await controller.invalidateCache(dto as any, req);

        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('invalidatedCount');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('timestamp');
        expect(typeof result.status).toBe('string');
        expect(typeof result.invalidatedCount).toBe('number');
        expect(typeof result.message).toBe('string');
        expect(typeof result.timestamp).toBe('string');
      });

      it('should return ISO8601 timestamp format', async () => {
        const dto = {
          key: 'cache:test:key',
        };
        const timestamp = new Date().toISOString();
        const mockResponse = {
          status: 'success' as const,
          invalidatedCount: 1,
          message: 'Success',
          timestamp,
        };
        cacheAdminService.invalidateCache.mockResolvedValue(mockResponse);

        const req = {
          user: { sub: 'admin-123' },
        };

        const result = await controller.invalidateCache(dto as any, req);

        expect(result.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
      });
    });
  });
});
