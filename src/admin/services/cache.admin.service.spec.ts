// REQ-FN-007: Unit tests for Cache Admin Service
// Tests cache invalidation service logic with mocked dependencies

import { Test, TestingModule } from '@nestjs/testing';
import { CacheAdminService } from './cache.admin.service';
import { CacheService } from '../../data-access/services/cache.service';
import { LoggerService } from '../../core/logger';
import { MetricsRegistryService } from './metrics-registry.service';

describe('REQ-FN-007: CacheAdminService', () => {
  let service: CacheAdminService;
  let cacheService: jest.Mocked<CacheService>;
  let logger: jest.Mocked<LoggerService>;
  let metricsRegistry: jest.Mocked<MetricsRegistryService>;

  beforeEach(async () => {
    const mockCacheService = {
      invalidateKey: jest.fn(),
      invalidatePattern: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const mockMetricsRegistry = {
      recordCacheEviction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheAdminService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
        {
          provide: MetricsRegistryService,
          useValue: mockMetricsRegistry,
        },
      ],
    }).compile();

    service = module.get<CacheAdminService>(CacheAdminService);
    cacheService = module.get(CacheService);
    logger = module.get(LoggerService);
    metricsRegistry = module.get(MetricsRegistryService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('invalidateCache - single key', () => {
    it('should invalidate a single cache key successfully', async () => {
      const dto = {
        key: 'cache:test:key',
      };
      cacheService.invalidateKey.mockResolvedValue(true);

      const result = await service.invalidateCache(dto, 'admin-user-123');

      expect(result.status).toBe('success');
      expect(result.invalidatedCount).toBe(1);
      expect(result.message).toContain('Successfully invalidated cache key');
      expect(result.message).toContain('cache:test:key');
      expect(result.timestamp).toBeDefined();

      expect(cacheService.invalidateKey).toHaveBeenCalledWith('cache:test:key');
      expect(metricsRegistry.recordCacheEviction).toHaveBeenCalledWith(1);
      expect(logger.log).toHaveBeenCalled();
    });

    it('should handle key not found (invalidateKey returns false)', async () => {
      const dto = {
        key: 'cache:nonexistent:key',
      };
      cacheService.invalidateKey.mockResolvedValue(false);

      const result = await service.invalidateCache(dto, 'admin-user-123');

      expect(result.status).toBe('success');
      expect(result.invalidatedCount).toBe(0);
      expect(result.message).toContain('Cache key not found');
      expect(result.message).toContain('cache:nonexistent:key');

      expect(cacheService.invalidateKey).toHaveBeenCalledWith(
        'cache:nonexistent:key',
      );
      expect(metricsRegistry.recordCacheEviction).not.toHaveBeenCalled();
    });

    it('should include admin user in logs', async () => {
      const dto = {
        key: 'cache:test:key',
      };
      cacheService.invalidateKey.mockResolvedValue(true);

      await service.invalidateCache(dto, 'admin-user-456');

      expect(logger.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          adminUser: 'admin-user-456',
        }),
      );
    });
  });

  describe('invalidateCache - pattern', () => {
    it('should invalidate multiple keys matching pattern', async () => {
      const dto = {
        pattern: 'cache:metrics:*',
      };
      cacheService.invalidatePattern.mockResolvedValue(5);

      const result = await service.invalidateCache(dto, 'admin-user-123');

      expect(result.status).toBe('success');
      expect(result.invalidatedCount).toBe(5);
      expect(result.message).toContain(
        'Successfully invalidated 5 cache entries',
      );
      expect(result.message).toContain('cache:metrics:*');

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        'cache:metrics:*',
      );
      expect(metricsRegistry.recordCacheEviction).toHaveBeenCalledWith(5);
    });

    it('should handle pattern with no matches', async () => {
      const dto = {
        pattern: 'cache:nonexistent:*',
      };
      cacheService.invalidatePattern.mockResolvedValue(0);

      const result = await service.invalidateCache(dto, 'admin-user-123');

      expect(result.status).toBe('success');
      expect(result.invalidatedCount).toBe(0);
      expect(result.message).toContain(
        'No cache entries found matching pattern',
      );

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        'cache:nonexistent:*',
      );
      expect(metricsRegistry.recordCacheEviction).not.toHaveBeenCalled();
    });
  });

  describe('invalidateCache - all', () => {
    it('should invalidate all cache entries when all is true', async () => {
      const dto = {
        all: true,
      };
      cacheService.invalidatePattern.mockResolvedValue(10);

      const result = await service.invalidateCache(dto, 'admin-user-123');

      expect(result.status).toBe('success');
      expect(result.invalidatedCount).toBe(10);
      expect(result.message).toContain(
        'Successfully invalidated all 10 cache entries',
      );

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith('cache:*');
      expect(metricsRegistry.recordCacheEviction).toHaveBeenCalledWith(10);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('all entries'),
        expect.objectContaining({
          adminUser: 'admin-user-123',
        }),
      );
    });

    it('should log warning for all cache invalidation', async () => {
      const dto = {
        all: true,
      };
      cacheService.invalidatePattern.mockResolvedValue(3);

      await service.invalidateCache(dto, 'admin-user-789');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          adminUser: 'admin-user-789',
          warning: expect.any(String),
        }),
      );
    });
  });

  describe('invalidateCache - error handling', () => {
    it('should handle cache service errors gracefully', async () => {
      const dto = {
        key: 'cache:error:key',
      };
      const error = new Error('Redis connection failed');
      cacheService.invalidateKey.mockRejectedValue(error);

      const result = await service.invalidateCache(dto, 'admin-user-123');

      expect(result.status).toBe('error');
      expect(result.invalidatedCount).toBe(0);
      expect(result.message).toContain('Cache invalidation failed');
      expect(result.message).toContain('Redis connection failed');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle no operation specified', async () => {
      const dto = {};

      const result = await service.invalidateCache(dto, 'admin-user-123');

      expect(result.status).toBe('error');
      expect(result.invalidatedCount).toBe(0);
      expect(result.message).toContain('No invalidation operation specified');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('no operation specified'),
        expect.any(Object),
      );
    });
  });

  describe('invalidateCache - audit logging', () => {
    it('should log audit event for single key invalidation', async () => {
      const dto = {
        key: 'cache:audit:key',
      };
      cacheService.invalidateKey.mockResolvedValue(true);

      await service.invalidateCache(dto, 'admin-user-audit');

      // Verify audit event is logged (via log method)
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Audit event'),
        expect.objectContaining({
          action: 'cache.invalidate',
          operationType: 'single',
          count: 1,
          adminUser: 'admin-user-audit',
        }),
      );
    });

    it('should log audit event for pattern invalidation', async () => {
      const dto = {
        pattern: 'cache:audit:*',
      };
      cacheService.invalidatePattern.mockResolvedValue(3);

      await service.invalidateCache(dto, 'admin-user-pattern');

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Audit event'),
        expect.objectContaining({
          action: 'cache.invalidate',
          operationType: 'pattern',
          count: 3,
          adminUser: 'admin-user-pattern',
        }),
      );
    });

    it('should handle missing admin user', async () => {
      const dto = {
        key: 'cache:test:key',
      };
      cacheService.invalidateKey.mockResolvedValue(true);

      const result = await service.invalidateCache(dto); // No admin user

      expect(result.status).toBe('success');
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Audit event'),
        expect.objectContaining({
          adminUser: 'unknown',
        }),
      );
    });
  });

  describe('invalidateCache - metrics', () => {
    it('should record metrics for successful invalidation', async () => {
      const dto = {
        pattern: 'cache:metrics:*',
      };
      cacheService.invalidatePattern.mockResolvedValue(7);

      await service.invalidateCache(dto, 'admin-user-123');

      expect(metricsRegistry.recordCacheEviction).toHaveBeenCalledWith(7);
    });

    it('should not record metrics when no keys are invalidated', async () => {
      const dto = {
        key: 'cache:empty:key',
      };
      cacheService.invalidateKey.mockResolvedValue(false);

      await service.invalidateCache(dto, 'admin-user-123');

      expect(metricsRegistry.recordCacheEviction).not.toHaveBeenCalled();
    });

    it('should not record metrics on error', async () => {
      const dto = {
        key: 'cache:error:key',
      };
      cacheService.invalidateKey.mockRejectedValue(new Error('Test error'));

      await service.invalidateCache(dto, 'admin-user-123');

      expect(metricsRegistry.recordCacheEviction).not.toHaveBeenCalled();
    });
  });
});
