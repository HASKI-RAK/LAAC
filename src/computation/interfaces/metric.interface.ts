// Implements REQ-FN-010: Metric Computation Interface
// Defines the contract that all metric providers must implement

import { DashboardLevel } from '../types/dashboard-level.type';
import { MetricParams } from './metric-params.interface';
import { MetricResult } from './metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Metric Computation Interface
 * Defines the contract for all metric provider implementations
 * Implements REQ-FN-010: Metric Extension Architecture and Interfaces
 *
 * @remarks
 * - All metric providers must implement this interface
 * - Enables plugin-like architecture for metric implementations (REQ-FN-010)
 * - Supports NestJS dependency injection via @Injectable() decorator
 * - Enforces stateless computation per REQ-FN-004
 * - Integrates with catalog (REQ-FN-001) and results (REQ-FN-005) endpoints
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class CourseCompletionMetric implements IMetricComputation {
 *   id = 'course-completion';
 *   dashboardLevel = 'course';
 *   description = 'Percentage of students who completed the course';
 *   version = '1.0.0';
 *
 *   async compute(params: MetricParams, statements: xAPIStatement[]): Promise<MetricResult> {
 *     const completed = statements.filter(s =>
 *       s.verb.id === 'http://adlnet.gov/expapi/verbs/completed'
 *     ).length;
 *     const total = statements.length;
 *     const value = total > 0 ? (completed / total) * 100 : 0;
 *
 *     return {
 *       metricId: this.id,
 *       value,
 *       computed: new Date().toISOString(),
 *       metadata: { total, completed },
 *     };
 *   }
 *
 *   validateParams(params: MetricParams): void {
 *     if (!params.courseId) {
 *       throw new Error('courseId is required for course-completion metric');
 *     }
 *   }
 * }
 * ```
 */
export interface IMetricComputation {
  /**
   * Unique metric identifier
   * Used for catalog registration, API routing, and cache key generation
   * Must be kebab-case and globally unique within the system
   * @example 'course-completion', 'topic-engagement', 'element-time-spent'
   */
  readonly id: string;

  /**
   * Dashboard hierarchy level where this metric is displayed
   * Determines the scope of data aggregation and API endpoint structure
   * @example 'course', 'topic', 'element'
   */
  readonly dashboardLevel: DashboardLevel;

  /**
   * Human-readable description of the metric
   * Used in catalog endpoint and API documentation
   * @example 'Percentage of students who completed the course'
   */
  readonly description: string;

  /**
   * Semantic version of the metric implementation (optional)
   * Used for versioning metric computations and cache invalidation
   * @example '1.0.0', '2.1.3'
   */
  readonly version?: string;

  /**
   * User-facing title shown in catalog responses (optional)
   * Falls back to a title-cased version of the metric id when omitted
   */
  readonly title?: string;

  /**
   * Required query parameters for the metric (e.g., courseId, topicId)
   * Used by catalog metadata and request validation guidance
   */
  readonly requiredParams?: (keyof MetricParams)[];

  /**
   * Optional parameters supported by the metric (e.g., since, until)
   */
  readonly optionalParams?: (keyof MetricParams)[];

  /**
   * Declares the shape of the metric output value for catalog metadata
   */
  readonly outputType?: MetricOutputType;

  /**
   * Example inputs/outputs for documentation and testing hints
   */
  readonly example?: MetricExample;

  /**
   * Compute the metric value from xAPI statements
   * Implements REQ-FN-004: Must be a stateless, pure function
   *
   * @param params - Contextual parameters for the computation (courseId, topicId, etc.)
   * @param lrsData - xAPI statements retrieved from the LRS
   * @returns Computed metric result with value, timestamp, and metadata
   *
   * @remarks
   * - Must be stateless: no side effects, no internal state mutation (REQ-FN-004)
   * - Should handle empty statement arrays gracefully
   * - Should validate required parameters internally or via `validateParams()`
   * - Computation errors should throw descriptive exceptions
   * - Result timestamp should be ISO 8601 format
   *
   * @throws Error if required parameters are missing or computation fails
   *
   * @example
   * ```typescript
   * const result = await metric.compute(
   *   { courseId: 'course-123', since: '2024-01-01T00:00:00Z' },
   *   statements
   * );
   * console.log(result.value); // 85.5
   * ```
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult>;

  /**
   * Validate metric-specific parameters (optional)
   * Called by the results endpoint before executing `compute()`
   *
   * @param params - Parameters to validate
   * @throws Error with descriptive message if validation fails
   *
   * @remarks
   * - Enables per-metric custom validation logic
   * - Validation errors should include clear, actionable messages
   * - Called before querying the LRS to fail fast on invalid input
   * - If not implemented, no additional validation is performed
   *
   * @example
   * ```typescript
   * validateParams(params: MetricParams): void {
   *   if (!params.courseId) {
   *     throw new Error('courseId is required for this metric');
   *   }
   *   if (params.since && params.until && params.since > params.until) {
   *     throw new Error('since must be before until');
   *   }
   * }
   * ```
   */
  validateParams?(params: MetricParams): void;
}

/**
 * Enum representing high-level output shapes exposed via the API catalog
 */
export type MetricOutputType = 'scalar' | 'object' | 'array';

/**
 * Example configuration surfaced in the catalog/detail endpoints
 */
export interface MetricExample {
  /** Sample request parameters */
  params: Partial<MetricParams>;
  /** Representative value + metadata snippet */
  result: {
    value: MetricResult['value'] | null;
    metadata?: Record<string, unknown>;
  };
}
