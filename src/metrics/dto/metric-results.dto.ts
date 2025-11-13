// Implements REQ-FN-005: Metric Results Request and Response DTOs
// Defines the structure for metric computation requests and responses

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsISO8601 } from 'class-validator';

/**
 * Metric Results Query DTO
 * Query parameters for GET /api/v1/metrics/:id/results
 * Implements REQ-FN-005: Metric results endpoint query parameters
 *
 * @remarks
 * - All parameters are optional at DTO level
 * - Specific metrics validate required params via validateParams()
 * - Supports time-based filtering with ISO 8601 timestamps
 * - Enables flexible metric computation across different contexts
 */
export class MetricResultsQueryDto {
  @ApiProperty({
    required: false,
    description: 'Course identifier for course-level metrics',
    example: 'course-123',
  })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiProperty({
    required: false,
    description: 'Topic identifier for topic-level metrics',
    example: 'topic-456',
  })
  @IsOptional()
  @IsString()
  topicId?: string;

  @ApiProperty({
    required: false,
    description: 'Element identifier for element-level metrics',
    example: 'element-789',
  })
  @IsOptional()
  @IsString()
  elementId?: string;

  @ApiProperty({
    required: false,
    description: 'User identifier for user-specific metrics',
    example: 'user-abc',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    required: false,
    description: 'Group identifier for cohort/group metrics',
    example: 'group-xyz',
  })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({
    required: false,
    description: 'Start timestamp for time-bounded metrics (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'since must be a valid ISO 8601 timestamp' })
  since?: string;

  @ApiProperty({
    required: false,
    description: 'End timestamp for time-bounded metrics (ISO 8601)',
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'until must be a valid ISO 8601 timestamp' })
  until?: string;
}

/**
 * Metric Result Response DTO
 * Response structure for GET /api/v1/metrics/:id/results
 * Implements REQ-FN-005: Metric results endpoint response format
 *
 * @remarks
 * - Contains computed value, timestamp, and metadata
 * - Includes computation time for observability
 * - Indicates whether result was served from cache
 * - Metadata provides additional context about the computation
 */
export class MetricResultResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the computed metric',
    example: 'course-completion',
  })
  metricId!: string;

  @ApiProperty({
    description: 'Computed metric value (type depends on metric)',
    example: 85.5,
    oneOf: [
      { type: 'number' },
      { type: 'string' },
      { type: 'boolean' },
      { type: 'object' },
      { type: 'array' },
    ],
  })
  value!: number | string | boolean | Record<string, unknown> | unknown[];

  @ApiProperty({
    description: 'Timestamp when the metric was computed (ISO 8601)',
    example: '2025-11-13T10:30:00Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Time taken to compute the metric in milliseconds',
    example: 42,
  })
  computationTime!: number;

  @ApiProperty({
    description: 'Whether the result was served from cache',
    example: false,
  })
  fromCache!: boolean;

  @ApiProperty({
    required: false,
    description: 'Additional metadata about the computation',
    example: {
      totalLearners: 100,
      completedLearners: 85,
      unit: 'percentage',
      courseId: 'course-123',
    },
  })
  metadata?: Record<string, unknown>;
}
