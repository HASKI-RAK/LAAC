// Implements REQ-FN-021: Custom Prometheus Controller
// Exports Prometheus metrics at root-level /prometheus endpoint (not prefixed)

import { Controller, Get, Res } from '@nestjs/common';
import { register } from 'prom-client';
import { Public } from '../../auth/decorators';

/**
 * Custom Prometheus Controller
 * Provides metrics export at /prometheus (root level, no API prefix)
 * Implements REQ-FN-021: Prometheus metrics export
 *
 * Note: Changed from /metrics to /prometheus to avoid conflict with analytics catalog at /api/v1/metrics
 * Prometheus scrapers can be configured to use any path via scrape_configs
 */
@Controller('prometheus')
@Public() // Public endpoint for Prometheus scraping
export class CustomPrometheusController {
  @Get()
  async index(
    @Res({ passthrough: true })
    response: {
      header: (name: string, value: string) => void;
    },
  ): Promise<string> {
    response.header('Content-Type', register.contentType);
    return register.metrics();
  }
}
