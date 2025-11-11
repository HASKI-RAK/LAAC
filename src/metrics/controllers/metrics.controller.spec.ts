// REQ-FN-003: Unit tests for MetricsController
// Tests REST endpoints for metrics catalog and discovery

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from '../services/metrics.service';
import { MetricsCatalogResponseDto, MetricDetailResponseDto } from '../dto';
import { DashboardLevel } from '../dto/metric-query.dto';

describe('REQ-FN-003: MetricsController', () => {
  let controller: MetricsController;
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: {
            getCatalog: jest.fn(),
            getMetricById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /api/v1/metrics (getCatalog)', () => {
    it('should return empty catalog array from service', () => {
      const expectedResponse: MetricsCatalogResponseDto = {
        items: [],
      };

      const getCatalogSpy = jest
        .spyOn(service, 'getCatalog')
        .mockReturnValue(expectedResponse);

      const result = controller.getCatalog();

      expect(result).toEqual(expectedResponse);
      expect(result.items).toHaveLength(0);
      expect(getCatalogSpy).toHaveBeenCalledTimes(1);
    });

    it('should return catalog with proper structure', () => {
      const expectedResponse: MetricsCatalogResponseDto = {
        items: [],
      };

      jest.spyOn(service, 'getCatalog').mockReturnValue(expectedResponse);

      const result = controller.getCatalog();

      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should call service.getCatalog without parameters', () => {
      const expectedResponse: MetricsCatalogResponseDto = {
        items: [],
      };

      const getCatalogSpy = jest
        .spyOn(service, 'getCatalog')
        .mockReturnValue(expectedResponse);

      controller.getCatalog();

      expect(getCatalogSpy).toHaveBeenCalledWith();
    });
  });

  describe('GET /api/v1/metrics/:id (getMetricById)', () => {
    it('should return metric detail from service', () => {
      const mockMetric: MetricDetailResponseDto = {
        id: 'test-metric',
        dashboardLevel: DashboardLevel.COURSE,
        description: 'Test metric description',
        params: { test: true },
      };

      const getByIdSpy = jest
        .spyOn(service, 'getMetricById')
        .mockReturnValue(mockMetric);

      const result = controller.getMetricById('test-metric');

      expect(result).toEqual(mockMetric);
      expect(getByIdSpy).toHaveBeenCalledWith('test-metric');
    });

    it('should throw NotFoundException for unknown metric ID', () => {
      const getByIdSpy = jest
        .spyOn(service, 'getMetricById')
        .mockImplementation(() => {
          throw new NotFoundException({
            statusCode: 404,
            message: "Metric with id 'unknown-id' not found in catalog",
            error: 'Not Found',
          });
        });

      expect(() => controller.getMetricById('unknown-id')).toThrow(
        NotFoundException,
      );
      expect(getByIdSpy).toHaveBeenCalledWith('unknown-id');
    });

    it('should pass metric ID parameter to service', () => {
      const metricIds = ['metric-1', 'metric-2', 'course-completion'];

      const getByIdSpy = jest
        .spyOn(service, 'getMetricById')
        .mockImplementation((id) => {
          throw new NotFoundException(`Metric ${id} not found`);
        });

      metricIds.forEach((id) => {
        try {
          controller.getMetricById(id);
        } catch {
          // Expected to throw
        }
        expect(getByIdSpy).toHaveBeenCalledWith(id);
      });
    });

    it('should handle metric response without optional params field', () => {
      const mockMetric: MetricDetailResponseDto = {
        id: 'simple-metric',
        dashboardLevel: DashboardLevel.TOPIC,
        description: 'Simple metric without params',
      };

      jest.spyOn(service, 'getMetricById').mockReturnValue(mockMetric);

      const result = controller.getMetricById('simple-metric');

      expect(result).toEqual(mockMetric);
      expect(result.params).toBeUndefined();
    });

    it('should handle all dashboard levels', () => {
      const dashboardLevels = [
        DashboardLevel.COURSE,
        DashboardLevel.TOPIC,
        DashboardLevel.ELEMENT,
      ];

      dashboardLevels.forEach((level, index) => {
        const mockMetric: MetricDetailResponseDto = {
          id: `metric-${index}`,
          dashboardLevel: level,
          description: `Metric for ${level} level`,
        };

        jest.spyOn(service, 'getMetricById').mockReturnValue(mockMetric);

        const result = controller.getMetricById(`metric-${index}`);

        expect(result.dashboardLevel).toBe(level);
      });
    });
  });
});
