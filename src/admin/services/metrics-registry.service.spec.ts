// REQ-FN-021: Unit tests for Metrics Registry Service
// REQ-FN-025: LRS Health Monitoring Metrics
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
  let mockLrsErrorsTotal: jest.Mocked<Counter<string>>;
  let mockHttpRequestsTotal: jest.Mocked<Counter<string>>;
  let mockHttpRequestDuration: jest.Mocked<Histogram<string>>;
  let mockHttpErrorsTotal: jest.Mocked<Counter<string>>;
  let mockHttpActiveRequests: jest.Mocked<Gauge<string>>;
  let mockCircuitBreakerOpensTotal: jest.Mocked<Counter<string>>;
  let mockCircuitBreakerStateTransitionsTotal: jest.Mocked<Counter<string>>;
  let mockCircuitBreakerCurrentState: jest.Mocked<Gauge<string>>;
  let mockCircuitBreakerFailuresTotal: jest.Mocked<Counter<string>>;
  let mockCircuitBreakerSuccessesTotal: jest.Mocked<Counter<string>>;
  let mockLrsHealthStatus: jest.Mocked<Gauge<string>>;
  let mockLrsHealthCheckDuration: jest.Mocked<Histogram<string>>;
  let mockLrsHealthCheckFailuresTotal: jest.Mocked<Counter<string>>;

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

    mockLrsErrorsTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

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

    mockCircuitBreakerOpensTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

    mockCircuitBreakerStateTransitionsTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

    mockCircuitBreakerCurrentState = {
      set: jest.fn(),
    } as unknown as jest.Mocked<Gauge<string>>;

    mockCircuitBreakerFailuresTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

    mockCircuitBreakerSuccessesTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

    const mockGracefulDegradationTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

    mockLrsHealthStatus = {
      set: jest.fn(),
    } as unknown as jest.Mocked<Gauge<string>>;

    mockLrsHealthCheckDuration = {
      observe: jest.fn(),
    } as unknown as jest.Mocked<Histogram<string>>;

    mockLrsHealthCheckFailuresTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

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
              mockLrsErrorsTotal,
              mockHttpRequestsTotal,
              mockHttpRequestDuration,
              mockHttpErrorsTotal,
              mockHttpActiveRequests,
              mockCircuitBreakerOpensTotal,
              mockCircuitBreakerStateTransitionsTotal,
              mockCircuitBreakerCurrentState,
              mockCircuitBreakerFailuresTotal,
              mockCircuitBreakerSuccessesTotal,
              mockGracefulDegradationTotal,
              mockLrsHealthStatus,
              mockLrsHealthCheckDuration,
              mockLrsHealthCheckFailuresTotal,
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

    it('should record LRS error', () => {
      service.recordLrsError('timeout');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLrsErrorsTotal.inc).toHaveBeenCalledWith({
        error_type: 'timeout',
      });
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

  describe('Circuit breaker metrics (REQ-FN-017)', () => {
    it('should record circuit breaker opening', () => {
      service.recordCircuitBreakerOpen('lrs');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCircuitBreakerOpensTotal.inc).toHaveBeenCalledWith({
        service: 'lrs',
      });
    });

    it('should record circuit breaker state transition', () => {
      service.recordCircuitBreakerStateTransition('lrs', 'CLOSED', 'OPEN');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCircuitBreakerStateTransitionsTotal.inc).toHaveBeenCalledWith({
        service: 'lrs',
        from: 'CLOSED',
        to: 'OPEN',
      });
    });

    it('should set circuit breaker current state', () => {
      service.setCircuitBreakerState('lrs', 1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCircuitBreakerCurrentState.set).toHaveBeenCalledWith(
        { service: 'lrs' },
        1,
      );
    });

    it('should record circuit breaker failure', () => {
      service.recordCircuitBreakerFailure('redis');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCircuitBreakerFailuresTotal.inc).toHaveBeenCalledWith({
        service: 'redis',
      });
    });

    it('should record circuit breaker success', () => {
      service.recordCircuitBreakerSuccess('redis');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockCircuitBreakerSuccessesTotal.inc).toHaveBeenCalledWith({
        service: 'redis',
      });
    });
  });

  describe('LRS Health Monitoring Metrics (REQ-FN-025)', () => {
    it('should record LRS health status', () => {
      service.recordLrsHealthStatus('hs-ke', 1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLrsHealthStatus.set).toHaveBeenCalledWith(
        { instance_id: 'hs-ke' },
        1,
      );
    });

    it('should record LRS health check duration', () => {
      service.recordLrsHealthCheckDuration('hs-ke', 0.045);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLrsHealthCheckDuration.observe).toHaveBeenCalledWith(
        { instance_id: 'hs-ke' },
        0.045,
      );
    });

    it('should record LRS health check failure', () => {
      service.recordLrsHealthCheckFailure('hs-rv');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLrsHealthCheckFailuresTotal.inc).toHaveBeenCalledWith({
        instance_id: 'hs-rv',
      });
    });
  });
});
