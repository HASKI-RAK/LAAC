// Implements REQ-FN-004: CSV Row EO-005
// Returns last three learning elements of a topic completed by a student

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Element Last Completed Provider
 *
 * Implements CSV row EO-005
 * Dashboard Level: Learning element overview
 * Metric Description: "Last three learning elements of a topic completed by a student"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * @remarks
 * - Returns array of last 3 completed elements in topic
 * - Sorted by completion timestamp (most recent first)
 * - Filters by result.completion=true
 * - Returns fewer than 3 if not enough completions
 * - Returns empty array if no completions found
 * - Stateless: no side effects, no internal state mutation (REQ-FN-004)
 *
 * @implements {IMetricComputation}
 *
 * @example
 * ```typescript
 * const result = await provider.compute(
 *   { userId: 'user-123', topicId: 'topic-5' },
 *   statements
 * );
 * console.log(result.value); // [{ elementId: 'e1', completedAt: '...' }, ...]
 * console.log(result.metadata); // { totalCompletions: 5 }
 * ```
 */
@Injectable()
export class ElementLastCompletedProvider implements IMetricComputation {
  readonly id = 'element-last-completed';
  readonly dashboardLevel = 'element';
  readonly title = 'Element Last Completed';
  readonly description =
    'Last three learning elements of a topic completed by a student';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'topicId'];
  readonly optionalParams: Array<keyof MetricParams> = [];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', topicId: 'topic-5' },
    result: {
      value: [
        { elementId: 'element-1', completedAt: '2025-11-15T10:30:00Z' },
        { elementId: 'element-2', completedAt: '2025-11-14T09:20:00Z' },
        { elementId: 'element-3', completedAt: '2025-11-13T14:15:00Z' },
      ],
      metadata: { totalCompletions: 5 },
    },
  };

  /**
   * Compute the last three completed elements in a topic
   * Filters for completed statements and sorts by timestamp
   *
   * @param params - Must include userId and topicId
   * @param lrsData - Array of xAPI statements for the topic+user (pre-filtered)
   * @returns Metric result with array of last 3 completed elements
   *
   * @remarks
   * - Filters by result.completion=true
   * - Sorts by timestamp descending (most recent first)
   * - Returns up to 3 most recent completions
   * - Each element includes elementId and completedAt timestamp
   * - Returns empty array if no completions found
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    // Filter for completed statements
    const completedStatements = lrsData.filter(
      (stmt) => stmt.result?.completion === true,
    );

    // Sort by timestamp descending (most recent first)
    const sorted = completedStatements.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    // Take last 3
    const lastThree = sorted.slice(0, 3).map((stmt) => ({
      elementId: stmt.object.id,
      completedAt: stmt.timestamp,
    }));

    return Promise.resolve({
      metricId: this.id,
      value: lastThree,
      computed: new Date().toISOString(),
      metadata: {
        totalCompletions: completedStatements.length,
        userId: params.userId,
        topicId: params.topicId,
      },
    });
  }

  /**
   * Validate metric-specific parameters
   * Ensures userId and topicId are provided
   *
   * @param params - Parameters to validate
   * @throws Error if userId or topicId is missing
   */
  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error('userId is required for element-last-completed metric');
    }
    if (!params.topicId) {
      throw new Error('topicId is required for element-last-completed metric');
    }
  }
}
