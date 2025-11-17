// Implements REQ-FN-004: CSV Row EO-004
// Computes total time spent by a student on a learning element

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import { parseDuration } from '../utils/duration-helpers';

/**
 * Element Time Spent Provider
 *
 * Implements CSV row EO-004
 * Dashboard Level: Learning element overview
 * Metric Description: "Total time spent by a student on each learning element in a given time period"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * @remarks
 * - Aggregates result.duration from all element attempts by student
 * - Parses ISO 8601 duration format (e.g., 'PT30M' = 30 minutes)
 * - Returns total seconds (raw aggregation per CSV specification)
 * - Returns 0 if no durations found
 * - Optional time filtering via since/until parameters
 * - Stateless: no side effects, no internal state mutation (REQ-FN-004)
 *
 * @implements {IMetricComputation}
 *
 * @example
 * ```typescript
 * const result = await provider.compute(
 *   { userId: 'user-123', elementId: 'element-42' },
 *   statements
 * );
 * console.log(result.value); // 1800 (30 minutes in seconds)
 * console.log(result.metadata); // { unit: 'seconds', attemptCount: 3 }
 * ```
 */
@Injectable()
export class ElementTimeSpentProvider implements IMetricComputation {
  readonly id = 'element-time-spent';
  readonly dashboardLevel = 'element';
  readonly title = 'Element Time Spent';
  readonly description =
    'Total time spent by a student on each learning element in a given time period';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'elementId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'scalar' as const;

  readonly example = {
    params: { userId: 'user-123', elementId: 'element-42' },
    result: {
      value: 1800,
      metadata: {
        unit: 'seconds',
        attemptCount: 3,
      },
    },
  };

  /**
   * Compute the total time spent on an element
   * Aggregates result.duration from all attempts
   *
   * @param params - Must include userId and elementId; optional since/until for time filtering
   * @param lrsData - Array of xAPI statements for the element+user (pre-filtered)
   * @returns Metric result with total seconds
   *
   * @remarks
   * - Returns 0 if no durations found
   * - Skips statements without result.duration
   * - Parses ISO 8601 duration format
   * - Metadata includes unit (seconds), attempt count
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    let totalSeconds = 0;
    let attemptCount = 0;

    lrsData.forEach((stmt) => {
      if (stmt.result?.duration) {
        const seconds = parseDuration(stmt.result.duration);
        if (seconds > 0) {
          totalSeconds += seconds;
          attemptCount++;
        }
      }
    });

    return Promise.resolve({
      metricId: this.id,
      value: totalSeconds,
      computed: new Date().toISOString(),
      metadata: {
        unit: 'seconds',
        attemptCount,
        userId: params.userId,
        elementId: params.elementId,
        timeRange: params.since
          ? { since: params.since, until: params.until }
          : undefined,
      },
    });
  }

  /**
   * Validate metric-specific parameters
   * Ensures userId and elementId are provided
   *
   * @param params - Parameters to validate
   * @throws Error if userId or elementId is missing or time range is invalid
   */
  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error('userId is required for element-time-spent metric');
    }
    if (!params.elementId) {
      throw new Error('elementId is required for element-time-spent metric');
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
