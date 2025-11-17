// Implements REQ-FN-003: Course Completion Metric Provider
// Computes the percentage of enrolled students who completed a course

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Course Completion Metric Provider
 * Implements REQ-FN-003: Example Metric Providers
 * Implements REQ-FN-010: Metric Computation Interface
 * Implements REQ-FN-004: Stateless Computation
 *
 * @remarks
 * - Computes the percentage of enrolled students who completed a course
 * - Filters xAPI statements for completion verbs
 * - Returns completion percentage (0-100) with metadata
 * - Stateless: no side effects, no internal state mutation (REQ-FN-004)
 *
 * @example
 * ```typescript
 * const result = await provider.compute(
 *   { courseId: 'course-123', since: '2024-01-01T00:00:00Z' },
 *   statements
 * );
 * console.log(result.value); // 85.5
 * console.log(result.metadata); // { total: 100, completed: 85, unit: 'percentage' }
 * ```
 */
@Injectable()
export class CourseCompletionProvider implements IMetricComputation {
  /**
   * Unique identifier for this metric
   */
  readonly id = 'course-completion';

  /**
   * Dashboard level where this metric is displayed
   */
  readonly dashboardLevel = 'course';

  /**
   * Human friendly label for catalog consumers (REQ-FN-003)
   */
  readonly title = 'Course Completion Rate';

  /**
   * Human-readable description
   */
  readonly description =
    'Percentage of enrolled students who completed the course';

  /**
   * Semantic version
   */
  readonly version = '1.0.0';

  /**
   * Required/optional parameter metadata for catalog responses
   */
  readonly requiredParams: Array<keyof MetricParams> = ['courseId'];

  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];

  /**
   * Output metadata + representative example for catalog/detail endpoints
   */
  readonly outputType = 'scalar' as const;

  readonly example = {
    params: {
      courseId: 'course-123',
      since: '2025-01-01T00:00:00Z',
      until: '2025-12-31T23:59:59Z',
    },
    result: {
      value: 85.5,
      metadata: {
        totalLearners: 40,
        completedLearners: 34,
        unit: 'percentage',
      },
    },
  } as const;

  /**
   * Compute the course completion percentage
   * Analyzes xAPI statements to determine completion rate
   *
   * @param params - Must include courseId; optional since/until for time filtering
   * @param lrsData - Array of xAPI statements from the LRS (pre-filtered by time range if since/until provided)
   * @returns Metric result with completion percentage and metadata
   *
   * @remarks
   * - Searches for HASKI completion verb: https://wiki.haski.app/variables/xapi.completed
   * - Also supports standard ADL verb: http://adlnet.gov/expapi/verbs/completed
   * - Groups statements by unique actors (learners)
   * - Counts learners with at least one completion statement
   * - Returns 0 if no learners are found in the data
   * - Time filtering (since/until params) is handled by the LRS query layer before statements reach this provider
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    // Define completion verbs (HASKI custom + standard ADL)
    const completionVerbs = [
      'https://wiki.haski.app/variables/xapi.completed',
      'http://adlnet.gov/expapi/verbs/completed',
    ];

    // Extract unique learners from all statements
    const uniqueLearners = new Set<string>();
    lrsData.forEach((stmt) => {
      if (stmt.actor?.account?.name) {
        uniqueLearners.add(stmt.actor.account.name);
      } else if (stmt.actor?.mbox) {
        uniqueLearners.add(stmt.actor.mbox);
      }
    });

    // Extract learners who have completed the course
    const completedLearners = new Set<string>();
    lrsData.forEach((stmt) => {
      if (completionVerbs.includes(stmt.verb.id)) {
        if (stmt.actor?.account?.name) {
          completedLearners.add(stmt.actor.account.name);
        } else if (stmt.actor?.mbox) {
          completedLearners.add(stmt.actor.mbox);
        }
      }
    });

    const totalLearners = uniqueLearners.size;
    const completedCount = completedLearners.size;
    const completionPercentage =
      totalLearners > 0 ? (completedCount / totalLearners) * 100 : 0;

    return Promise.resolve({
      metricId: this.id,
      value: Math.round(completionPercentage * 100) / 100, // Round to 2 decimals
      computed: new Date().toISOString(),
      metadata: {
        totalLearners,
        completedLearners: completedCount,
        unit: 'percentage',
        courseId: params.courseId,
        timeRange: params.since
          ? { since: params.since, until: params.until }
          : undefined,
      },
    });
  }

  /**
   * Validate metric-specific parameters
   * Ensures courseId is provided
   *
   * @param params - Parameters to validate
   * @throws Error if courseId is missing or time range is invalid
   */
  validateParams(params: MetricParams): void {
    if (!params.courseId) {
      throw new Error(
        'courseId is required for course-completion metric computation',
      );
    }

    // Validate time range if both since and until are provided
    if (params.since && params.until) {
      const since = new Date(params.since);
      const until = new Date(params.until);

      if (since > until) {
        throw new Error('since timestamp must be before until timestamp');
      }
    }
  }
}
