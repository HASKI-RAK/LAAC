// Implements REQ-FN-003: Metrics Catalog Response DTO
// Response structure for GET /api/v1/metrics endpoint

import { ApiProperty } from '@nestjs/swagger';
import { MetricCatalogItemDto } from './metric-catalog-item.dto';

/**
 * Metrics Catalog Response DTO
 * Response structure for listing all available metrics
 * Implements REQ-FN-003: Metrics Catalog and Discovery
 */
export class MetricsCatalogResponseDto {
  @ApiProperty({
    description: 'Array of available metrics in the catalog',
    type: [MetricCatalogItemDto],
    example: [],
  })
  items!: MetricCatalogItemDto[];
}
