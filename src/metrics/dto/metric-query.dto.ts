// REQ-FN-024: Metrics query DTO with validation
// Query parameters for metrics endpoints with input validation

import { IsOptional, IsString, IsISO8601, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Dashboard level for metrics computation
 * Aligns with REQ-FN-001, REQ-FN-003 metric scoping
 */
export enum DashboardLevel {
  COURSE = 'course',
  TOPIC = 'topic',
  ELEMENT = 'element',
}

/**
 * Metric query DTO for GET /metrics/:id/results
 * Defines filters for metric computation with validation
 */
export class MetricQueryDto {
  @ApiProperty({
    required: false,
    description: 'Course ID filter (xAPI context)',
    example: 'course-123',
  })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({
    required: false,
    description: 'Topic ID filter (for topic-level metrics)',
    example: 'topic-456',
  })
  @IsOptional()
  @IsString()
  topicId?: string;

  @ApiProperty({
    required: false,
    description: 'Element ID filter (for element-level metrics)',
    example: 'element-789',
  })
  @IsOptional()
  @IsString()
  elementId?: string;

  @ApiProperty({
    required: false,
    description: 'Start date for time-based filtering (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({ message: 'start must be a valid ISO 8601 date' })
  start?: string;

  @ApiProperty({
    required: false,
    description: 'End date for time-based filtering (ISO 8601)',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601({ message: 'end must be a valid ISO 8601 date' })
  end?: string;

  @ApiProperty({
    required: false,
    description: 'Dashboard level for metrics computation',
    enum: DashboardLevel,
    example: DashboardLevel.COURSE,
  })
  @IsOptional()
  @IsEnum(DashboardLevel)
  level?: DashboardLevel;

  @ApiProperty({
    required: false,
    description: 'User ID filter (for user-specific metrics)',
    example: 'user-001',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
