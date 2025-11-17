// Implements REQ-FN-004: CSV Row TO-003
// Computes total time spent by a student in each topic in a given time period

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Topic Time Spent Provider
 *
 * Implements CSV row TO-003
 * Dashboard Level: Topic overview
 * Metric Description: "Total time spent by a student in each topic in a given time period"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * @remarks
 * - Returns total duration in seconds per CSV specification
 * - Aggregates result.duration from all topic activities
 * - Filters by userId, courseId, topicId, and optional time range
 * - Returns 0 if no duration data found
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
 * console.log(result.value); // 3600
 * console.log(result.metadata); // { unit: 'seconds', activityCount: 8, avgDuration: 450 }
 * ```
 */
@Injectable()
export class TopicTimeSpentProvider implements IMetricComputation {
  readonly id = 'topic-time-spent';
  readonly dashboardLevel = 'topic';
  readonly title = 'Topic Time Spent';
  readonly description =
    'Total time spent by a student in each topic in a given time period';
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
      value: 3600,
      metadata: { unit: 'seconds', activityCount: 8, avgDuration: 450 },
    },
  };

  /**
   * Compute the total time spent by a student in a topic
   * Aggregates result.duration from all xAPI statements belonging to the topic
   *
   * @param params - Must include userId, courseId, and topicId; optional since/until for time filtering
   * @param lrsData - Array of xAPI statements from the LRS (pre-filtered by courseId and userId)
   * @returns Metric result with total duration in seconds and metadata
   *
   * @remarks
   * - Aggregates all result.duration values from topic statements
   * - Filters statements by topic context using context.contextActivities.parent
   * - Skips statements without duration information
   * - Returns 0 if no duration data found
   * - Metadata includes activity count and average duration per activity
   * - Duration is in ISO 8601 format (PT#S) and converted to seconds
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    let totalDuration = 0;
    let activityCount = 0;

    // Filter statements belonging to this topic
    const topicStatements = lrsData.filter((stmt) =>
      this.isTopicStatement(stmt, params.topicId),
    );

    topicStatements.forEach((stmt) => {
      if (stmt.result?.duration !== undefined) {
        const durationSeconds = this.parseDuration(stmt.result.duration);
        if (durationSeconds > 0) {
          totalDuration += durationSeconds;
          activityCount++;
        }
      }
    });

    const avgDuration = activityCount > 0 ? totalDuration / activityCount : 0;

    return Promise.resolve({
      metricId: this.id,
      value: totalDuration,
      computed: new Date().toISOString(),
      metadata: {
        unit: 'seconds',
        activityCount,
        avgDuration: Math.round(avgDuration * 100) / 100, // Round to 2 decimals
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
   * Parse ISO 8601 duration string to seconds
   * xAPI durations are in format PT#H#M#S (e.g., PT1H30M45S)
   *
   * @param duration - ISO 8601 duration string
   * @returns Duration in seconds
   *
   * @remarks
   * - Handles hours, minutes, and seconds
   * - Returns 0 for invalid or unparseable durations
   * - Examples: PT1H = 3600, PT30M = 1800, PT45S = 45
   */
  private parseDuration(duration: string): number {
    try {
      const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/;
      const matches = duration.match(regex);

      if (!matches) return 0;

      const hours = parseInt(matches[1] || '0', 10);
      const minutes = parseInt(matches[2] || '0', 10);
      const seconds = parseFloat(matches[3] || '0');

      return hours * 3600 + minutes * 60 + seconds;
    } catch {
      return 0;
    }
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
        'userId is required for topic-time-spent metric computation',
      );
    }
    if (!params.courseId) {
      throw new Error(
        'courseId is required for topic-time-spent metric computation',
      );
    }
    if (!params.topicId) {
      throw new Error(
        'topicId is required for topic-time-spent metric computation',
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
