// REQ-NF-002: Health/Readiness Endpoints - LRS Health Indicator Tests
// Unit tests for LRS (Learning Record Store) connectivity health checks

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { HealthCheckError } from '@nestjs/terminus';
import { of, throwError } from 'rxjs';
import { LrsHealthIndicator } from './lrs.health';
import { Configuration } from '../../config';
import { AxiosResponse } from 'axios';

describe('REQ-NF-002: LrsHealthIndicator', () => {
  let indicator: LrsHealthIndicator;
  let httpService: HttpService;

  const mockLrsConfig = {
    url: 'https://lrs.example.com/xapi',
    apiKey: 'test-api-key',
    timeout: 10000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LrsHealthIndicator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: keyof Configuration) => {
              if (key === 'lrs') {
                return mockLrsConfig;
              }
              return undefined;
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    indicator = module.get<LrsHealthIndicator>(LrsHealthIndicator);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy', () => {
    it('should return healthy status when LRS responds with 200', async () => {
      const mockResponse = {
        status: 200,
        data: {},
      } as AxiosResponse;

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await indicator.isHealthy('lrs');

      expect(result).toEqual({
        lrs: {
          status: 'up',
          message: 'LRS is reachable',
          statusCode: 200,
        },
      });
    });

    it('should consider 401 as healthy (auth expected)', async () => {
      const error = {
        response: { status: 401 },
      };

      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => error));

      const result = await indicator.isHealthy('lrs');

      expect(result).toEqual({
        lrs: {
          status: 'up',
          message: 'LRS is reachable (auth expected)',
          statusCode: 401,
        },
      });
    });

    it('should consider 403 as healthy (auth expected)', async () => {
      const error = {
        response: { status: 403 },
      };

      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => error));

      const result = await indicator.isHealthy('lrs');

      expect(result).toEqual({
        lrs: {
          status: 'up',
          message: 'LRS is reachable (auth expected)',
          statusCode: 403,
        },
      });
    });

    it('should throw HealthCheckError when LRS is unreachable', async () => {
      const error = new Error('Connection refused');

      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => error));

      await expect(indicator.isHealthy('lrs')).rejects.toThrow(
        HealthCheckError,
      );
    });

    it('should throw HealthCheckError on 500 error', async () => {
      const error = {
        response: { status: 500 },
      };

      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => error));

      await expect(indicator.isHealthy('lrs')).rejects.toThrow(
        HealthCheckError,
      );
    });

    it('should use timeout from config (capped at 5 seconds)', async () => {
      const mockResponse = {
        status: 200,
        data: {},
      } as AxiosResponse;

      const getSpy = jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockResponse));

      await indicator.isHealthy('lrs');

      expect(getSpy).toHaveBeenCalledWith(
        mockLrsConfig.url,
        expect.objectContaining({
          timeout: 5000, // Should be capped at 5000
        }),
      );
    });

    it('should include Authorization header', async () => {
      const mockResponse = {
        status: 200,
        data: {},
      } as AxiosResponse;

      const getSpy = jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of(mockResponse));

      await indicator.isHealthy('lrs');

      expect(getSpy).toHaveBeenCalledWith(
        mockLrsConfig.url,
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockLrsConfig.apiKey}`,
          },
        }),
      );
    });

    it('should handle timeout errors', async () => {
      const error = new Error('Timeout');
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => error));

      await expect(indicator.isHealthy('lrs')).rejects.toThrow(
        HealthCheckError,
      );
    });
  });

  describe('configuration', () => {
    it('should throw error if LRS configuration is missing', async () => {
      const module = Test.createTestingModule({
        providers: [
          LrsHealthIndicator,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => undefined),
            },
          },
          {
            provide: HttpService,
            useValue: {
              get: jest.fn(),
            },
          },
        ],
      });

      await expect(module.compile()).rejects.toThrow(
        'LRS configuration is missing',
      );
    });
  });
});
