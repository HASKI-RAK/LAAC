// Implements REQ-FN-003: Learning Engagement Metric Provider
// Computes average time spent and activity count for learning engagement

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Learning Engagement Metric Provider
 * Implements REQ-FN-003: Example Metric Providers
 * Implements REQ-FN-010: Metric Computation Interface
 * Implements REQ-FN-004: Stateless Computation
 *
 * @remarks
 * - Computes engagement score based on time spent and activity count
 * - Filters xAPI statements for time-tracking verbs and result.duration
 * - Returns engagement score (0-100) with metadata
 * - Stateless: no side effects, no internal state mutation (REQ-FN-004)
 * - Supports both course-level and topic-level metrics
 *
 * @example
 * ```typescript
 * const result = await provider.compute(
 *   { courseId: 'course-123', topicId: 'topic-456' },
 *   statements
 * );
 * console.log(result.value); // 78.5 (engagement score)
 * console.log(result.metadata); // { avgTimeMinutes: 45.2, activityCount: 120 }
 * ```
 */
@Injectable()
export class LearningEngagementProvider implements IMetricComputation {
  /**
   * Unique identifier for this metric
   */
  readonly id = 'learning-engagement';

  /**
   * Dashboard level where this metric is displayed
   * Supports both 'course' and 'topic' levels
   */
  readonly dashboardLevel = 'course';

  /** Human-readable title for catalog consumers */
  readonly title = 'Learning Engagement Score';

  /**
   * Human-readable description
   */
  readonly description =
    'Average time spent on learning activities and engagement score';

  /**
   * Semantic version
   */
  readonly version = '1.0.0';

  readonly requiredParams: Array<keyof MetricParams> = ['courseId'];

  readonly optionalParams: Array<keyof MetricParams> = [
    'topicId',
    'since',
    'until',
  ];

  readonly outputType = 'scalar' as const;

  readonly example = {
    params: {
      courseId: 'course-123',
      topicId: 'topic-456',
    },
    result: {
      value: 72.5,
      metadata: {
        activityCount: 18,
        avgTimeMinutes: 12.3,
        unit: 'score',
      },
    },
  } as const;

  /**
   * Compute the learning engagement score
   * Analyzes xAPI statements to determine engagement level
   *
   * @param params - Must include courseId; optional topicId for topic-level metrics, since/until for time filtering
   * @param lrsData - Array of xAPI statements from the LRS (pre-filtered by time range if since/until provided)
   * @returns Metric result with engagement score (0-100) and metadata
   *
   * @remarks
   * - Engagement score calculation:
   *   1. Counts activity statements (interactions, views, opens)
   *   2. Sums duration from result.duration fields (ISO 8601 format)
   *   3. Calculates score based on activity frequency and time investment
   * - Engagement verbs: viewed, opened, interacted, attempted, experienced
   * - Score formula: min(100, (activityCount * 2 + avgTimeMinutes * 0.2))
   * - Returns 0 if no relevant statements found
   * - Time filtering (since/until params) is handled by the LRS query layer before statements reach this provider
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    // Define engagement verbs (interactions, views, time-spent activities)
    const engagementVerbs = [
      'http://adlnet.gov/expapi/verbs/experienced',
      'http://activitystrea.ms/schema/1.0/open',
      'https://wiki.haski.app/variables/xapi.viewed',
      'https://wiki.haski.app/variables/xapi.interacted',
      'http://adlnet.gov/expapi/verbs/attempted',
      'https://wiki.haski.app/variables/xapi.clicked',
    ];

    // Filter statements by engagement verbs
    const engagementStatements = lrsData.filter((stmt) =>
      engagementVerbs.includes(stmt.verb.id),
    );

    const activityCount = engagementStatements.length;

    // Calculate total time spent from result.duration fields
    let totalDurationSeconds = 0;
    engagementStatements.forEach((stmt) => {
      if (stmt.result?.duration) {
        const seconds = this.parseDuration(stmt.result.duration);
        totalDurationSeconds += seconds;
      }
    });

    const totalDurationMinutes = totalDurationSeconds / 60;
    const avgTimeMinutes =
      activityCount > 0 ? totalDurationMinutes / activityCount : 0;

    // Compute engagement score (0-100)
    // Formula: Balance between activity frequency and time investment
    // - Each activity adds 2 points
    // - Each minute of average time adds 0.2 points
    // - Capped at 100
    const engagementScore = Math.min(
      100,
      activityCount * 2 + avgTimeMinutes * 0.2,
    );

    return Promise.resolve({
      metricId: this.id,
      value: Math.round(engagementScore * 100) / 100, // Round to 2 decimals
      computed: new Date().toISOString(),
      metadata: {
        activityCount,
        totalDurationMinutes: Math.round(totalDurationMinutes * 100) / 100,
        avgTimeMinutes: Math.round(avgTimeMinutes * 100) / 100,
        unit: 'score',
        courseId: params.courseId,
        topicId: params.topicId,
      },
    });
  }

  /**
   * Parse ISO 8601 duration string to seconds
   * Handles formats like: PT1H30M45S, PT45M, PT30S
   *
   * @param duration - ISO 8601 duration string
   * @returns Duration in seconds
   */
  private parseDuration(duration: string): number {
    // ISO 8601 duration format: PT[hours]H[minutes]M[seconds]S
    const match = duration.match(
      /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/,
    );

    if (!match) {
      return 0;
    }

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseFloat(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Validate metric-specific parameters
   * Ensures courseId is provided
   *
   * @param params - Parameters to validate
   * @throws Error if courseId is missing or time range is invalid
   */
  validateParams(params: MetricParams): void {
    if (!params.courseId) {
      throw new Error(
        'courseId is required for learning-engagement metric computation',
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
