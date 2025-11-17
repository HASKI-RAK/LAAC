// Implements REQ-FN-004: CSV Row CO-002
// Computes possible total score for all learning elements in a course

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Course Max Score Provider
 *
 * Implements CSV row CO-002
 * Dashboard Level: Course overview
 * Metric Description: "Possible total score for all learning elements in each course"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * @remarks
 * - Returns raw possible total score (not percentage) per CSV specification
 * - Sums result.score.max from all learning elements in the course
 * - Filters by courseId and optional time range
 * - Returns 0 if no max scores found
 * - Stateless: no side effects, no internal state mutation (REQ-FN-004)
 *
 * @implements {IMetricComputation}
 *
 * @example
 * ```typescript
 * const result = await provider.compute(
 *   { courseId: 'course-101' },
 *   statements
 * );
 * console.log(result.value); // 1000
 * console.log(result.metadata); // { unit: 'points', elementCount: 10 }
 * ```
 */
@Injectable()
export class CourseMaxScoreProvider implements IMetricComputation {
  readonly id = 'course-max-score';
  readonly dashboardLevel = 'course';
  readonly title = 'Course Maximum Score';
  readonly description =
    'Possible total score for all learning elements in each course';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['courseId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'scalar' as const;

  readonly example = {
    params: { courseId: 'course-101' },
    result: {
      value: 1000,
      metadata: { unit: 'points', elementCount: 10 },
    },
  };

  /**
   * Compute the possible total score for all learning elements in a course
   * Sums result.score.max from all xAPI statements
   *
   * @param params - Must include courseId; optional since/until for time filtering
   * @param lrsData - Array of xAPI statements from the LRS (pre-filtered by courseId)
   * @returns Metric result with possible total score and metadata
   *
   * @remarks
   * - Aggregates all result.score.max values from statements
   * - Uses unique element IDs to avoid counting duplicates
   * - Skips statements without max score information
   * - Returns 0 if no scored elements found
   * - Metadata includes element count
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    // Track max score per unique element to avoid duplicates
    const elementMaxScores = new Map<string, number>();

    lrsData.forEach((stmt) => {
      if (stmt.result?.score?.max !== undefined && stmt.object?.id) {
        const elementId = stmt.object.id;
        const currentMax = elementMaxScores.get(elementId) || 0;
        // Keep the highest max score for each element (handles multiple attempts)
        elementMaxScores.set(
          elementId,
          Math.max(currentMax, stmt.result.score.max),
        );
      }
    });

    const possibleTotalScore = Array.from(elementMaxScores.values()).reduce(
      (sum, score) => sum + score,
      0,
    );
    const elementCount = elementMaxScores.size;

    return Promise.resolve({
      metricId: this.id,
      value: possibleTotalScore,
      computed: new Date().toISOString(),
      metadata: {
        unit: 'points',
        elementCount,
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
        'courseId is required for course-max-score metric computation',
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
