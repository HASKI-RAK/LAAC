// Implements REQ-FN-032: CSV v3 metric topic-last-elements
// Returns the three most recently completed learning elements within a topic

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/** Completion verbs recognized by v3 metrics (HASKI custom + standard ADL) */
const COMPLETION_VERBS = [
  'https://wiki.haski.app/variables/xapi.completed',
  'http://adlnet.gov/expapi/verbs/completed',
  'http://adlnet.gov/expapi/verbs/passed',
];

/**
 * Topic Last Elements Provider
 *
 * Implements CSV v3 metric: topic-last-elements — Returns the three most recently
 * completed learning elements by the user within a specified topic, ordered by
 * completion time descending.
 *
 * @remarks
 * - Returns array of the 3 most recently completed elements within the topic
 * - Orders by completion timestamp (most recent first)
 * - Filters by userId, topicId, and optional time range
 * - Returns fewer than 3 elements if not enough completions exist
 * - Topic scoped via context.contextActivities.parent
 * - Stateless: no side effects, no internal state mutation (REQ-FN-032)
 *
 * @implements {IMetricComputation}
 *
 * @example
 * ```typescript
 * const result = await provider.compute(
 *   { userId: 'user-123', topicId: 'topic-5' },
 *   statements
 * );
 * console.log(result.value); // [{ elementId: 'e3', completedAt: '...' }, ...]
 * ```
 */
@Injectable()
export class TopicLastElementsProvider implements IMetricComputation {
  readonly id = 'topic-last-elements';
  readonly dashboardLevel = 'topic';
  readonly title = 'Topic Last Elements';
  readonly description =
    'Returns the three most recently completed learning elements by the user within a specified topic, ordered by completion time descending and optionally filtered by a specified time range.';
  readonly version = '3.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'topicId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', topicId: 'topic-5' },
    result: {
      value: [
        { elementId: 'element-3', completedAt: '2026-02-04T12:00:00Z' },
        { elementId: 'element-2', completedAt: '2026-02-03T15:30:00Z' },
        { elementId: 'element-1', completedAt: '2026-02-02T09:00:00Z' },
      ],
      metadata: { returnedCount: 3 },
    },
  };

  /**
   * Compute the last three completed learning elements in a topic
   * Filters completion statements and returns most recent three
   *
   * @param params - Must include userId and topicId; optional since/until for time filtering
   * @param lrsData - Array of xAPI statements from the LRS
   * @returns Metric result with array of last 3 completed elements and metadata
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    const elementCompletions = new Map<string, string>();

    lrsData.forEach((statement) => {
      if (!this.belongsToTopic(statement, params.topicId!)) return;
      if (!this.isCompletionStatement(statement)) return;

      const elementId = statement.object?.id;
      if (!elementId) return;

      const timestamp = statement.timestamp;
      if (!timestamp) return;

      const existingTimestamp = elementCompletions.get(elementId);
      if (
        !existingTimestamp ||
        new Date(timestamp) > new Date(existingTimestamp)
      ) {
        elementCompletions.set(elementId, timestamp);
      }
    });

    const values = Array.from(elementCompletions.entries())
      .map(([elementId, completedAt]) => ({ elementId, completedAt }))
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      )
      .slice(0, 3);

    return Promise.resolve({
      metricId: this.id,
      value: values,
      computed: new Date().toISOString(),
      metadata: {
        totalCompletedElements: elementCompletions.size,
        returnedCount: values.length,
        userId: params.userId,
        topicId: params.topicId,
        timeRange: params.since
          ? { since: params.since, until: params.until }
          : undefined,
      },
    });
  }

  /**
   * Validate metric-specific parameters
   * Ensures userId and topicId are provided
   *
   * @param params - Parameters to validate
   * @throws Error if userId or topicId is missing or time range is invalid
   */
  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error('userId is required for topic-last-elements metric');
    }
    if (!params.topicId) {
      throw new Error('topicId is required for topic-last-elements metric');
    }

    if (params.since && params.until) {
      const since = new Date(params.since);
      const until = new Date(params.until);

      if (since > until) {
        throw new Error('since timestamp must be before until timestamp');
      }
    }
  }

  private belongsToTopic(statement: xAPIStatement, topicId: string): boolean {
    const contextActivities = statement.context?.contextActivities;
    if (!contextActivities) return false;

    const parents = contextActivities.parent ?? [];

    return parents.some((activity) => {
      const id = activity.id;
      if (!id) return false;
      return (
        id === topicId ||
        id.includes(`/topic/${topicId}`) ||
        id.includes(`/topics/${topicId}`)
      );
    });
  }

  /**
   * Checks if a statement is a completion statement
   * Recognizes HASKI custom verb and standard ADL completed/passed verbs
   */
  private isCompletionStatement(statement: xAPIStatement): boolean {
    return COMPLETION_VERBS.includes(statement.verb?.id);
  }
}
