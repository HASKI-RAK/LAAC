// Implements REQ-FN-003: Metric Detail Response DTO
// Response structure for GET /api/v1/metrics/:id endpoint

import { MetricCatalogItemDto } from './metric-catalog-item.dto';

/**
 * Metric Detail Response DTO
 * Response structure for getting details of a specific metric
 * Implements REQ-FN-003: Metrics Catalog and Discovery
 */
export class MetricDetailResponseDto extends MetricCatalogItemDto {}
