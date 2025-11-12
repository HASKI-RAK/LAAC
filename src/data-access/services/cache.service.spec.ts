// REQ-FN-006: Unit tests for CacheService
// Tests Redis cache operations with mocked Redis client

/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { LoggerService } from '../../core/logger';
import { MetricsRegistryService } from '../../admin/services/metrics-registry.service';

// Mock Redis methods
const mockRedisInstance = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  ping: jest.fn().mockResolvedValue('PONG'),
  scanStream: jest.fn(),
  pipeline: jest.fn(),
  on: jest.fn().mockReturnThis(),
};

// Mock ioredis constructor
jest.mock('ioredis', () => {
  // Return a constructor function that returns mockRedisInstance
  const MockRedis: any = jest.fn(() => mockRedisInstance);
  // Support both default and named imports
  MockRedis.default = MockRedis;
  return MockRedis;
});

describe('REQ-FN-006: CacheService', () => {
  let service: CacheService;
  let mockLogger: jest.Mocked<LoggerService>;
  let mockMetricsRegistry: jest.Mocked<MetricsRegistryService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    mockMetricsRegistry = {
      recordCacheOperation: jest.fn(),
      recordCacheEviction: jest.fn(),
    } as unknown as jest.Mocked<MetricsRegistryService>;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'redis') {
          return {
            host: 'localhost',
            port: 6379,
            ttl: 3600,
            poolSize: 10,
            ttlMetrics: 3600,
            ttlResults: 300,
            ttlHealth: 60,
          };
        }
        if (key === 'redis.ttl') {
          return 3600;
        }
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
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

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to Redis on startup', async () => {
      await service.onModuleInit();

      expect(mockRedisInstance.connect).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Redis cache service initialized',
      );
    });

    it('should not throw if Redis connection fails on startup', async () => {
      mockRedisInstance.connect.mockRejectedValueOnce(
        new Error('Connection failed'),
      );

      await expect(service.onModuleInit()).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to Redis on startup',
        expect.any(Error),
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should close Redis connection on shutdown', async () => {
      await service.onModuleDestroy();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Redis connection closed gracefully',
      );
    });

    it('should not throw if Redis quit fails', async () => {
      mockRedisInstance.quit.mockRejectedValueOnce(new Error('Quit failed'));

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error closing Redis connection',
        expect.any(Error),
      );
    });
  });

  describe('get', () => {
    it('should return cached value on cache hit', async () => {
      const testData = { foo: 'bar', count: 42 };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(testData));

      const result = await service.get<typeof testData>('test-key');

      expect(result).toEqual(testData);
      expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key');
      expect(mockLogger.debug).toHaveBeenCalledWith('Cache hit', {
        key: 'test-key',
      });
      expect(mockMetricsRegistry.recordCacheOperation).toHaveBeenCalledWith(
        'get',
        expect.any(Number),
      );
    });

    it('should return null on cache miss', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await service.get('test-key');

      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith('Cache miss', {
        key: 'test-key',
      });
      expect(mockMetricsRegistry.recordCacheOperation).toHaveBeenCalledWith(
        'get',
        expect.any(Number),
      );
    });

    it('should return null and log warning on Redis error', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get('test-key');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache get operation failed',
        expect.objectContaining({
          key: 'test-key',
          error: 'Redis error',
        }),
      );
      expect(mockMetricsRegistry.recordCacheOperation).toHaveBeenCalledWith(
        'get',
        expect.any(Number),
      );
    });
  });

  describe('set', () => {
    it('should store value with default TTL', async () => {
      const testData = { foo: 'bar' };
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result = await service.set('test-key', testData);

      expect(result).toBe(true);
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key',
        3600,
        JSON.stringify(testData),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Cache set successful', {
        key: 'test-key',
        ttl: 3600,
      });
      expect(mockMetricsRegistry.recordCacheOperation).toHaveBeenCalledWith(
        'set',
        expect.any(Number),
      );
    });

    it('should store value with custom TTL', async () => {
      const testData = { foo: 'bar' };
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result = await service.set('test-key', testData, 300);

      expect(result).toBe(true);
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key',
        300,
        JSON.stringify(testData),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Cache set successful', {
        key: 'test-key',
        ttl: 300,
      });
    });

    it('should use category-specific TTL when category is provided', async () => {
      const testData = { foo: 'bar' };
      mockRedisInstance.setex.mockResolvedValue('OK');

      // Test metrics category (should use ttlMetrics)
      await service.set('test-key', testData, undefined, 'metrics');
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key',
        3600, // ttlMetrics from config
        JSON.stringify(testData),
      );

      // Test results category (should use ttlResults)
      await service.set('test-key2', testData, undefined, 'results');
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key2',
        300, // ttlResults from config (mocked in configService)
        JSON.stringify(testData),
      );

      // Test health category (should use ttlHealth)
      await service.set('test-key3', testData, undefined, 'health');
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test-key3',
        60, // ttlHealth from config (mocked in configService)
        JSON.stringify(testData),
      );
    });

    it('should return false and log warning on Redis error', async () => {
      mockRedisInstance.setex.mockRejectedValue(new Error('Redis error'));

      const result = await service.set('test-key', { foo: 'bar' });

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache set operation failed',
        expect.objectContaining({
          key: 'test-key',
          error: 'Redis error',
        }),
      );
      expect(mockMetricsRegistry.recordCacheOperation).toHaveBeenCalledWith(
        'set',
        expect.any(Number),
      );
    });
  });

  describe('delete', () => {
    it('should delete key and return true if key exists', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const result = await service.delete('test-key');

      expect(result).toBe(true);
      expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
      expect(mockLogger.debug).toHaveBeenCalledWith('Cache delete successful', {
        key: 'test-key',
        count: 1,
      });
      expect(mockMetricsRegistry.recordCacheEviction).toHaveBeenCalledWith(1);
      expect(mockMetricsRegistry.recordCacheOperation).toHaveBeenCalledWith(
        'delete',
        expect.any(Number),
      );
    });

    it('should return false if key does not exist', async () => {
      mockRedisInstance.del.mockResolvedValue(0);

      const result = await service.delete('test-key');

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cache delete - key not found',
        {
          key: 'test-key',
        },
      );
      expect(mockMetricsRegistry.recordCacheEviction).not.toHaveBeenCalled();
    });

    it('should return false and log warning on Redis error', async () => {
      mockRedisInstance.del.mockRejectedValue(new Error('Redis error'));

      const result = await service.delete('test-key');

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache delete operation failed',
        expect.objectContaining({
          key: 'test-key',
          error: 'Redis error',
        }),
      );
      expect(mockMetricsRegistry.recordCacheOperation).toHaveBeenCalledWith(
        'delete',
        expect.any(Number),
      );
    });
  });

  describe('invalidateKey', () => {
    it('should call delete method', async () => {
      mockRedisInstance.del.mockResolvedValue(1);

      const result = await service.invalidateKey('test-key');

      expect(result).toBe(true);
      expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key');
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate keys matching pattern', async () => {
      // eslint-disable-next-line @typescript-eslint/require-await
      const mockStream = (async function* () {
        yield ['key1', 'key2'];
        yield ['key3'];
      })();

      mockRedisInstance.scanStream.mockReturnValue(mockStream as any);

      const mockPipeline = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 1],
          [null, 1],
        ]),
      };
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline as any);

      const result = await service.invalidatePattern('cache:test:*');

      expect(result).toBe(3);
      expect(mockRedisInstance.scanStream).toHaveBeenCalledWith({
        match: 'cache:test:*',
        count: 100,
      });
      expect(mockPipeline.del).toHaveBeenCalledTimes(3);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cache pattern invalidation successful',
        {
          pattern: 'cache:test:*',
          keysDeleted: 3,
        },
      );
      expect(mockMetricsRegistry.recordCacheEviction).toHaveBeenCalledWith(3);
      expect(mockMetricsRegistry.recordCacheOperation).toHaveBeenCalledWith(
        'invalidatePattern',
        expect.any(Number),
      );
    });

    it('should return 0 if no keys match pattern', async () => {
      const mockStream = (async function* () {})();

      mockRedisInstance.scanStream.mockReturnValue(mockStream as any);

      const result = await service.invalidatePattern('cache:nonexistent:*');

      expect(result).toBe(0);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cache pattern invalidation - no keys matched',
        {
          pattern: 'cache:nonexistent:*',
        },
      );
      expect(mockMetricsRegistry.recordCacheEviction).not.toHaveBeenCalled();
    });

    it('should return 0 and log warning on Redis error', async () => {
      mockRedisInstance.scanStream.mockImplementation(() => {
        throw new Error('Redis error');
      });

      const result = await service.invalidatePattern('cache:test:*');

      expect(result).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cache pattern invalidation failed',
        expect.objectContaining({
          pattern: 'cache:test:*',
          error: 'Redis error',
        }),
      );
      expect(mockMetricsRegistry.recordCacheOperation).toHaveBeenCalledWith(
        'invalidatePattern',
        expect.any(Number),
      );
    });
  });

  describe('isHealthy', () => {
    it('should return true if Redis responds to ping', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');

      const result = await service.isHealthy();

      expect(result).toBe(true);
      expect(mockRedisInstance.ping).toHaveBeenCalled();
    });

    it('should return false if Redis ping fails', async () => {
      mockRedisInstance.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await service.isHealthy();

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Redis health check failed',
        expect.objectContaining({
          error: expect.anything(),
        }),
      );
    });
  });
});
