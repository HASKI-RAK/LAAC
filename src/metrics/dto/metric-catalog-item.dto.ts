// Implements REQ-FN-003: Metrics Catalog Item DTO
// Defines the structure for a single metric in the catalog

import { ApiProperty } from '@nestjs/swagger';
import { DashboardLevel } from './metric-query.dto';

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

  /**
   * Optional configuration parameters for metric computation
   * @example { "minActivities": 5, "threshold": 0.8 }
   */
  @ApiProperty({
    description: 'Optional configuration parameters for the metric',
    required: false,
    example: { minActivities: 5 },
  })
  params?: Record<string, any>;
}
