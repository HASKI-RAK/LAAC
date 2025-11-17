// Implements REQ-FN-004: CSV Row EO-003
// Computes score of best attempt for a learning element

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import { selectBestAttempt, extractScore } from '../utils/attempt-helpers';

/**
 * Element Best Attempt Score Provider
 *
 * Implements CSV row EO-003
 * Dashboard Level: Learning element overview
 * Metric Description: "Score for the best attempt of a student at each learning element"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * @remarks
 * - Returns score from best attempt (highest score, tie-break by most recent)
 * - Best attempt selected by: 1) highest score, 2) most recent if tied
 * - Uses shared helper: selectBestAttempt() from attempt-helpers.ts
 * - Returns null if no attempts found or best attempt has no score
 * - Score extracted from result.score.raw (preferred) or result.score.scaled
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
 * console.log(result.value); // 92
 * console.log(result.metadata); // { attemptCount: 3, bestAttemptDate: '...' }
 * ```
 */
@Injectable()
export class ElementBestAttemptScoreProvider implements IMetricComputation {
  readonly id = 'element-best-attempt-score';
  readonly dashboardLevel = 'element';
  readonly title = 'Element Best Attempt Score';
  readonly description =
    'Score for the best attempt of a student at each learning element';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'elementId'];
  readonly optionalParams: Array<keyof MetricParams> = [];
  readonly outputType = 'scalar' as const;

  readonly example = {
    params: { userId: 'user-123', elementId: 'element-42' },
    result: {
      value: 92,
      metadata: {
        attemptCount: 3,
        bestAttemptDate: '2025-11-15T10:30:00Z',
      },
    },
  };

  /**
   * Compute the score of the best attempt for an element
   * Selects best attempt (highest score, tie-break by most recent) and returns score
   *
   * @param params - Must include userId and elementId
   * @param lrsData - Array of xAPI statements for the element+user (pre-filtered)
   * @returns Metric result with score value or null if no attempts/score
   *
   * @remarks
   * - Returns null value if no attempts found
   * - Returns null if best attempt has no score
   * - Prioritizes result.score.raw over result.score.scaled
   * - Metadata includes attempt count and best attempt date
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

    const score = extractScore(bestAttempt);

    return Promise.resolve({
      metricId: this.id,
      value: score,
      computed: new Date().toISOString(),
      metadata: {
        attemptCount: lrsData.length,
        bestAttemptDate: bestAttempt.timestamp,
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
        'userId is required for element-best-attempt-score metric',
      );
    }
    if (!params.elementId) {
      throw new Error(
        'elementId is required for element-best-attempt-score metric',
      );
    }
  }
}
