// Implements REQ-FN-003: Metrics Catalog Item DTO
// Defines the structure for a single metric in the catalog

import { ApiProperty } from '@nestjs/swagger';
import { DashboardLevel } from './metric-query.dto';
import {
  MetricExample,
  MetricOutputType,
} from '../../computation/interfaces/metric.interface';

/**
 * Metric Catalog Item DTO
 * Represents a single analytics metric in the catalog
 * Implements REQ-FN-003: Metrics Catalog and Discovery
 */
export class MetricCatalogItemDto {
  /**
   * Unique stable identifier for the metric
   * @example "course-completion-rate"
   */
  @ApiProperty({
    description: 'Stable metric identifier',
    example: 'course-completion-rate',
  })
  id!: string;

  /**
   * Human readable metric title displayed in catalogs
   */
  @ApiProperty({
    description: 'Display title for the metric',
    example: 'Course Completion Rate',
  })
  title!: string;

  /**
   * Dashboard level indicating where this metric is displayed and computed
   * @example "course"
   */
  @ApiProperty({
    description: 'Dashboard level for metric computation',
    enum: DashboardLevel,
    example: DashboardLevel.COURSE,
  })
  dashboardLevel!: DashboardLevel;

  /**
   * Human-readable description of what the metric measures
   * @example "Percentage of completed activities in a course"
   */
  @ApiProperty({
    description: 'Human-readable metric description',
    example: 'Percentage of completed activities in a course',
  })
  description!: string;

  /** Required query parameters for successful computation */
  @ApiProperty({
    description: 'Required query parameters for the metric request',
    example: ['courseId'],
    type: [String],
  })
  requiredParams!: string[];

  /** Optional query parameters supported by the metric */
  @ApiProperty({
    description: 'Optional query parameters supported by the metric',
    required: false,
    example: ['since', 'until'],
    type: [String],
  })
  optionalParams?: string[];

  /**
   * Declares the shape of the metric result value for clients
   */
  @ApiProperty({
    description: 'Shape of the metric value (scalar, array, object)',
    enum: ['scalar', 'array', 'object'],
    example: 'scalar',
  })
  outputType!: MetricOutputType;

  /** Semantic version of the metric implementation */
  @ApiProperty({
    description: 'Semantic version of the metric implementation',
    required: false,
    example: '1.0.0',
  })
  version?: string;

  /** Example input/output for integrators */
  @ApiProperty({
    description: 'Representative request parameters and response value',
    required: false,
    example: {
      params: { courseId: 'course-123' },
      result: { value: 85.5, metadata: { unit: 'percentage' } },
    },
  })
  example?: MetricExample;
}
