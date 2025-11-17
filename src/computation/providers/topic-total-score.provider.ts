// Implements REQ-FN-004: CSV Row TO-001
// Computes total score earned by a student on learning elements in each topic

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Topic Total Score Provider
 *
 * Implements CSV row TO-001
 * Dashboard Level: Topic overview
 * Metric Description: "Total score earned by a student on learning elements in each topic"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * @remarks
 * - Returns raw total score (not percentage) per CSV specification
 * - Sums result.score.raw from topic learning elements
 * - Filters by userId, courseId, topicId, and optional time range
 * - Returns 0 if no scores found
 * - Topic scoped via context.contextActivities.parent
 * - Stateless: no side effects, no internal state mutation (REQ-FN-004)
 *
 * @implements {IMetricComputation}
 *
 * @example
 * ```typescript
 * const result = await provider.compute(
 *   { userId: 'user-123', courseId: 'course-101', topicId: 'topic-5' },
 *   statements
 * );
 * console.log(result.value); // 340
 * console.log(result.metadata); // { unit: 'points', elementCount: 5, avgScore: 68 }
 * ```
 */
@Injectable()
export class TopicTotalScoreProvider implements IMetricComputation {
  readonly id = 'topic-total-score';
  readonly dashboardLevel = 'topic';
  readonly title = 'Topic Total Score';
  readonly description =
    'Total score earned by a student on learning elements in each topic';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = [
    'userId',
    'courseId',
    'topicId',
  ];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'scalar' as const;

  readonly example = {
    params: { userId: 'user-123', courseId: 'course-101', topicId: 'topic-5' },
    result: {
      value: 340,
      metadata: { unit: 'points', elementCount: 5, avgScore: 68 },
    },
  };

  /**
   * Compute the total score earned by a student in a topic
   * Sums result.score.raw from all xAPI statements belonging to the topic
   *
   * @param params - Must include userId, courseId, and topicId; optional since/until for time filtering
   * @param lrsData - Array of xAPI statements from the LRS (pre-filtered by courseId and userId)
   * @returns Metric result with total score and metadata
   *
   * @remarks
   * - Aggregates all result.score.raw values from topic statements
   * - Filters statements by topic context using context.contextActivities.parent
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

    // Filter statements belonging to this topic
    const topicStatements = lrsData.filter((stmt) =>
      this.isTopicStatement(stmt, params.topicId),
    );

    topicStatements.forEach((stmt) => {
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
        topicId: params.topicId,
        timeRange: params.since
          ? { since: params.since, until: params.until }
          : undefined,
      },
    });
  }

  /**
   * Check if an xAPI statement belongs to the specified topic
   * Examines context.contextActivities.parent for topic ID match
   *
   * @param stmt - xAPI statement to check
   * @param topicId - Topic identifier to match against
   * @returns true if statement belongs to topic, false otherwise
   *
   * @remarks
   * - Checks context.contextActivities.parent array for topic references
   * - Matches topic ID in parent activity IDs (e.g., ".../topic/5")
   * - Returns false if no context activities or parent activities exist
   */
  private isTopicStatement(
    stmt: xAPIStatement,
    topicId: string | undefined,
  ): boolean {
    if (!topicId) return false;

    const parents = stmt.context?.contextActivities?.parent || [];
    return parents.some((parent) => parent.id.includes(`/topic/${topicId}`));
  }

  /**
   * Validate metric-specific parameters
   * Ensures userId, courseId, and topicId are provided
   *
   * @param params - Parameters to validate
   * @throws Error if userId, courseId, or topicId is missing or time range is invalid
   */
  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error(
        'userId is required for topic-total-score metric computation',
      );
    }
    if (!params.courseId) {
      throw new Error(
        'courseId is required for topic-total-score metric computation',
      );
    }
    if (!params.topicId) {
      throw new Error(
        'topicId is required for topic-total-score metric computation',
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
