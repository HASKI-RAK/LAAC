// Implements REQ-FN-003: Metrics Catalog Controller
// REST endpoints for metrics catalog and discovery

import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequireScopes } from '../../auth/decorators';
import { MetricsService } from '../services/metrics.service';
import { MetricsCatalogResponseDto, MetricDetailResponseDto } from '../dto';

/**
 * Metrics Controller
 * Provides REST endpoints for metrics catalog and discovery
 * Implements REQ-FN-003: Metrics Catalog and Discovery
 * Implements REQ-FN-023: Scope-based authorization (analytics:read)
 */
@ApiTags('Metrics')
@ApiBearerAuth('JWT-auth')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Get the complete metrics catalog
   * Returns array of all available analytics metrics
   *
   * Implements REQ-FN-003: GET /api/v1/metrics endpoint
   *
   * @returns Catalog response with array of metric items
   */
  @Get()
  @RequireScopes('analytics:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all metrics in the catalog',
    description:
      'Returns a catalog of all available analytics metrics. ' +
      'Each metric includes id, dashboard level, description, and optional parameters. ' +
      'Requires analytics:read scope. ' +
      'Implements REQ-FN-003: Metrics Catalog and Discovery',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics catalog retrieved successfully',
    type: MetricsCatalogResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Missing required scope: analytics:read',
  })
  getCatalog(): MetricsCatalogResponseDto {
    return this.metricsService.getCatalog();
  }

  /**
   * Get details for a specific metric by ID
   *
   * Implements REQ-FN-003: GET /api/v1/metrics/:id endpoint
   *
   * @param id - Metric identifier
   * @returns Metric detail response
   */
  @Get(':id')
  @RequireScopes('analytics:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get metric details by ID',
    description:
      'Returns detailed information for a specific metric by its identifier. ' +
      'Requires analytics:read scope. ' +
      'Returns 404 if the metric ID is not found in the catalog. ' +
      'Implements REQ-FN-003: Metrics Catalog and Discovery',
  })
  @ApiResponse({
    status: 200,
    description: 'Metric details retrieved successfully',
    type: MetricDetailResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Missing required scope: analytics:read',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Metric ID not found in catalog',
  })
  getMetricById(@Param('id') id: string): MetricDetailResponseDto {
    return this.metricsService.getMetricById(id);
  }
}
