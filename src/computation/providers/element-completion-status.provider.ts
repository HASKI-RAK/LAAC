// Implements REQ-FN-004: CSV Row EO-001
// Computes current completion status of best attempt for a learning element

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import {
  selectBestAttempt,
  isCompleted,
  extractScore,
} from '../utils/attempt-helpers';

/**
 * Element Completion Status Provider
 *
 * Implements CSV row EO-001
 * Dashboard Level: Learning element overview
 * Metric Description: "Current completion status of the best attempt by a student for each learning element"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * @remarks
 * - Returns completion status from best attempt (highest score, tie-break by most recent)
 * - Best attempt selected by: 1) highest score, 2) most recent if tied
 * - Uses shared helper: selectBestAttempt() from attempt-helpers.ts
 * - Returns null if no attempts found
 * - Completion determined by result.completion boolean flag in xAPI statement
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
 * console.log(result.value); // true (completed) or false (not completed)
 * console.log(result.metadata); // { attemptCount: 3, bestAttemptDate: '...', bestScore: 92 }
 * ```
 */
@Injectable()
export class ElementCompletionStatusProvider implements IMetricComputation {
  readonly id = 'element-completion-status';
  readonly dashboardLevel = 'element';
  readonly title = 'Element Completion Status';
  readonly description =
    'Current completion status of the best attempt by a student for each learning element';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'elementId'];
  readonly optionalParams: Array<keyof MetricParams> = [];
  readonly outputType = 'scalar' as const;

  readonly example = {
    params: { userId: 'user-123', elementId: 'element-42' },
    result: {
      value: true,
      metadata: {
        attemptCount: 3,
        bestAttemptDate: '2025-11-15T10:30:00Z',
        bestScore: 92,
      },
    },
  };

  /**
   * Compute the completion status of the best attempt for an element
   * Selects best attempt (highest score, tie-break by most recent) and returns completion flag
   *
   * @param params - Must include userId and elementId
   * @param lrsData - Array of xAPI statements for the element+user (pre-filtered)
   * @returns Metric result with completion status (true/false/null) and metadata
   *
   * @remarks
   * - Returns null value if no attempts found
   * - Returns true if best attempt has result.completion=true
   * - Returns false if best attempt has result.completion=false or missing
   * - Metadata includes attempt count, best attempt date, and best score
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

    const completed = isCompleted(bestAttempt);
    const score = extractScore(bestAttempt);

    return Promise.resolve({
      metricId: this.id,
      value: completed,
      computed: new Date().toISOString(),
      metadata: {
        attemptCount: lrsData.length,
        bestAttemptDate: bestAttempt.timestamp,
        bestScore: score,
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
        'userId is required for element-completion-status metric',
      );
    }
    if (!params.elementId) {
      throw new Error(
        'elementId is required for element-completion-status metric',
      );
    }
  }
}
