// Implements REQ-FN-003: Topic Mastery Metric Provider
// Computes average score/performance on topic assessments

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Topic Mastery Metric Provider
 * Implements REQ-FN-003: Example Metric Providers
 * Implements REQ-FN-010: Metric Computation Interface
 * Implements REQ-FN-004: Stateless Computation
 *
 * @remarks
 * - Computes average score/performance on topic assessments
 * - Filters xAPI statements for scored verbs (answered, completed with results)
 * - Returns mastery score (0-100) with metadata
 * - Stateless: no side effects, no internal state mutation (REQ-FN-004)
 * - Topic-level metric requiring both courseId and topicId
 *
 * @example
 * ```typescript
 * const result = await provider.compute(
 *   { courseId: 'course-123', topicId: 'topic-456' },
 *   statements
 * );
 * console.log(result.value); // 87.3 (mastery score)
 * console.log(result.metadata); // { avgScore: 87.3, attemptCount: 45, successRate: 0.91 }
 * ```
 */
@Injectable()
export class TopicMasteryProvider implements IMetricComputation {
  /**
   * Unique identifier for this metric
   */
  readonly id = 'topic-mastery';

  /**
   * Dashboard level where this metric is displayed
   */
  readonly dashboardLevel = 'topic';

  /** Catalog-facing title */
  readonly title = 'Topic Mastery Score';

  /**
   * Human-readable description
   */
  readonly description =
    'Average score/performance on topic assessments and mastery level';

  /**
   * Semantic version
   */
  readonly version = '1.0.0';

  readonly requiredParams: Array<keyof MetricParams> = ['courseId', 'topicId'];

  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];

  readonly outputType = 'scalar' as const;

  readonly example = {
    params: {
      courseId: 'course-123',
      topicId: 'topic-456',
    },
    result: {
      value: 88.1,
      metadata: {
        attemptCount: 12,
        successRate: 0.83,
        unit: 'score',
      },
    },
  } as const;

  /**
   * Compute the topic mastery score
   * Analyzes xAPI statements to determine mastery level
   *
   * @param params - Must include courseId and topicId; optional since/until for time filtering
   * @param lrsData - Array of xAPI statements from the LRS (pre-filtered by time range if since/until provided)
   * @returns Metric result with mastery score (0-100) and metadata
   *
   * @remarks
   * - Mastery score calculation:
   *   1. Filters statements with result.score fields
   *   2. Extracts scaled scores (0-1) or converts raw scores to 0-100 scale
   *   3. Calculates average score across all attempts
   *   4. Also tracks success rate (result.success = true)
   * - Scored verbs: answered, completed, passed, failed
   * - Score normalization: Uses result.score.scaled (0-1) if available,
   *   otherwise calculates (raw - min) / (max - min)
   * - Returns 0 if no scored statements found
   * - Time filtering (since/until params) is handled by the LRS query layer before statements reach this provider
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    // Define scored verbs (assessment-related activities)
    const scoredVerbs = [
      'http://adlnet.gov/expapi/verbs/answered',
      'http://adlnet.gov/expapi/verbs/completed',
      'http://adlnet.gov/expapi/verbs/passed',
      'http://adlnet.gov/expapi/verbs/failed',
      'https://wiki.haski.app/variables/xapi.answered',
      'https://wiki.haski.app/variables/services.answered',
      'https://wiki.haski.app/variables/services.completed',
    ];

    // Filter statements with scores
    const scoredStatements = lrsData.filter(
      (stmt) =>
        scoredVerbs.includes(stmt.verb.id) && stmt.result?.score !== undefined,
    );

    const attemptCount = scoredStatements.length;

    // Extract and normalize scores to 0-100 scale
    const scores: number[] = [];
    let successCount = 0;

    scoredStatements.forEach((stmt) => {
      const score = stmt.result?.score;
      if (!score) return;

      // Track success rate
      if (stmt.result?.success === true) {
        successCount++;
      }

      // Normalize score to 0-100 scale
      let normalizedScore: number;

      if (score.scaled !== undefined) {
        // Use scaled score (0-1) if available
        normalizedScore = score.scaled * 100;
      } else if (
        score.raw !== undefined &&
        score.min !== undefined &&
        score.max !== undefined
      ) {
        // Calculate scaled score from raw/min/max
        const range = score.max - score.min;
        normalizedScore =
          range > 0 ? ((score.raw - score.min) / range) * 100 : 0;
      } else if (score.raw !== undefined && score.max !== undefined) {
        // Assume min = 0 if not provided
        normalizedScore = (score.raw / score.max) * 100;
      } else {
        // Fallback: assume raw score is already in 0-100 range
        normalizedScore = score.raw || 0;
      }

      scores.push(normalizedScore);
    });

    // Calculate average score
    const avgScore =
      scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

    // Calculate success rate
    const successRate = attemptCount > 0 ? successCount / attemptCount : 0;

    return Promise.resolve({
      metricId: this.id,
      value: Math.round(avgScore * 100) / 100, // Round to 2 decimals
      computed: new Date().toISOString(),
      metadata: {
        avgScore: Math.round(avgScore * 100) / 100,
        attemptCount,
        successCount,
        successRate: Math.round(successRate * 10000) / 10000, // Round to 4 decimals
        unit: 'score',
        courseId: params.courseId,
        topicId: params.topicId,
      },
    });
  }

  /**
   * Validate metric-specific parameters
   * Ensures both courseId and topicId are provided
   *
   * @param params - Parameters to validate
   * @throws Error if courseId or topicId is missing, or time range is invalid
   */
  validateParams(params: MetricParams): void {
    if (!params.courseId) {
      throw new Error(
        'courseId is required for topic-mastery metric computation',
      );
    }

    if (!params.topicId) {
      throw new Error(
        'topicId is required for topic-mastery metric computation',
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
