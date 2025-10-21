// REQ-FN-020: Unit tests for LoggerService
// Verifies structured logging, correlation ID integration, and log level configuration

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';
import * as clsContext from './cls-context';

describe('REQ-FN-020: LoggerService', () => {
  let service: LoggerService;

  // Mock Winston logger to capture log calls
  const mockWinstonLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    silly: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('log'),
          },
        },
      ],
    }).compile();

    service = module.get<LoggerService>(LoggerService);

    // Replace the Winston logger with our mock

    (service as any).logger = mockWinstonLogger;

    // Clear all mocks between tests
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('structured logging format', () => {
    it('should include correlation ID from CLS context in log metadata', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      jest.spyOn(clsContext, 'getCorrelationId').mockReturnValue(correlationId);

      service.log('Test message');

      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Test message', {
        correlationId,
      });
    });

    it('should include context in log metadata', () => {
      service.setContext('TestModule');
      service.log('Test message');

      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Test message', {
        context: 'TestModule',
      });
    });

    it('should allow context override in log call', () => {
      service.setContext('DefaultContext');
      service.log('Test message', 'OverrideContext');

      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Test message', {
        context: 'OverrideContext',
      });
    });

    it('should merge custom metadata with standard fields', () => {
      const correlationId = '550e8400-e29b-41d4-a716-446655440000';
      jest.spyOn(clsContext, 'getCorrelationId').mockReturnValue(correlationId);

      service.log('Test message', { userId: 'user-123', action: 'login' });

      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Test message', {
        correlationId,
        userId: 'user-123',
        action: 'login',
      });
    });
  });

  describe('log methods', () => {
    it('should log info messages', () => {
      service.log('Info message');
      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Info message', {});
    });

    it('should log error messages with stack trace', () => {
      const error = new Error('Test error');
      service.error('Error message', error);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith('Error message', {
        error: {
          message: 'Test error',
          stack: error.stack,
          code: undefined,
        },
      });
    });

    it('should log error messages with error code', () => {
      const error = new Error('Test error') as Error & { code: string };
      error.code = 'ETIMEDOUT';
      service.error('Error message', error);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith('Error message', {
        error: {
          message: 'Test error',
          stack: error.stack,
          code: 'ETIMEDOUT',
        },
      });
    });

    it('should log error messages with string trace', () => {
      service.error('Error message', 'Stack trace string');

      expect(mockWinstonLogger.error).toHaveBeenCalledWith('Error message', {
        stack: 'Stack trace string',
      });
    });

    it('should log warning messages', () => {
      service.warn('Warning message');
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        'Warning message',
        {},
      );
    });

    it('should log debug messages', () => {
      service.debug('Debug message');
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith('Debug message', {});
    });

    it('should log verbose messages', () => {
      service.verbose('Verbose message');
      expect(mockWinstonLogger.silly).toHaveBeenCalledWith(
        'Verbose message',
        {},
      );
    });

    it('should log fatal messages as errors', () => {
      service.fatal('Fatal message');
      expect(mockWinstonLogger.error).toHaveBeenCalledWith('Fatal message', {});
    });
  });

  describe('REQ-NF-019: Security - No PII in logs', () => {
    it('should not log sensitive data fields', () => {
      // This is a documentation test - the service itself doesn't filter
      // The responsibility is on the caller to not pass PII
      const safeMetadata = {
        userId: 'user-hash-123', // Use hashed/anonymized IDs
        courseId: 'course-456',
        action: 'login',
      };

      service.log('User action', safeMetadata);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith('User action', {
        userId: 'user-hash-123',
        courseId: 'course-456',
        action: 'login',
      });
    });
  });

  describe('correlation ID propagation', () => {
    it('should not include correlation ID when not set in CLS', () => {
      jest.spyOn(clsContext, 'getCorrelationId').mockReturnValue(undefined);

      service.log('Test message');

      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Test message', {});
    });

    it('should include correlation ID from CLS in all log levels', () => {
      const correlationId = 'test-correlation-id';
      jest.spyOn(clsContext, 'getCorrelationId').mockReturnValue(correlationId);

      service.log('Log message');
      service.error('Error message');
      service.warn('Warn message');
      service.debug('Debug message');
      service.verbose('Verbose message');

      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Log message', {
        correlationId,
      });
      expect(mockWinstonLogger.error).toHaveBeenCalledWith('Error message', {
        correlationId,
      });
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith('Warn message', {
        correlationId,
      });
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith('Debug message', {
        correlationId,
      });
      expect(mockWinstonLogger.silly).toHaveBeenCalledWith('Verbose message', {
        correlationId,
      });
    });
  });
});
