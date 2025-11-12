// Implements REQ-FN-010: Metric Result Interface
// Defines the structure of computed metric results returned to clients

/**
 * Metric Result Interface
 * Contains the computed value and metadata for a metric calculation
 *
 * @remarks
 * - Returned by the `compute()` method of metric providers
 * - Contains the computed value, timestamp, and optional metadata
 * - Supports various value types (number, string, boolean, object, array)
 * - Metadata provides additional context about the computation
 *
 * @example
 * ```typescript
 * const result: MetricResult = {
 *   metricId: 'course-completion',
 *   value: 85.5,
 *   computed: '2024-11-12T17:30:00Z',
 *   metadata: {
 *     totalStudents: 100,
 *     completedStudents: 85,
 *     unit: 'percentage',
 *   },
 * };
 * ```
 */
export interface MetricResult {
  /**
   * Unique identifier of the metric
   * Must match the `id` property of the metric provider
   * @example 'course-completion'
   */
  metricId: string;

  /**
   * Computed metric value
   * Type depends on the metric (number, string, boolean, object, array)
   * @example 85.5 (percentage), 42 (count), true (boolean), { min: 0, max: 100, avg: 75 }
   */
  value: number | string | boolean | Record<string, unknown> | unknown[];

  /**
   * Timestamp when the metric was computed (ISO 8601)
   * Used for cache invalidation and result freshness tracking
   * @example '2024-11-12T17:30:00Z'
   */
  computed: string;

  /**
   * Additional metadata about the computation
   * Provides context, intermediate values, or debugging information
   * @example { totalStudents: 100, completedStudents: 85, unit: 'percentage' }
   */
  metadata?: Record<string, unknown>;
}
