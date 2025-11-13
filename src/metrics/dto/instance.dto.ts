// Implements REQ-FN-017: Instance Metadata DTO
// Response structure for GET /api/v1/instances endpoint

import { ApiProperty } from '@nestjs/swagger';

/**
 * LRS Instance DTO
 * Represents metadata for a single LRS instance
 * Implements REQ-FN-017: Instance Metadata Endpoint
 */
export class LRSInstanceDto {
  /**
   * Unique identifier for the instance
   * @example "hs-ke"
   */
  @ApiProperty({
    description: 'Unique identifier for the instance',
    example: 'hs-ke',
  })
  id!: string;

  /**
   * Human-readable name
   * @example "Hochschule Kempten"
   */
  @ApiProperty({
    description: 'Human-readable name',
    example: 'Hochschule Kempten',
  })
  name!: string;

  /**
   * Health status of the instance
   * @example "healthy"
   */
  @ApiProperty({
    description: 'Health status of the instance',
    example: 'healthy',
    enum: ['healthy', 'degraded', 'unavailable'],
  })
  status!: 'healthy' | 'degraded' | 'unavailable';

  /**
   * Last successful sync timestamp (ISO 8601)
   * @example "2025-11-10T10:30:00Z"
   */
  @ApiProperty({
    description: 'Last successful sync timestamp (ISO 8601)',
    example: '2025-11-10T10:30:00Z',
    required: false,
  })
  lastSync?: string;
}

/**
 * Instances List Response DTO
 * Response structure for listing all configured LRS instances
 * Implements REQ-FN-017: Instance Metadata Endpoint
 */
export class InstancesResponseDto {
  /**
   * Array of configured LRS instances
   */
  @ApiProperty({
    description: 'Array of configured LRS instances',
    type: [LRSInstanceDto],
    example: [
      {
        id: 'hs-ke',
        name: 'Hochschule Kempten',
        status: 'healthy',
        lastSync: '2025-11-10T10:30:00Z',
      },
      {
        id: 'hs-rv',
        name: 'Hochschule Ravensburg-Weingarten',
        status: 'degraded',
        lastSync: '2025-11-10T10:28:15Z',
      },
    ],
  })
  instances!: LRSInstanceDto[];
}
