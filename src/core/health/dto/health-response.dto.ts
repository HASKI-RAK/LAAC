// Implements REQ-NF-002: Health/Readiness Endpoints
// Response DTOs for health check endpoints

import { ApiProperty } from '@nestjs/swagger';

/**
 * Health check response DTO
 * Provides structured response for health endpoints
 */
export class HealthResponseDto {
  @ApiProperty({
    description: 'Overall health status',
    example: 'ok',
    enum: ['ok', 'error'],
  })
  status!: string;

  @ApiProperty({
    description: 'Information about checked services',
    example: {
      app: { status: 'up' },
      redis: { status: 'up' },
      lrs: { status: 'up' },
    },
  })
  info?: Record<string, any>;

  @ApiProperty({
    description: 'Error details if health check fails',
    required: false,
  })
  error?: Record<string, any>;

  @ApiProperty({
    description: 'Detailed information about all checks',
    required: false,
  })
  details?: Record<string, any>;

  @ApiProperty({
    description: 'ISO 8601 timestamp of the health check',
    example: '2025-10-21T12:14:07.537Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Application version',
    example: '0.0.1',
  })
  version!: string;
}
