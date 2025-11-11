// Implements REQ-FN-003: Metric Detail Response DTO
// Response structure for GET /api/v1/metrics/:id endpoint

import { ApiProperty } from '@nestjs/swagger';
import { DashboardLevel } from './metric-query.dto';

/**
 * Metric Detail Response DTO
 * Response structure for getting details of a specific metric
 * Implements REQ-FN-003: Metrics Catalog and Discovery
 */
export class MetricDetailResponseDto {
  @ApiProperty({
    description: 'Stable metric identifier',
    example: 'course-completion-rate',
  })
  id!: string;

  @ApiProperty({
    description: 'Dashboard level for metric computation',
    enum: DashboardLevel,
    example: DashboardLevel.COURSE,
  })
  dashboardLevel!: DashboardLevel;

  @ApiProperty({
    description: 'Human-readable metric description',
    example: 'Percentage of completed activities in a course',
  })
  description!: string;

  @ApiProperty({
    description: 'Optional configuration parameters for the metric',
    required: false,
    example: { minActivities: 5 },
  })
  params?: Record<string, any>;
}
