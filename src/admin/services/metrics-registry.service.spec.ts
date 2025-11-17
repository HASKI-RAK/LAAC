import { Test, TestingModule } from '@nestjs/testing';
import { MetricsRegistryService } from './metrics-registry.service';
import { LoggerService } from '../../core/logger';

describe('MetricsRegistryService telemetry shim', () => {
  let service: MetricsRegistryService;
  let mockLogger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    // Set METRICS_DEBUG before creating the service
    process.env.METRICS_DEBUG = 'true';

    // Create mock logger
    mockLogger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsRegistryService,
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<MetricsRegistryService>(MetricsRegistryService);
  });

  afterEach(() => {
    delete process.env.METRICS_DEBUG;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Cache metrics', () => {
    it('should record cache hit', () => {
      service.recordCacheHit('test-metric');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: cache.hit',
        { metricId: 'test-metric' },
      );
    });

    it('should record cache miss', () => {
      service.recordCacheMiss('test-metric');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: cache.miss',
        { metricId: 'test-metric' },
      );
    });
  });

  describe('Metric computation metrics', () => {
    it('should record metric computation duration', () => {
      service.recordMetricComputation('test-metric', 1.5);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: metric.computation',
        { metricId: 'test-metric', durationSeconds: 1.5 },
      );
    });
  });

  describe('LRS query metrics', () => {
    it('should record LRS query duration', () => {
      service.recordLrsQuery(0.5);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: lrs.query',
        { durationSeconds: 0.5 },
      );
    });

    it('should record LRS error', () => {
      service.recordLrsError('timeout');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: lrs.error',
        { errorType: 'timeout' },
      );
    });
  });

  describe('HTTP metrics', () => {
    it('should record HTTP request', () => {
      service.recordHttpRequest('GET', '/api/v1/metrics', '200');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: http.request',
        { method: 'GET', endpoint: '/api/v1/metrics', status: '200' },
      );
    });

    it('should record HTTP request duration', () => {
      service.recordHttpDuration('GET', '/api/v1/metrics', 0.123);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: http.duration',
        { method: 'GET', endpoint: '/api/v1/metrics', durationSeconds: 0.123 },
      );
    });

    it('should record HTTP error', () => {
      service.recordHttpError('500');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: http.error',
        { status: '500' },
      );
    });

    it('should increment active requests', () => {
      service.incrementActiveRequests();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: http.active.inc',
        {},
      );
    });

    it('should decrement active requests', () => {
      service.decrementActiveRequests();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: http.active.dec',
        {},
      );
    });
  });

  describe('Circuit breaker metrics (REQ-FN-017)', () => {
    it('should record circuit breaker opening', () => {
      service.recordCircuitBreakerOpen('lrs');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: circuit.open',
        { service: 'lrs' },
      );
    });

    it('should record circuit breaker state transition', () => {
      service.recordCircuitBreakerStateTransition('lrs', 'CLOSED', 'OPEN');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: circuit.transition',
        { service: 'lrs', from: 'CLOSED', to: 'OPEN' },
      );
    });

    it('should set circuit breaker current state', () => {
      service.setCircuitBreakerState('lrs', 1);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: circuit.state',
        { service: 'lrs', state: 1 },
      );
    });

    it('should record circuit breaker failure', () => {
      service.recordCircuitBreakerFailure('redis');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: circuit.failure',
        { service: 'redis' },
      );
    });

    it('should record circuit breaker success', () => {
      service.recordCircuitBreakerSuccess('redis');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: circuit.success',
        { service: 'redis' },
      );
    });
  });

  describe('LRS Health Monitoring Metrics (REQ-FN-025)', () => {
    it('should record LRS health status', () => {
      service.setLrsHealthStatus('hs-ke', 1);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: lrs.health.status',
        { instanceId: 'hs-ke', status: 1 },
      );
    });

    it('should record LRS health check duration', () => {
      service.recordLrsHealthCheckDuration('hs-ke', 0.045);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: lrs.health.duration',
        { instanceId: 'hs-ke', durationSeconds: 0.045 },
      );
    });

    it('should record LRS health check failure', () => {
      service.recordLrsHealthCheckFailure('hs-rv');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry event: lrs.health.failure',
        { instanceId: 'hs-rv' },
      );
    });
  });
});
