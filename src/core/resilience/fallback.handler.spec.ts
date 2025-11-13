// REQ-NF-003: Unit tests for FallbackHandler
// Tests graceful degradation strategies: cache fallback and default values

/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FallbackHandler } from './fallback.handler';
import { CacheService } from '../../data-access/services/cache.service';
import { LoggerService } from '../logger';
import { MetricsRegistryService } from '../../admin/services/metrics-registry.service';

describe('REQ-NF-003: FallbackHandler', () => {
  let fallbackHandler: FallbackHandler;
  let cacheService: jest.Mocked<CacheService>;
  let logger: jest.Mocked<LoggerService>;
  let metricsRegistry: jest.Mocked<MetricsRegistryService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Create mocks
    const mockCacheService = {
      getIgnoringExpiry: jest.fn(),
    };

    const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    };

    const mockMetricsRegistry = {
      recordGracefulDegradation: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FallbackHandler,
        { provide: CacheService, useValue: mockCacheService },
        { provide: LoggerService, useValue: mockLogger },
        { provide: MetricsRegistryService, useValue: mockMetricsRegistry },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    fallbackHandler = module.get<FallbackHandler>(FallbackHandler);
    cacheService = module.get(CacheService);
    logger = module.get(LoggerService);
    metricsRegistry = module.get(MetricsRegistryService);
    configService = module.get(ConfigService);

    // Default config: graceful degradation enabled
    configService.get.mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should be defined', () => {
      expect(fallbackHandler).toBeDefined();
    });

    it('should check if graceful degradation is enabled', () => {
      configService.get.mockReturnValue(true);
      expect(fallbackHandler.isEnabled()).toBe(true);

      configService.get.mockReturnValue(false);
      expect(fallbackHandler.isEnabled()).toBe(false);
    });

    it('should check if cache fallback is enabled', () => {
      configService.get.mockReturnValue(true);
      expect(fallbackHandler.isCacheFallbackEnabled()).toBe(true);

      configService.get.mockReturnValue(false);
      expect(fallbackHandler.isCacheFallbackEnabled()).toBe(false);
    });

    it('should default to enabled if config not set', () => {
      configService.get.mockReturnValue(undefined);
      expect(fallbackHandler.isEnabled()).toBe(true);
      expect(fallbackHandler.isCacheFallbackEnabled()).toBe(true);
    });
  });

  describe('Strategy 1: Cache Fallback (Stale Data)', () => {
    it('should return stale cached data when available', async () => {
      const staleCachedResult = {
        value: 85.5,
        timestamp: '2025-11-12T10:00:00Z',
      };

      cacheService.getIgnoringExpiry.mockResolvedValue(staleCachedResult);

      const result = await fallbackHandler.executeFallback({
        metricId: 'course-completion',
        cacheKey: 'cache:course-completion:hs-ke:course:123:v1',
        enableCacheFallback: true,
      });

      expect(result.status).toBe('degraded');
      expect(result.value).toBe(85.5);
      expect(result.fromCache).toBe(true);
      expect(result.warning).toContain('stale');
      expect(result.cachedAt).toBeDefined();
      expect(result.age).toBeGreaterThanOrEqual(0);
      expect(result.dataAvailable).toBe(true);

      expect(metricsRegistry.recordGracefulDegradation).toHaveBeenCalledWith(
        'course-completion',
        'cache_fallback',
      );
    });

    it('should handle cached data without explicit timestamp', async () => {
      const staleCachedResult = {
        value: 42,
      };

      cacheService.getIgnoringExpiry.mockResolvedValue(staleCachedResult);

      const result = await fallbackHandler.executeFallback({
        metricId: 'engagement-score',
        cacheKey: 'cache:engagement-score:hs-ke:topic:456:v1',
        enableCacheFallback: true,
      });

      expect(result.status).toBe('degraded');
      expect(result.value).toBe(42);
      expect(result.fromCache).toBe(true);
      expect(result.dataAvailable).toBe(true);
    });

    it('should calculate age of stale cached data', async () => {
      const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
      const staleCachedResult = {
        value: 100,
        timestamp: oneHourAgo,
      };

      cacheService.getIgnoringExpiry.mockResolvedValue(staleCachedResult);

      const result = await fallbackHandler.executeFallback({
        metricId: 'completion-rate',
        cacheKey: 'cache:completion-rate:hs-ke:course:789:v1',
        enableCacheFallback: true,
      });

      expect(result.age).toBeGreaterThanOrEqual(3600);
      expect(result.age).toBeLessThan(3700); // Allow some tolerance
    });

    it('should skip cache fallback if disabled', async () => {
      cacheService.getIgnoringExpiry.mockResolvedValue({
        value: 50,
      });

      const result = await fallbackHandler.executeFallback({
        metricId: 'test-metric',
        cacheKey: 'cache:test-metric:key',
        enableCacheFallback: false,
      });

      expect(cacheService.getIgnoringExpiry).not.toHaveBeenCalled();
      expect(result.status).toBe('unavailable');
      expect(result.value).toBeNull();
    });

    it('should handle cache retrieval errors gracefully', async () => {
      cacheService.getIgnoringExpiry.mockRejectedValue(
        new Error('Redis connection failed'),
      );

      const result = await fallbackHandler.executeFallback({
        metricId: 'error-metric',
        cacheKey: 'cache:error-metric:key',
        enableCacheFallback: true,
      });

      // Should fall back to default value strategy
      expect(result.status).toBe('unavailable');
      expect(result.value).toBeNull();
      expect(metricsRegistry.recordGracefulDegradation).toHaveBeenCalledWith(
        'error-metric',
        'default_value',
      );
    });
  });

  describe('Strategy 2: Default/Null Values', () => {
    it('should return null when no cache and LRS unavailable', async () => {
      cacheService.getIgnoringExpiry.mockResolvedValue(null);

      const result = await fallbackHandler.executeFallback({
        metricId: 'unavailable-metric',
        cacheKey: 'cache:unavailable-metric:key',
        enableCacheFallback: true,
      });

      expect(result.status).toBe('unavailable');
      expect(result.value).toBeNull();
      expect(result.error).toContain('unavailable');
      expect(result.cause).toBe('LRS_UNAVAILABLE');
      expect(result.dataAvailable).toBe(false);

      expect(metricsRegistry.recordGracefulDegradation).toHaveBeenCalledWith(
        'unavailable-metric',
        'default_value',
      );
    });

    it('should support custom default values', async () => {
      cacheService.getIgnoringExpiry.mockResolvedValue(null);

      const result = await fallbackHandler.executeFallback({
        metricId: 'custom-default-metric',
        cacheKey: 'cache:custom-default-metric:key',
        enableCacheFallback: true,
        defaultValue: 0,
      });

      expect(result.status).toBe('unavailable');
      expect(result.value).toBe(0);
      expect(result.dataAvailable).toBe(false);
    });

    it('should provide user-friendly error message', async () => {
      cacheService.getIgnoringExpiry.mockResolvedValue(null);

      const result = await fallbackHandler.executeFallback({
        metricId: 'user-friendly-metric',
        cacheKey: 'cache:user-friendly-metric:key',
      });

      expect(result.error).toBe(
        'Data currently unavailable; please try again later',
      );
      expect(result.cause).toBe('LRS_UNAVAILABLE');
    });
  });

  describe('Logging and Observability', () => {
    it('should log fallback execution', async () => {
      cacheService.getIgnoringExpiry.mockResolvedValue(null);

      await fallbackHandler.executeFallback({
        metricId: 'log-test-metric',
        cacheKey: 'cache:log-test-metric:key',
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Executing fallback strategy',
        expect.objectContaining({
          metricId: 'log-test-metric',
          cacheKey: 'cache:log-test-metric:key',
        }),
      );

      expect(logger.log).toHaveBeenCalledWith(
        'No cache available, returning default value',
        expect.any(Object),
      );
    });

    it('should log stale cache found', async () => {
      cacheService.getIgnoringExpiry.mockResolvedValue({
        value: 99,
        timestamp: new Date().toISOString(),
      });

      await fallbackHandler.executeFallback({
        metricId: 'cache-log-test',
        cacheKey: 'cache:cache-log-test:key',
      });

      expect(logger.log).toHaveBeenCalledWith(
        'Stale cache found',
        expect.any(Object),
      );

      expect(logger.log).toHaveBeenCalledWith(
        'Returning stale cached result',
        expect.any(Object),
      );
    });

    it('should record metrics for cache fallback', async () => {
      cacheService.getIgnoringExpiry.mockResolvedValue({ value: 42 });

      await fallbackHandler.executeFallback({
        metricId: 'metrics-test',
        cacheKey: 'cache:metrics-test:key',
      });

      expect(metricsRegistry.recordGracefulDegradation).toHaveBeenCalledWith(
        'metrics-test',
        'cache_fallback',
      );
    });

    it('should record metrics for default value fallback', async () => {
      cacheService.getIgnoringExpiry.mockResolvedValue(null);

      await fallbackHandler.executeFallback({
        metricId: 'default-metrics-test',
        cacheKey: 'cache:default-metrics-test:key',
      });

      expect(metricsRegistry.recordGracefulDegradation).toHaveBeenCalledWith(
        'default-metrics-test',
        'default_value',
      );
    });
  });
});
