// Unit tests for ComputationService
// Implements REQ-FN-005: Metric computation pipeline with cache-aside pattern

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ComputationService } from './computation.service';
import { CacheService } from '../../data-access/services/cache.service';
import { LRSClient } from '../../data-access/clients/lrs.client';
import { LoggerService } from '../../core/logger';
import { MetricsRegistryService } from '../../admin/services/metrics-registry.service';
import { FallbackHandler } from '../../core/resilience';
import { IMetricComputation } from '../../computation/interfaces/metric.interface';
import { MetricParams } from '../../computation/interfaces/metric-params.interface';
import { MetricResult } from '../../computation/interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

describe('REQ-FN-005: ComputationService', () => {
  let service: ComputationService;
  let cacheService: jest.Mocked<CacheService>;
  let lrsClient: jest.Mocked<LRSClient>;
  let logger: jest.Mocked<LoggerService>;
  let metricsRegistry: jest.Mocked<MetricsRegistryService>;
  let moduleRef: jest.Mocked<ModuleRef>;
  let fallbackHandler: jest.Mocked<FallbackHandler>;

  // Mock metric provider
  const mockProvider: IMetricComputation = {
    id: 'test-metric',
    dashboardLevel: 'course',
    description: 'Test metric for unit tests',
    version: '1.0.0',
    compute: jest.fn(),
    validateParams: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComputationService,
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        {
          provide: LRSClient,
          useValue: {
            instanceId: 'default', // REQ-FN-017: Mock instance ID
            queryStatements: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
        {
          provide: MetricsRegistryService,
          useValue: {
            recordCacheHit: jest.fn(),
            recordCacheMiss: jest.fn(),
            recordMetricComputation: jest.fn(),
            recordMetricComputationError: jest.fn(),
            recordCircuitBreakerFailure: jest.fn(),
            recordCircuitBreakerSuccess: jest.fn(),
            recordCircuitBreakerOpen: jest.fn(),
            recordCircuitBreakerStateTransition: jest.fn(),
            setCircuitBreakerState: jest.fn(),
          },
        },
        {
          provide: ModuleRef,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: FallbackHandler,
          useValue: {
            executeFallback: jest.fn(),
            isEnabled: jest.fn().mockReturnValue(true),
            isCacheFallbackEnabled: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              threshold: 5,
              timeout: 30000,
              halfOpenRequests: 1,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ComputationService>(ComputationService);
    cacheService = module.get(CacheService);
    lrsClient = module.get(LRSClient);
    logger = module.get(LoggerService);
    metricsRegistry = module.get(MetricsRegistryService);
    moduleRef = module.get(ModuleRef);
    fallbackHandler = module.get(FallbackHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('computeMetric - Cache Hit', () => {
    it('should return cached result when cache hit', async () => {
      // REQ-FN-006 + REQ-FN-017: Cache-aside pattern - cache hit with instance-aware key
      const params: MetricParams = { courseId: 'course-123' };
      const cachedResult = {
        metricId: 'test-metric',
        value: 85.5,
        timestamp: '2025-11-13T10:00:00Z',
        computationTime: 10,
        fromCache: false,
        metadata: { cached: true },
      };

      cacheService.get.mockResolvedValue(cachedResult);

      const result = await service.computeMetric('test-metric', params);

      // REQ-FN-017: Expected cache key format with instanceId
      expect(cacheService.get).toHaveBeenCalledWith(
        'cache:test-metric:default:course:courseId=course-123:v1',
      );
      expect(result).toEqual({
        ...cachedResult,
        fromCache: true,
        computationTime: expect.any(Number),
      });
      // REQ-FN-005: Record cache hit for metric computation
      expect(metricsRegistry.recordCacheHit).toHaveBeenCalledWith(
        'test-metric',
      );
      expect(lrsClient.queryStatements).not.toHaveBeenCalled();
    });
  });

  describe('computeMetric - Cache Miss', () => {
    it('should compute metric when cache miss', async () => {
      // REQ-FN-006: Cache-aside pattern - cache miss
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [
        {
          id: 'stmt-1',
          actor: { objectType: 'Agent', name: 'Test User' },
          verb: { id: 'http://adlnet.gov/expapi/verbs/completed', display: {} },
          object: { id: 'course-123', objectType: 'Activity' },
          timestamp: '2025-11-13T10:00:00Z',
        },
      ];
      const computedResult: MetricResult = {
        metricId: 'test-metric',
        value: 85.5,
        computed: '2025-11-13T10:30:00Z',
        metadata: { total: 100, completed: 85 },
      };

      cacheService.get.mockResolvedValue(null); // Cache miss
      moduleRef.get.mockReturnValue(mockProvider);
      (mockProvider.compute as jest.Mock).mockResolvedValue(computedResult);
      lrsClient.queryStatements.mockResolvedValue(statements);
      cacheService.set.mockResolvedValue(true);

      const result = await service.computeMetric('test-metric', params);

      expect(cacheService.get).toHaveBeenCalled();
      // REQ-FN-005: Record cache miss for metric computation
      expect(metricsRegistry.recordCacheMiss).toHaveBeenCalledWith(
        'test-metric',
      );
      expect(moduleRef.get).toHaveBeenCalled();
      expect(mockProvider.validateParams).toHaveBeenCalledWith(params);
      expect(lrsClient.queryStatements).toHaveBeenCalledWith({
        activity: 'course-123',
        related_activities: true,
      });
      expect(mockProvider.compute).toHaveBeenCalledWith(params, statements);
      // REQ-FN-017: Expected cache key format with instanceId
      expect(cacheService.set).toHaveBeenCalledWith(
        'cache:test-metric:default:course:courseId=course-123:v1',
        expect.objectContaining({
          metricId: 'test-metric',
          value: 85.5,
          fromCache: false,
          instanceId: 'default', // REQ-FN-017: Instance metadata
        }),
        undefined,
        'results',
      );
      expect(result.fromCache).toBe(false);
      expect(result.value).toBe(85.5);
      expect(result.instanceId).toBe('default'); // REQ-FN-017
    });

    it('should build LRS filters with time range', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        since: '2025-01-01T00:00:00Z',
        until: '2025-12-31T23:59:59Z',
      };
      const statements: xAPIStatement[] = [];
      const computedResult: MetricResult = {
        metricId: 'test-metric',
        value: 0,
        computed: '2025-11-13T10:30:00Z',
      };

      cacheService.get.mockResolvedValue(null);
      moduleRef.get.mockReturnValue(mockProvider);
      (mockProvider.compute as jest.Mock).mockResolvedValue(computedResult);
      lrsClient.queryStatements.mockResolvedValue(statements);
      cacheService.set.mockResolvedValue(true);

      await service.computeMetric('test-metric', params);

      expect(lrsClient.queryStatements).toHaveBeenCalledWith(
        expect.objectContaining({
          since: '2025-01-01T00:00:00Z',
          until: '2025-12-31T23:59:59Z',
          activity: 'course-123',
          related_activities: true,
        }),
      );
    });

    it('should include activity filter for courseId', async () => {
      const params: MetricParams = { courseId: 'course-678' };
      const statements: xAPIStatement[] = [];
      const computedResult: MetricResult = {
        metricId: 'test-metric',
        value: 0,
        computed: '2025-11-13T10:30:00Z',
      };

      cacheService.get.mockResolvedValue(null);
      moduleRef.get.mockReturnValue(mockProvider);
      (mockProvider.compute as jest.Mock).mockResolvedValue(computedResult);
      lrsClient.queryStatements.mockResolvedValue(statements);
      cacheService.set.mockResolvedValue(true);

      await service.computeMetric('test-metric', params);

      expect(lrsClient.queryStatements).toHaveBeenCalledWith(
        expect.objectContaining({
          activity: 'course-678',
          related_activities: true,
        }),
      );
    });

    it('should prefer topicId over courseId for activity filters', async () => {
      const params: MetricParams = {
        courseId: 'course-678',
        topicId: 'topic-555',
      };
      const statements: xAPIStatement[] = [];
      const computedResult: MetricResult = {
        metricId: 'test-metric',
        value: 0,
        computed: '2025-11-13T10:30:00Z',
      };

      cacheService.get.mockResolvedValue(null);
      moduleRef.get.mockReturnValue(mockProvider);
      (mockProvider.compute as jest.Mock).mockResolvedValue(computedResult);
      lrsClient.queryStatements.mockResolvedValue(statements);
      cacheService.set.mockResolvedValue(true);

      await service.computeMetric('test-metric', params);

      expect(lrsClient.queryStatements).toHaveBeenCalledWith(
        expect.objectContaining({
          activity: 'topic-555',
          related_activities: true,
        }),
      );
    });

    it('should prefer elementId when provided', async () => {
      const params: MetricParams = {
        courseId: 'course-678',
        elementId: 'element-222',
      };
      const statements: xAPIStatement[] = [];
      const computedResult: MetricResult = {
        metricId: 'test-metric',
        value: 0,
        computed: '2025-11-13T10:30:00Z',
      };

      cacheService.get.mockResolvedValue(null);
      moduleRef.get.mockReturnValue(mockProvider);
      (mockProvider.compute as jest.Mock).mockResolvedValue(computedResult);
      lrsClient.queryStatements.mockResolvedValue(statements);
      cacheService.set.mockResolvedValue(true);

      await service.computeMetric('test-metric', params);

      expect(lrsClient.queryStatements).toHaveBeenCalledWith(
        expect.objectContaining({
          activity: 'element-222',
          related_activities: false,
        }),
      );
    });
  });

  describe('computeMetric - Error Handling', () => {
    it('should throw NotFoundException when provider not found', async () => {
      const params: MetricParams = { courseId: 'course-123' };

      cacheService.get.mockResolvedValue(null);
      moduleRef.get.mockReturnValue(null); // Provider not found

      await expect(
        service.computeMetric('nonexistent-metric', params),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.computeMetric('nonexistent-metric', params),
      ).rejects.toThrow(
        "Metric with id 'nonexistent-metric' not found in catalog",
      );

      // REQ-FN-005: Record computation error
      expect(metricsRegistry.recordMetricComputationError).toHaveBeenCalled();
    });

    it('should throw error when parameter validation fails', async () => {
      const params: MetricParams = {}; // Missing required courseId
      const validatingProvider = {
        ...mockProvider,
        validateParams: jest.fn().mockImplementation(() => {
          throw new Error('courseId is required');
        }),
      };

      cacheService.get.mockResolvedValue(null);
      moduleRef.get.mockReturnValue(validatingProvider);

      await expect(
        service.computeMetric('test-metric', params),
      ).rejects.toThrow('courseId is required');

      expect(logger.warn).toHaveBeenCalledWith(
        'Parameter validation failed',
        expect.objectContaining({
          metricId: 'test-metric',
          error: 'courseId is required',
        }),
      );
      // REQ-FN-005: Record computation error
      expect(metricsRegistry.recordMetricComputationError).toHaveBeenCalled();
    });

    it('should handle LRS query errors', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const nonValidatingProvider = {
        ...mockProvider,
        validateParams: jest.fn(), // No validation error
      };

      // Configure fallback handler to be disabled
      fallbackHandler.isEnabled.mockReturnValue(false);

      cacheService.get.mockResolvedValue(null);
      moduleRef.get.mockReturnValue(nonValidatingProvider);
      lrsClient.queryStatements.mockRejectedValue(
        new Error('LRS connection failed'),
      );

      await expect(
        service.computeMetric('test-metric', params),
      ).rejects.toThrow('Learning Record Store is currently unavailable');
    });

    it('should handle computation errors', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [];
      const failingProvider = {
        ...mockProvider,
        validateParams: jest.fn(), // No validation error
        compute: jest
          .fn()
          .mockRejectedValue(new Error('Computation failed: division by zero')),
      };

      cacheService.get.mockResolvedValue(null);
      moduleRef.get.mockReturnValue(failingProvider);
      lrsClient.queryStatements.mockResolvedValue(statements);

      await expect(
        service.computeMetric('test-metric', params),
      ).rejects.toThrow('Computation failed: division by zero');

      // REQ-FN-005: Record computation error
      expect(metricsRegistry.recordMetricComputationError).toHaveBeenCalled();
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate cache key with courseId', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const nonValidatingProvider = {
        ...mockProvider,
        validateParams: jest.fn(), // No validation
        compute: jest.fn().mockResolvedValue({
          metricId: 'test-metric',
          value: 0,
          computed: '2025-11-13T10:30:00Z',
        }),
      };

      cacheService.get.mockResolvedValue(null);
      moduleRef.get.mockReturnValue(nonValidatingProvider);
      lrsClient.queryStatements.mockResolvedValue([]);
      cacheService.set.mockResolvedValue(true);

      await service.computeMetric('test-metric', params);

      // REQ-FN-017: Expected cache key format with instanceId
      expect(cacheService.get).toHaveBeenCalledWith(
        'cache:test-metric:default:course:courseId=course-123:v1',
      );
    });

    it('should generate cache key with topicId', async () => {
      const params: MetricParams = { topicId: 'topic-456' };
      const nonValidatingProvider = {
        ...mockProvider,
        validateParams: jest.fn(), // No validation
        compute: jest.fn().mockResolvedValue({
          metricId: 'test-metric',
          value: 0,
          computed: '2025-11-13T10:30:00Z',
        }),
      };

      cacheService.get.mockResolvedValue(null);
      moduleRef.get.mockReturnValue(nonValidatingProvider);
      lrsClient.queryStatements.mockResolvedValue([]);
      cacheService.set.mockResolvedValue(true);

      await service.computeMetric('test-metric', params);

      // REQ-FN-017: Expected cache key format with instanceId
      expect(cacheService.get).toHaveBeenCalledWith(
        'cache:test-metric:default:topic:topicId=topic-456:v1',
      );
    });

    it('should generate cache key with time range', async () => {
      const params: MetricParams = {
        courseId: 'course-123',
        since: '2025-01-01T00:00:00Z',
        until: '2025-12-31T23:59:59Z',
      };
      const nonValidatingProvider = {
        ...mockProvider,
        validateParams: jest.fn(), // No validation
        compute: jest.fn().mockResolvedValue({
          metricId: 'test-metric',
          value: 0,
          computed: '2025-11-13T10:30:00Z',
        }),
      };

      cacheService.get.mockResolvedValue(null);
      moduleRef.get.mockReturnValue(nonValidatingProvider);
      lrsClient.queryStatements.mockResolvedValue([]);
      cacheService.set.mockResolvedValue(true);

      await service.computeMetric('test-metric', params);

      // REQ-FN-017: Expected cache key format with instanceId and URL-encoded timestamps
      expect(cacheService.get).toHaveBeenCalledWith(
        'cache:test-metric:default:course:courseId=course-123,since=2025-01-01T00%3A00%3A00Z,until=2025-12-31T23%3A59%3A59Z:v1',
      );
    });
  });

  describe('Telemetry hooks', () => {
    it('should record metric computation duration', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const statements: xAPIStatement[] = [];
      const computedResult: MetricResult = {
        metricId: 'test-metric',
        value: 85.5,
        computed: '2025-11-13T10:30:00Z',
      };
      const nonValidatingProvider = {
        ...mockProvider,
        validateParams: jest.fn(), // No validation
        compute: jest.fn().mockResolvedValue(computedResult),
      };

      cacheService.get.mockResolvedValue(null);
      moduleRef.get.mockReturnValue(nonValidatingProvider);
      lrsClient.queryStatements.mockResolvedValue(statements);
      cacheService.set.mockResolvedValue(true);

      await service.computeMetric('test-metric', params);

      expect(metricsRegistry.recordMetricComputation).toHaveBeenCalledWith(
        'test-metric',
        expect.any(Number),
      );
    });
  });

  describe('Provider Validation', () => {
    it('should skip validation when provider does not implement validateParams', async () => {
      const params: MetricParams = { courseId: 'course-123' };
      const providerWithoutValidation: IMetricComputation = {
        id: 'no-validation-metric',
        dashboardLevel: 'course',
        description: 'Metric without validation',
        compute: jest.fn().mockResolvedValue({
          metricId: 'no-validation-metric',
          value: 0,
          computed: '2025-11-13T10:30:00Z',
        }),
      };

      cacheService.get.mockResolvedValue(null);
      moduleRef.get.mockReturnValue(providerWithoutValidation);
      lrsClient.queryStatements.mockResolvedValue([]);
      cacheService.set.mockResolvedValue(true);

      await service.computeMetric('no-validation-metric', params);

      expect(providerWithoutValidation.compute).toHaveBeenCalled();
    });
  });
});
