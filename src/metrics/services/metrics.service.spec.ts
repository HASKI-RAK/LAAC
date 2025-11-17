// REQ-FN-003: Unit tests for MetricsService
// Tests catalog retrieval and metric lookup functionality

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { LoggerService } from '../../core/logger';

describe('REQ-FN-003: MetricsService', () => {
  let service: MetricsService;
  let logger: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    logger = module.get<LoggerService>(LoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCatalog', () => {
    it('should return empty catalog array (skeleton implementation)', () => {
      const result = service.getCatalog();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items).toHaveLength(0);
    });

    it('should log catalog request', () => {
      service.getCatalog();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.log).toHaveBeenCalledWith(
        'Metrics catalog requested',
        expect.objectContaining({
          metricCount: 0,
        }),
      );
    });

    it('should return consistent structure across multiple calls', () => {
      const result1 = service.getCatalog();
      const result2 = service.getCatalog();

      expect(result1).toEqual(result2);
      expect(result1.items).toEqual([]);
      expect(result2.items).toEqual([]);
    });
  });

  describe('getMetricById', () => {
    it('should throw NotFoundException for any metric ID (empty catalog)', () => {
      expect(() => service.getMetricById('unknown-metric')).toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with proper error structure', () => {
      try {
        service.getMetricById('test-metric');
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        const notFoundError = error as NotFoundException;
        expect(notFoundError.getResponse()).toMatchObject({
          statusCode: 404,
          message: "Metric with id 'test-metric' not found in catalog",
          error: 'Not Found',
        });
      }
    });

    it('should log warning when metric not found', () => {
      const metricId = 'sample-metric';

      expect(() => service.getMetricById(metricId)).toThrow(NotFoundException);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(logger.warn).toHaveBeenCalledWith(
        'Metric detail lookup failed',
        expect.objectContaining({
          metricId: 'sample-metric',
        }),
      );
    });

    it('should handle metric IDs with special characters', () => {
      const specialIds = [
        'metric-with-dashes',
        'metric_with_underscores',
        'metric.with.dots',
        'metric123',
      ];

      specialIds.forEach((id) => {
        expect(() => service.getMetricById(id)).toThrow(NotFoundException);
      });
    });
  });
});
