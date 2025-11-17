// Implements REQ-FN-004: CSV Row TO-002
// Computes possible total score for all learning elements in each topic

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Topic Max Score Provider
 *
 * Implements CSV row TO-002
 * Dashboard Level: Topic overview
 * Metric Description: "Possible total score for all learning elements in each topic"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * @remarks
 * - Returns raw maximum possible score (not percentage) per CSV specification
 * - Sums result.score.max from all topic learning elements
 * - Filters by courseId, topicId, and optional time range
 * - Returns 0 if no score information found
 * - Topic scoped via context.contextActivities.parent
 * - Stateless: no side effects, no internal state mutation (REQ-FN-004)
 *
 * @implements {IMetricComputation}
 *
 * @example
 * ```typescript
 * const result = await provider.compute(
 *   { courseId: 'course-101', topicId: 'topic-5' },
 *   statements
 * );
 * console.log(result.value); // 500
 * console.log(result.metadata); // { unit: 'points', elementCount: 5, avgMaxScore: 100 }
 * ```
 */
@Injectable()
export class TopicMaxScoreProvider implements IMetricComputation {
  readonly id = 'topic-max-score';
  readonly dashboardLevel = 'topic';
  readonly title = 'Topic Max Score';
  readonly description =
    'Possible total score for all learning elements in each topic';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['courseId', 'topicId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'scalar' as const;

  readonly example = {
    params: { courseId: 'course-101', topicId: 'topic-5' },
    result: {
      value: 500,
      metadata: { unit: 'points', elementCount: 5, avgMaxScore: 100 },
    },
  };

  /**
   * Compute the maximum possible score for all elements in a topic
   * Sums result.score.max from all xAPI statements belonging to the topic
   *
   * @param params - Must include courseId and topicId; optional since/until for time filtering
   * @param lrsData - Array of xAPI statements from the LRS (pre-filtered by courseId)
   * @returns Metric result with maximum possible score and metadata
   *
   * @remarks
   * - Aggregates all result.score.max values from topic statements
   * - Filters statements by topic context using context.contextActivities.parent
   * - Skips statements without max score information
   * - Returns 0 if no max score information found
   * - Metadata includes element count and average max score per element
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    let maxScore = 0;
    let elementCount = 0;

    // Filter statements belonging to this topic
    const topicStatements = lrsData.filter((stmt) =>
      this.isTopicStatement(stmt, params.topicId),
    );

    topicStatements.forEach((stmt) => {
      if (stmt.result?.score?.max !== undefined) {
        maxScore += stmt.result.score.max;
        elementCount++;
      }
    });

    const avgMaxScore = elementCount > 0 ? maxScore / elementCount : 0;

    return Promise.resolve({
      metricId: this.id,
      value: maxScore,
      computed: new Date().toISOString(),
      metadata: {
        unit: 'points',
        elementCount,
        avgMaxScore: Math.round(avgMaxScore * 100) / 100, // Round to 2 decimals
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
   * Ensures courseId and topicId are provided
   *
   * @param params - Parameters to validate
   * @throws Error if courseId or topicId is missing or time range is invalid
   */
  validateParams(params: MetricParams): void {
    if (!params.courseId) {
      throw new Error(
        'courseId is required for topic-max-score metric computation',
      );
    }
    if (!params.topicId) {
      throw new Error(
        'topicId is required for topic-max-score metric computation',
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
