// Implements REQ-FN-004: CSV Row CO-003
// Computes total time spent by a student in a course

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Course Time Spent Provider
 *
 * Implements CSV row CO-003
 * Dashboard Level: Course overview
 * Metric Description: "Total time spent by a student in each course in a given time period"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * @remarks
 * - Returns total duration in seconds per CSV specification
 * - Aggregates result.duration from all learning activities in the course
 * - Filters by userId, courseId, and optional time range
 * - Parses ISO 8601 duration format (e.g., "PT45M30S")
 * - Returns 0 if no duration data found
 * - Stateless: no side effects, no internal state mutation (REQ-FN-004)
 *
 * @implements {IMetricComputation}
 *
 * @example
 * ```typescript
 * const result = await provider.compute(
 *   { userId: 'user-123', courseId: 'course-101' },
 *   statements
 * );
 * console.log(result.value); // 7200 (seconds)
 * console.log(result.metadata); // { unit: 'seconds', activityCount: 15, hours: 2.0 }
 * ```
 */
@Injectable()
export class CourseTimeSpentProvider implements IMetricComputation {
  readonly id = 'course-time-spent';
  readonly dashboardLevel = 'course';
  readonly title = 'Course Time Spent';
  readonly description =
    'Total time spent by a student in each course in a given time period';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'courseId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'scalar' as const;

  readonly example = {
    params: { userId: 'user-123', courseId: 'course-101' },
    result: {
      value: 7200,
      metadata: { unit: 'seconds', activityCount: 15, hours: 2.0 },
    },
  };

  /**
   * Parse ISO 8601 duration to seconds
   * Supports format: PT[hours]H[minutes]M[seconds]S
   *
   * @param duration - ISO 8601 duration string (e.g., "PT1H30M45S", "PT45M", "PT30S")
   * @returns Duration in seconds
   *
   * @example
   * parseDuration("PT1H30M45S") // 5445 seconds
   * parseDuration("PT45M") // 2700 seconds
   * parseDuration("PT30S") // 30 seconds
   */
  private parseDuration(duration: string): number {
    if (!duration || !duration.startsWith('PT')) {
      return 0;
    }

    let seconds = 0;
    const durationStr = duration.substring(2); // Remove 'PT' prefix

    // Parse hours
    const hoursMatch = durationStr.match(/(\d+(?:\.\d+)?)H/);
    if (hoursMatch) {
      seconds += parseFloat(hoursMatch[1]) * 3600;
    }

    // Parse minutes
    const minutesMatch = durationStr.match(/(\d+(?:\.\d+)?)M/);
    if (minutesMatch) {
      seconds += parseFloat(minutesMatch[1]) * 60;
    }

    // Parse seconds
    const secondsMatch = durationStr.match(/(\d+(?:\.\d+)?)S/);
    if (secondsMatch) {
      seconds += parseFloat(secondsMatch[1]);
    }

    return seconds;
  }

  /**
   * Compute the total time spent by a student in a course
   * Aggregates result.duration from all xAPI statements
   *
   * @param params - Must include userId and courseId; optional since/until for time filtering
   * @param lrsData - Array of xAPI statements from the LRS (pre-filtered by courseId and userId)
   * @returns Metric result with total time in seconds and metadata
   *
   * @remarks
   * - Aggregates all result.duration values from statements
   * - Parses ISO 8601 duration format to seconds
   * - Skips statements without duration information
   * - Returns 0 if no duration data found
   * - Metadata includes activity count and formatted hours
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    let totalSeconds = 0;
    let activityCount = 0;

    lrsData.forEach((stmt) => {
      if (stmt.result?.duration) {
        const seconds = this.parseDuration(stmt.result.duration);
        totalSeconds += seconds;
        activityCount++;
      }
    });

    const hours = Math.round((totalSeconds / 3600) * 100) / 100; // Round to 2 decimals

    return Promise.resolve({
      metricId: this.id,
      value: totalSeconds,
      computed: new Date().toISOString(),
      metadata: {
        unit: 'seconds',
        activityCount,
        hours,
        userId: params.userId,
        courseId: params.courseId,
        timeRange: params.since
          ? { since: params.since, until: params.until }
          : undefined,
      },
    });
  }

  /**
   * Validate metric-specific parameters
   * Ensures userId and courseId are provided
   *
   * @param params - Parameters to validate
   * @throws Error if userId or courseId is missing or time range is invalid
   */
  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error(
        'userId is required for course-time-spent metric computation',
      );
    }
    if (!params.courseId) {
      throw new Error(
        'courseId is required for course-time-spent metric computation',
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
