// REQ-FN-002: Unit tests for LRS Client
// Tests xAPI HTTP client with mocked Axios

/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { LRSClient } from './lrs.client';
import { LoggerService } from '../../core/logger/logger.service';
import { MetricsRegistryService } from '../../admin/services/metrics-registry.service';
import {
  xAPIStatement,
  xAPIStatementResult,
} from '../interfaces/lrs.interface';

// Mock Axios config for test responses
const mockAxiosConfig: InternalAxiosRequestConfig = {
  headers: {} as any,
} as InternalAxiosRequestConfig;

describe('REQ-FN-002: LRSClient', () => {
  let client: LRSClient;
  let mockHttpService: jest.Mocked<HttpService>;
  let mockLogger: jest.Mocked<LoggerService>;
  let mockMetricsRegistry: jest.Mocked<MetricsRegistryService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    mockMetricsRegistry = {
      recordLrsQuery: jest.fn(),
      recordLrsError: jest.fn(),
    } as unknown as jest.Mocked<MetricsRegistryService>;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'lrs') {
          return {
            url: 'https://lrs.example.com/xapi',
            apiKey: 'test-api-key',
            timeout: 10000,
          };
        }
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    mockHttpService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<HttpService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LRSClient,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
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

    client = module.get<LRSClient>(LRSClient);
    client.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(client).toBeDefined();
    });

    it('should have instanceId', () => {
      expect(client.instanceId).toBe('default');
    });

    it('should log initialization', () => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        'LRS Client initialized',
        expect.objectContaining({
          context: 'LRSClient',
          instanceId: 'default',
        }),
      );
    });
  });

  describe('queryStatements', () => {
    const mockStatements: xAPIStatement[] = [
      {
        actor: {
          account: {
            homePage: 'https://ke.moodle.haski.app',
            name: '123',
          },
        },
        verb: {
          id: 'http://adlnet.gov/expapi/verbs/completed',
          display: { en: 'completed' },
        },
        object: {
          id: 'https://course.example.com/course/101',
        },
      },
    ];

    it('should query statements successfully', async () => {
      const mockResult: xAPIStatementResult = {
        statements: mockStatements,
      };

      const mockResponse: AxiosResponse<xAPIStatementResult> = {
        data: mockResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: mockAxiosConfig,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await client.queryStatements({
        verb: 'http://adlnet.gov/expapi/verbs/completed',
        limit: 100,
      });

      expect(result).toEqual(mockStatements);
      expect(mockHttpService.get).toHaveBeenCalled();
      expect(mockMetricsRegistry.recordLrsQuery).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'LRS query started',
        expect.any(Object),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'LRS query completed',
        expect.any(Object),
      );
    });

    it('should handle pagination with more link', async () => {
      const page1: xAPIStatementResult = {
        statements: [mockStatements[0]],
        more: '/xapi/statements?cursor=abc123',
      };

      const page2: xAPIStatementResult = {
        statements: [mockStatements[0]],
      };

      const response1: AxiosResponse<xAPIStatementResult> = {
        data: page1,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: mockAxiosConfig,
      };

      const response2: AxiosResponse<xAPIStatementResult> = {
        data: page2,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: mockAxiosConfig,
      };

      mockHttpService.get
        .mockReturnValueOnce(of(response1))
        .mockReturnValueOnce(of(response2));

      const result = await client.queryStatements({ limit: 100 });

      expect(result).toHaveLength(2);
      expect(mockHttpService.get).toHaveBeenCalledTimes(2);
    });

    it('should limit total statements returned', async () => {
      const statements = Array(5).fill(mockStatements[0]);
      const mockResult: xAPIStatementResult = {
        statements,
      };

      const mockResponse: AxiosResponse<xAPIStatementResult> = {
        data: mockResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: mockAxiosConfig,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await client.queryStatements({ limit: 100 }, 3);

      expect(result).toHaveLength(3);
    });

    it('should handle timeout error', async () => {
      const error: Partial<AxiosError> = {
        code: 'ETIMEDOUT',
        message: 'timeout of 10000ms exceeded',
        name: 'AxiosError',
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => error as AxiosError),
      );

      await expect(client.queryStatements({ limit: 100 })).rejects.toThrow(
        'LRS request timeout',
      );

      expect(mockMetricsRegistry.recordLrsError).toHaveBeenCalledWith(
        'timeout',
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle connection error', async () => {
      const error: Partial<AxiosError> = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
        name: 'AxiosError',
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => error as AxiosError),
      );

      await expect(client.queryStatements({ limit: 100 })).rejects.toThrow(
        'LRS connection error',
      );

      expect(mockMetricsRegistry.recordLrsError).toHaveBeenCalledWith(
        'connection',
      );
    });

    it('should handle authentication error', async () => {
      const error: Partial<AxiosError> = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
          headers: {},
          config: mockAxiosConfig,
        },
        message: 'Request failed with status code 401',
        name: 'AxiosError',
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => error as AxiosError),
      );

      await expect(client.queryStatements({ limit: 100 })).rejects.toThrow(
        'LRS authentication failed',
      );

      expect(mockMetricsRegistry.recordLrsError).toHaveBeenCalledWith('auth');
    });

    it('should handle rate limit error', async () => {
      const error: Partial<AxiosError> = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: {},
          headers: {},
          config: mockAxiosConfig,
        },
        message: 'Request failed with status code 429',
        name: 'AxiosError',
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => error as AxiosError),
      );

      await expect(client.queryStatements({ limit: 100 })).rejects.toThrow(
        'LRS rate limit exceeded',
      );

      expect(mockMetricsRegistry.recordLrsError).toHaveBeenCalledWith(
        'rate_limit',
      );
    });

    it('should handle server error', async () => {
      const error: Partial<AxiosError> = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {},
          headers: {},
          config: mockAxiosConfig,
        },
        message: 'Request failed with status code 500',
        name: 'AxiosError',
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => error as AxiosError),
      );

      await expect(client.queryStatements({ limit: 100 })).rejects.toThrow(
        'LRS server error',
      );

      expect(mockMetricsRegistry.recordLrsError).toHaveBeenCalledWith('server');
    });

    it('should retry on transient errors', async () => {
      const error: Partial<AxiosError> = {
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          data: {},
          headers: {},
          config: mockAxiosConfig,
        },
        message: 'Request failed with status code 503',
        name: 'AxiosError',
        isAxiosError: true,
      };

      const mockResult: xAPIStatementResult = {
        statements: mockStatements,
      };

      const mockResponse: AxiosResponse<xAPIStatementResult> = {
        data: mockResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: mockAxiosConfig,
      };

      mockHttpService.get
        .mockReturnValueOnce(throwError(() => error as AxiosError))
        .mockReturnValueOnce(of(mockResponse));

      const result = await client.queryStatements({ limit: 100 });

      expect(result).toEqual(mockStatements);
      expect(mockHttpService.get).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Retrying LRS request',
        expect.any(Object),
      );
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      const error: Partial<AxiosError> = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: {},
          headers: {},
          config: mockAxiosConfig,
        },
        message: 'Request failed with status code 404',
        name: 'AxiosError',
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => error as AxiosError),
      );

      await expect(client.queryStatements({ limit: 100 })).rejects.toThrow();

      expect(mockHttpService.get).toHaveBeenCalledTimes(1); // No retries
    });

    it('should include required xAPI headers', async () => {
      const mockResult: xAPIStatementResult = {
        statements: mockStatements,
      };

      const mockResponse: AxiosResponse<xAPIStatementResult> = {
        data: mockResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: mockAxiosConfig,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      await client.queryStatements({ limit: 100 });

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Experience-API-Version': '1.0.3',
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: expect.stringContaining('Basic'),
            'X-Correlation-ID': expect.any(String),
          }),
        }),
      );
    });
  });

  describe('aggregate', () => {
    it('should return count of statements', async () => {
      const mockResult: xAPIStatementResult = {
        statements: [],
      };

      const mockResponse: AxiosResponse<xAPIStatementResult> = {
        data: mockResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: mockAxiosConfig,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const count = await client.aggregate({ limit: 0 });

      expect(count).toBe(0);
      expect(mockMetricsRegistry.recordLrsQuery).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const error: Partial<AxiosError> = {
        code: 'ETIMEDOUT',
        message: 'timeout of 10000ms exceeded',
        name: 'AxiosError',
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => error as AxiosError),
      );

      await expect(client.aggregate({ limit: 0 })).rejects.toThrow(
        'LRS request timeout',
      );

      expect(mockMetricsRegistry.recordLrsError).toHaveBeenCalled();
    });
  });

  describe('getInstanceHealth', () => {
    it('should return healthy status', async () => {
      const mockAboutResponse: AxiosResponse<{ version?: string }> = {
        data: { version: '1.0.3' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: mockAxiosConfig,
      };

      mockHttpService.get.mockReturnValue(of(mockAboutResponse));

      const health = await client.getInstanceHealth();

      expect(health.healthy).toBe(true);
      expect(health.version).toBe('1.0.3');
      expect(health.instanceId).toBe('default');
      expect(health.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy on connection error', async () => {
      const error: Partial<AxiosError> = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
        name: 'AxiosError',
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => error as AxiosError),
      );

      const health = await client.getInstanceHealth();

      expect(health.healthy).toBe(false);
      expect(health.error).toContain('ECONNREFUSED');
    });

    it('should return healthy on auth error (401)', async () => {
      const error: Partial<AxiosError> = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
          headers: {},
          config: mockAxiosConfig,
        },
        message: 'Request failed with status code 401',
        name: 'AxiosError',
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => error as AxiosError),
      );

      const health = await client.getInstanceHealth();

      // 401 considered reachable (auth issue, not unavailability)
      expect(health.healthy).toBe(true);
    });

    it('should return healthy on auth error (403)', async () => {
      const error: Partial<AxiosError> = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {},
          headers: {},
          config: mockAxiosConfig,
        },
        message: 'Request failed with status code 403',
        name: 'AxiosError',
        isAxiosError: true,
      };

      mockHttpService.get.mockReturnValue(
        throwError(() => error as AxiosError),
      );

      const health = await client.getInstanceHealth();

      // 403 considered reachable (auth issue, not unavailability)
      expect(health.healthy).toBe(true);
    });
  });
});
