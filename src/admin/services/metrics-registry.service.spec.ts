// REQ-FN-021: Unit tests for Metrics Registry Service
import { Test, TestingModule } from '@nestjs/testing';
import { Counter, Histogram, Gauge } from 'prom-client';
import { MetricsRegistryService } from './metrics-registry.service';

describe('REQ-FN-021: MetricsRegistryService', () => {
  let service: MetricsRegistryService;
  let mockCacheHitsTotal: jest.Mocked<Counter<string>>;
  let mockCacheMissesTotal: jest.Mocked<Counter<string>>;
  let mockCacheEvictionsTotal: jest.Mocked<Counter<string>>;
  let mockCacheOperationsDuration: jest.Mocked<Histogram<string>>;
  let mockMetricComputationDuration: jest.Mocked<Histogram<string>>;
  let mockLrsQueryDuration: jest.Mocked<Histogram<string>>;
  let mockHttpRequestsTotal: jest.Mocked<Counter<string>>;
  let mockHttpRequestDuration: jest.Mocked<Histogram<string>>;
  let mockHttpErrorsTotal: jest.Mocked<Counter<string>>;
  let mockHttpActiveRequests: jest.Mocked<Gauge<string>>;

  beforeEach(async () => {
    // Create mock metrics
    mockCacheHitsTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

    mockCacheMissesTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

    mockCacheEvictionsTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

    mockCacheOperationsDuration = {
      observe: jest.fn(),
    } as unknown as jest.Mocked<Histogram<string>>;

    mockMetricComputationDuration = {
      observe: jest.fn(),
    } as unknown as jest.Mocked<Histogram<string>>;

    mockLrsQueryDuration = {
      observe: jest.fn(),
    } as unknown as jest.Mocked<Histogram<string>>;

    mockHttpRequestsTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

    mockHttpRequestDuration = {
      observe: jest.fn(),
    } as unknown as jest.Mocked<Histogram<string>>;

    mockHttpErrorsTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

    mockHttpActiveRequests = {
      inc: jest.fn(),
      dec: jest.fn(),
    } as unknown as jest.Mocked<Gauge<string>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: MetricsRegistryService,
          useFactory: () => {
            return new MetricsRegistryService(
              mockCacheHitsTotal,
              mockCacheMissesTotal,
              mockCacheEvictionsTotal,
              mockCacheOperationsDuration,
              mockMetricComputationDuration,
              mockLrsQueryDuration,
              mockHttpRequestsTotal,
              mockHttpRequestDuration,
              mockHttpErrorsTotal,
              mockHttpActiveRequests,
            );
          },
        },
      ],
    }).compile();

    service = module.get<MetricsRegistryService>(MetricsRegistryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Cache metrics', () => {
    it('should record cache hit', () => {
      service.recordCacheHit('test-metric');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCacheHitsTotal.inc).toHaveBeenCalledWith({
        metricId: 'test-metric',
      });
    });

    it('should record cache miss', () => {
      service.recordCacheMiss('test-metric');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCacheMissesTotal.inc).toHaveBeenCalledWith({
        metricId: 'test-metric',
      });
    });
  });

  describe('Metric computation metrics', () => {
    it('should record metric computation duration', () => {
      service.recordMetricComputation('test-metric', 1.5);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockMetricComputationDuration.observe).toHaveBeenCalledWith(
        { metricId: 'test-metric' },
        1.5,
      );
    });
  });

  describe('LRS query metrics', () => {
    it('should record LRS query duration', () => {
      service.recordLrsQuery(0.5);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLrsQueryDuration.observe).toHaveBeenCalledWith(0.5);
    });
  });

  describe('HTTP metrics', () => {
    it('should record HTTP request', () => {
      service.recordHttpRequest('GET', '/api/v1/metrics', '200');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockHttpRequestsTotal.inc).toHaveBeenCalledWith({
        method: 'GET',
        endpoint: '/api/v1/metrics',
        status: '200',
      });
    });

    it('should record HTTP request duration', () => {
      service.recordHttpDuration('GET', '/api/v1/metrics', 0.123);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockHttpRequestDuration.observe).toHaveBeenCalledWith(
        { method: 'GET', endpoint: '/api/v1/metrics' },
        0.123,
      );
    });

    it('should record HTTP error', () => {
      service.recordHttpError('500');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockHttpErrorsTotal.inc).toHaveBeenCalledWith({ status: '500' });
    });

    it('should increment active requests', () => {
      service.incrementActiveRequests();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockHttpActiveRequests.inc).toHaveBeenCalled();
    });

    it('should decrement active requests', () => {
      service.decrementActiveRequests();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockHttpActiveRequests.dec).toHaveBeenCalled();
    });
  });
});
