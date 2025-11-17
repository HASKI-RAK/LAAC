import { MetricsRegistryService } from './metrics-registry.service';
import { LoggerService } from '../../core/logger';

describe('MetricsRegistryService telemetry shim', () => {
  let service: MetricsRegistryService;
  let mockLogger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    mockLogger = {
      setContext: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;
  });

  afterEach(() => {
    delete process.env.METRICS_DEBUG;
    jest.clearAllMocks();
  });

  it('should not emit logs when METRICS_DEBUG is not enabled', () => {
    service = new MetricsRegistryService(mockLogger);

    expect(() => service.recordCacheHit('test')).not.toThrow();
    expect(() => service.recordHttpRequest('GET', '/api', '200')).not.toThrow();
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it('should log telemetry events when METRICS_DEBUG=true', () => {
    process.env.METRICS_DEBUG = 'true';
    service = new MetricsRegistryService(mockLogger);

    service.recordCacheMiss('test-metric');
    service.recordCircuitBreakerOpen('lrs');

    expect(mockLogger.setContext).toHaveBeenCalledWith(
      'MetricsRegistryService',
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Telemetry event: cache.miss',
      { metricId: 'test-metric' },
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Telemetry event: circuit.open',
      { service: 'lrs' },
    );
  });
});
