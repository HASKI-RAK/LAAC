// REQ-FN-021: Unit tests for Prometheus Metrics Controller
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { register } from 'prom-client';
import { MetricsPrometheusController } from './metrics-prometheus.controller';

describe('REQ-FN-021: MetricsPrometheusController', () => {
  let controller: MetricsPrometheusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsPrometheusController],
    }).compile();

    controller = module.get<MetricsPrometheusController>(
      MetricsPrometheusController,
    );
  });

  afterEach(() => {
    // Clear all metrics after each test
    register.clear();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const mockResponse = {
        set: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getMetrics(mockResponse);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockResponse.set).toHaveBeenCalledWith(
        'Content-Type',
        register.contentType,
      );

      expect(mockResponse.send).toHaveBeenCalledWith(expect.any(String));
    });

    it('should return string output from metrics registry', async () => {
      const mockResponse = {
        set: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getMetrics(mockResponse);

      const metricsOutput = (mockResponse.send as jest.Mock).mock.calls[0][0];

      // Verify metrics output is a string
      // In unit tests without full app context, registry may be empty
      expect(typeof metricsOutput).toBe('string');
    });

    it('should set correct content type', async () => {
      const mockResponse = {
        set: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.getMetrics(mockResponse);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockResponse.set).toHaveBeenCalledWith(
        'Content-Type',
        expect.stringContaining('text/plain'),
      );
    });
  });
});
