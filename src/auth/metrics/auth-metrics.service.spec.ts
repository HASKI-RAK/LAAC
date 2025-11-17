import { AuthMetricsService } from './auth-metrics.service';
import { LoggerService } from '../../core/logger';

describe('AuthMetricsService telemetry shim', () => {
  let service: AuthMetricsService;
  let mockLogger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    mockLogger = {
      setContext: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;
    delete process.env.METRICS_DEBUG;
  });

  it('does nothing when METRICS_DEBUG is disabled', () => {
    service = new AuthMetricsService(mockLogger);

    service.incrementAuthFailures('invalid-token', '/api/v1/metrics');
    service.incrementRateLimitRejections('/api/v1/metrics');

    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it('logs telemetry when METRICS_DEBUG=true', () => {
    process.env.METRICS_DEBUG = 'true';
    service = new AuthMetricsService(mockLogger);

    service.incrementAuthFailures('invalid-token', '/api/v1/metrics');
    service.incrementRateLimitRejections('/api/v1/metrics');

    expect(mockLogger.setContext).toHaveBeenCalledWith('AuthMetricsService');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Telemetry event: auth.failure',
      {
        reason: 'invalid-token',
        path: '/api/v1/metrics',
      },
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Telemetry event: rate.limit',
      {
        path: '/api/v1/metrics',
      },
    );
  });
});
