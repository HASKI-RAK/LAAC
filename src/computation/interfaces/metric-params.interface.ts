// Implements REQ-FN-010: Metric Parameters Interface
// Defines the structure for parameters passed to metric computations

/**
 * Metric Parameters Interface
 * Contains the contextual parameters required for computing a metric
 *
 * @remarks
 * - Parameters are provided by the client via query parameters or request body
 * - All parameters are optional at the type level; specific metrics validate required params
 * - Supports filtering by course, topic, element, user, time range, and custom filters
 * - Enables flexible metric computation across different contexts
 *
 * @example
 * ```typescript
 * const params: MetricParams = {
 *   courseId: 'course-123',
 *   topicId: 'topic-456',
 *   since: '2024-01-01T00:00:00Z',
 *   until: '2024-12-31T23:59:59Z',
 * };
 * ```
 */
export interface MetricParams {
  /**
   * Course identifier for course-level metrics
   * @example 'course-123'
   */
  courseId?: string;

  /**
   * Topic/module identifier for topic-level metrics
   * @example 'topic-456'
   */
  topicId?: string;

  /**
   * Element identifier for element-level metrics
   * @example 'element-789'
   */
  elementId?: string;

  /**
   * User identifier for user-specific metrics
   * @example 'user-abc'
   */
  userId?: string;

  /**
   * Group identifier for cohort/group metrics
   * @example 'group-xyz'
   */
  groupId?: string;

  /**
   * Start timestamp for time-bounded metrics (ISO 8601)
   * @example '2024-01-01T00:00:00Z'
   */
  since?: string;

  /**
   * End timestamp for time-bounded metrics (ISO 8601)
   * @example '2024-12-31T23:59:59Z'
   */
  until?: string;

  /**
   * Instance identifier for multi-instance filtering (REQ-FN-017)
   * Can be: single ID, comma-separated IDs, wildcard (*), or omitted for all
   * @example 'hs-ke' or 'hs-ke,hs-rv' or '*'
   */
  instanceId?: string;

  /**
   * Additional custom filters as key-value pairs
   * Enables metric-specific filtering logic
   * @example { 'activityType': 'quiz', 'minScore': '80' }
   */
  filters?: Record<string, string>;
}
