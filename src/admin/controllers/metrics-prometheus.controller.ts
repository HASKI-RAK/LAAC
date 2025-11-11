// Implements REQ-FN-021: Prometheus Metrics Export Endpoint
// Public endpoint for Prometheus/OpenMetrics scraping

import { Controller, Get, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Response } from 'express';
import { register } from 'prom-client';
import { Public } from '../../auth/decorators';

/**
 * Prometheus Metrics Controller
 * Implements REQ-FN-021: Expose metrics endpoint for monitoring tools
 *
 * Endpoint:
 * - GET /metrics: Returns metrics in Prometheus/OpenMetrics text format
 *
 * Note: This endpoint is PUBLIC (no authentication) to allow Prometheus scraping
 * This is distinct from the analytics catalog at /api/v1/metrics (REQ-FN-003)
 */
@ApiTags('Metrics')
@Controller('metrics')
@Public() // REQ-FN-021: Metrics endpoint must be publicly accessible for scraping
export class MetricsPrometheusController {
  /**
   * Get Prometheus metrics
   * Returns all registered metrics in Prometheus text format
   *
   * REQ-FN-021: Expose service metrics (request rate, latency, errors, cache hits, etc.)
   * for scraping by monitoring tools like Prometheus
   */
  @Get()
  @ApiOperation({
    summary: 'Prometheus metrics endpoint',
      'Returns metrics in Prometheus/OpenMetrics format for scraping by monitoring tools. ' +
      'Includes HTTP request metrics, authentication metrics, cache metrics, and LRS query metrics. ' +
      'This endpoint is publicly accessible (no authentication required).',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus text format',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example:
            '# HELP http_requests_total Total HTTP requests\n' +
            '# TYPE http_requests_total counter\n' +
            'http_requests_total{method="GET",status="200",endpoint="/api/v1/metrics"} 42\n',
        },
      },
    },
  })
  async getMetrics(@Res() response: Response): Promise<void> {
    // Set content type to Prometheus text format
    response.set('Content-Type', register.contentType);

    // Get metrics from default registry
    const metrics = await register.metrics();

    // Send metrics as plain text
    response.send(metrics);
  }
}
