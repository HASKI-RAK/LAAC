// Implements REQ-FN-004: CSV Row EO-002
// Computes date of best attempt for a learning element

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import { selectBestAttempt } from '../utils/attempt-helpers';

/**
 * Element Best Attempt Date Provider
 *
 * Implements CSV row EO-002
 * Dashboard Level: Learning element overview
 * Metric Description: "Date of the best attempt of a student for each learning element"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * @remarks
 * - Returns timestamp from best attempt (highest score, tie-break by most recent)
 * - Best attempt selected by: 1) highest score, 2) most recent if tied
 * - Uses shared helper: selectBestAttempt() from attempt-helpers.ts
 * - Returns null if no attempts found
 * - Timestamp is ISO 8601 format from xAPI statement.timestamp field
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
 * console.log(result.value); // '2025-11-15T10:30:00Z'
 * console.log(result.metadata); // { attemptCount: 3, bestScore: 92 }
 * ```
 */
@Injectable()
export class ElementBestAttemptDateProvider implements IMetricComputation {
  readonly id = 'element-best-attempt-date';
  readonly dashboardLevel = 'element';
  readonly title = 'Element Best Attempt Date';
  readonly description =
    'Date of the best attempt of a student for each learning element';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'elementId'];
  readonly optionalParams: Array<keyof MetricParams> = [];
  readonly outputType = 'scalar' as const;

  readonly example = {
    params: { userId: 'user-123', elementId: 'element-42' },
    result: {
      value: '2025-11-15T10:30:00Z',
      metadata: {
        attemptCount: 3,
        bestScore: 92,
      },
    },
  };

  /**
   * Compute the date of the best attempt for an element
   * Selects best attempt (highest score, tie-break by most recent) and returns timestamp
   *
   * @param params - Must include userId and elementId
   * @param lrsData - Array of xAPI statements for the element+user (pre-filtered)
   * @returns Metric result with ISO 8601 timestamp or null if no attempts
   *
   * @remarks
   * - Returns null value if no attempts found
   * - Returns timestamp from best attempt's statement.timestamp field
   * - Metadata includes attempt count and best score
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    const bestAttempt = selectBestAttempt(lrsData);

    if (!bestAttempt) {
      return Promise.resolve({
        metricId: this.id,
        value: null,
        computed: new Date().toISOString(),
        metadata: {
          status: 'no_attempts',
          attemptCount: 0,
          userId: params.userId,
          elementId: params.elementId,
        },
      });
    }

    const bestScore =
      bestAttempt.result?.score?.raw ??
      bestAttempt.result?.score?.scaled ??
      null;

    return Promise.resolve({
      metricId: this.id,
      value: bestAttempt.timestamp || null,
      computed: new Date().toISOString(),
      metadata: {
        attemptCount: lrsData.length,
        bestScore,
        userId: params.userId,
        elementId: params.elementId,
      },
    });
  }

  /**
   * Validate metric-specific parameters
   * Ensures userId and elementId are provided
   *
   * @param params - Parameters to validate
   * @throws Error if userId or elementId is missing
   */
  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error(
        'userId is required for element-best-attempt-date metric',
      );
    }
    if (!params.elementId) {
      throw new Error(
        'elementId is required for element-best-attempt-date metric',
      );
    }
  }
}
