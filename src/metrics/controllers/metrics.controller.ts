// Implements REQ-FN-003: Metrics Catalog Controller
// Implements REQ-FN-005: Metrics Results Controller
// REST endpoints for metrics catalog, discovery, and computation

import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ServiceUnavailableException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RequireScopes } from '../../auth/decorators';
import { MetricsService } from '../services/metrics.service';
import { ComputationService } from '../services/computation.service';
import {
  MetricsCatalogResponseDto,
  MetricDetailResponseDto,
  MetricResultsQueryDto,
  MetricResultResponseDto,
} from '../dto';
import { MetricParams } from '../../computation/interfaces/metric-params.interface';

/**
 * Metrics Controller
 * Provides REST endpoints for metrics catalog, discovery, and computation
 * Implements REQ-FN-003: Metrics Catalog and Discovery
 * Implements REQ-FN-005: Metrics Results Retrieval and Computation
 * Implements REQ-FN-023: Scope-based authorization (analytics:read)
 */
@ApiTags('Metrics')
@ApiBearerAuth('JWT-auth')
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly computationService: ComputationService,
  ) {}

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
  @ApiParam({
    name: 'id',
    description: 'Unique metric identifier',
    example: 'course-completion',
  })
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

  /**
   * Compute and retrieve metric results
   * Implements cache-aside pattern: check cache → compute if miss → store → return
   *
   * Implements REQ-FN-005: GET /api/v1/metrics/:id/results endpoint
   *
   * @param id - Metric identifier
   * @param query - Query parameters (courseId, topicId, since, until, etc.)
   * @returns Computed metric result with value, timestamp, and metadata
   */
  @Get(':id/results')
  @RequireScopes('analytics:read')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    description: 'Unique metric identifier',
    example: 'course-completion',
  })
  @ApiOperation({
    summary: 'Compute and retrieve metric results',
    description:
      'Computes a metric using the cache-aside pattern: checks cache first, ' +
      'computes if cache miss, stores result, and returns. ' +
      'Query parameters vary by metric (courseId, topicId, since, until). ' +
      'Returns 404 if metric not found, 400 if parameters invalid, ' +
      '503 if LRS unavailable, 500 if computation fails. ' +
      'Requires analytics:read scope. ' +
      'Implements REQ-FN-005: Metric Results Retrieval and Computation',
  })
  @ApiResponse({
    status: 200,
    description: 'Metric computed successfully',
    type: MetricResultResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid parameters',
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
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - Computation failed',
  })
  @ApiResponse({
    status: 503,
    description: 'Service Unavailable - LRS unavailable',
  })
  async getMetricResults(
    @Param('id') id: string,
    @Query() query: MetricResultsQueryDto,
  ): Promise<MetricResultResponseDto> {
    try {
      // Map DTO to MetricParams
      const params: MetricParams = {
        courseId: query.courseId,
        topicId: query.topicId,
        elementId: query.elementId,
        userId: query.userId,
        groupId: query.groupId,
        since: query.since,
        until: query.until,
      };

      // Call computation service
      return await this.computationService.computeMetric(id, params);
    } catch (error) {
      // Re-throw NotFoundException as-is (404)
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Handle other error types
      if (error instanceof Error) {
        const { message } = error;

        // Parameter validation errors → 400 Bad Request
        if (
          message.includes('required') ||
          message.includes('invalid') ||
          message.includes('must be')
        ) {
          throw new BadRequestException(message);
        }

        // LRS connection errors → 503 Service Unavailable
        if (
          message.includes('LRS') &&
          (message.includes('unavailable') ||
            message.includes('connection') ||
            message.includes('timeout'))
        ) {
          throw new ServiceUnavailableException(
            'Learning Record Store is currently unavailable',
          );
        }

        // Computation errors → 500 Internal Server Error
        throw new InternalServerErrorException(
          `Failed to compute metric: ${message}`,
        );
      }

      // Unknown error type
      throw error;
    }
  }
}
