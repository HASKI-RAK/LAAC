// Implements REQ-FN-004: CSV Row CO-001
// Computes total score earned by a student on learning elements in a course

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Course Total Score Provider
 *
 * Implements CSV row CO-001
 * Dashboard Level: Course overview
 * Metric Description: "Total score earned by a student on learning elements in each course"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * @remarks
 * - Returns raw total score (not percentage) per CSV specification
 * - Sums result.score.raw from all learning elements in the course
 * - Filters by userId, courseId, and optional time range
 * - Returns 0 if no scores found
 * - Stateless: no side effects, no internal state mutation (REQ-FN-004)
 *
 * @implements {IMetricComputation}
 *
 * @example
 * ```typescript
 * const result = await provider.compute(
 *   { userId: 'user-123', courseId: 'course-101' },
 *   statements
 * );
 * console.log(result.value); // 850
 * console.log(result.metadata); // { unit: 'points', elementCount: 12, avgScore: 70.83 }
 * ```
 */
@Injectable()
export class CourseTotalScoreProvider implements IMetricComputation {
  readonly id = 'course-total-score';
  readonly dashboardLevel = 'course';
  readonly title = 'Course Total Score';
  readonly description =
    'Total score earned by a student on learning elements in each course';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'courseId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'scalar' as const;

  readonly example = {
    params: { userId: 'user-123', courseId: 'course-101' },
    result: {
      value: 850,
      metadata: { unit: 'points', elementCount: 12, avgScore: 70.83 },
    },
  };

  /**
   * Compute the total score earned by a student in a course
   * Sums result.score.raw from all xAPI statements
   *
   * @param params - Must include userId and courseId; optional since/until for time filtering
   * @param lrsData - Array of xAPI statements from the LRS (pre-filtered by courseId and userId)
   * @returns Metric result with total score and metadata
   *
   * @remarks
   * - Aggregates all result.score.raw values from statements
   * - Skips statements without score information
   * - Returns 0 if no scored elements found
   * - Metadata includes element count and average score
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    let totalScore = 0;
    let elementCount = 0;

    lrsData.forEach((stmt) => {
      if (stmt.result?.score?.raw !== undefined) {
        totalScore += stmt.result.score.raw;
        elementCount++;
      }
    });

    const avgScore = elementCount > 0 ? totalScore / elementCount : 0;

    return Promise.resolve({
      metricId: this.id,
      value: totalScore,
      computed: new Date().toISOString(),
      metadata: {
        unit: 'points',
        elementCount,
        avgScore: Math.round(avgScore * 100) / 100, // Round to 2 decimals
        userId: params.userId,
        courseId: params.courseId,
        timeRange: params.since
          ? { since: params.since, until: params.until }
          : undefined,
      },
    });
  }

  /**
   * Validate metric-specific parameters
   * Ensures userId and courseId are provided
   *
   * @param params - Parameters to validate
   * @throws Error if userId or courseId is missing or time range is invalid
   */
  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error(
        'userId is required for course-total-score metric computation',
      );
    }
    if (!params.courseId) {
      throw new Error(
        'courseId is required for course-total-score metric computation',
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
