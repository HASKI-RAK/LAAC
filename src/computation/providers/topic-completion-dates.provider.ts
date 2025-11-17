// Implements REQ-FN-004: CSV Row TO-005
// Returns completion dates of the last three learning elements of any topic completed by a student

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Topic Completion Dates Provider
 *
 * Implements CSV row TO-005
 * Dashboard Level: Topic overview
 * Metric Description: "Completion date of the last three learning elements of any topic completed by a student"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv (Note: CSV has typo, should be "topic")
 *
 * @remarks
 * - Returns array of ISO 8601 completion timestamps for the 3 most recent completions
 * - Orders by completion timestamp (most recent first)
 * - Filters by userId, courseId, topicId
 * - Returns fewer than 3 dates if not enough completions exist
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
 * console.log(result.value); // ['2025-11-15T10:00:00Z', '2025-11-14T09:30:00Z', '2025-11-13T14:20:00Z']
 * ```
 */
@Injectable()
export class TopicCompletionDatesProvider implements IMetricComputation {
  readonly id = 'topic-completion-dates';
  readonly dashboardLevel = 'topic';
  readonly title = 'Topic Completion Dates';
  readonly description =
    'Completion date of the last three learning elements of any topic completed by a student';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = [
    'userId',
    'courseId',
    'topicId',
  ];
  readonly optionalParams: Array<keyof MetricParams> = [];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', courseId: 'course-101', topicId: 'topic-5' },
    result: {
      value: [
        '2025-11-15T10:00:00Z',
        '2025-11-14T09:30:00Z',
        '2025-11-13T14:20:00Z',
      ],
      metadata: { count: 3 },
    },
  };

  /**
   * Compute the completion dates of the last three completed elements in a topic
   * Filters completion statements and returns most recent three timestamps
   *
   * @param params - Must include userId, courseId, and topicId
   * @param lrsData - Array of xAPI statements from the LRS (pre-filtered by courseId and userId)
   * @returns Metric result with array of last 3 completion dates (ISO 8601) and metadata
   *
   * @remarks
   * - Searches for completion verbs: completed, passed
   * - Filters by topic context using context.contextActivities.parent
   * - Orders by timestamp descending (most recent first)
   * - Returns up to 3 dates (may be fewer if insufficient completions)
   * - Dates are in ISO 8601 format (e.g., '2025-11-15T10:00:00Z')
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    // Define completion verbs (HASKI custom + standard ADL)
    const completionVerbs = [
      'https://wiki.haski.app/variables/xapi.completed',
      'http://adlnet.gov/expapi/verbs/completed',
      'http://adlnet.gov/expapi/verbs/passed',
    ];

    // Filter statements belonging to this topic with completions
    const topicStatements = lrsData.filter((stmt) =>
      this.isTopicStatement(stmt, params.topicId),
    );

    // Filter completion statements and extract timestamps
    const completionDates = topicStatements
      .filter((stmt) => completionVerbs.includes(stmt.verb.id))
      .filter(
        (stmt) =>
          stmt.result?.completion === true ||
          stmt.result?.success === true ||
          true,
      ) // Accept any completion verb
      .filter((stmt) => stmt.timestamp !== undefined) // Ensure timestamp exists
      .map((stmt) => stmt.timestamp as string)
      .sort((a, b) => {
        // Sort by timestamp descending (most recent first)
        return new Date(b).getTime() - new Date(a).getTime();
      });

    // Take only the last 3 completion dates
    const lastThree = completionDates.slice(0, 3);

    return Promise.resolve({
      metricId: this.id,
      value: lastThree,
      computed: new Date().toISOString(),
      metadata: {
        count: lastThree.length,
        totalCompletions: completionDates.length,
        userId: params.userId,
        courseId: params.courseId,
        topicId: params.topicId,
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
   * @throws Error if userId, courseId, or topicId is missing
   */
  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error(
        'userId is required for topic-completion-dates metric computation',
      );
    }
    if (!params.courseId) {
      throw new Error(
        'courseId is required for topic-completion-dates metric computation',
      );
    }
    if (!params.topicId) {
      throw new Error(
        'topicId is required for topic-completion-dates metric computation',
      );
    }
  }
}
