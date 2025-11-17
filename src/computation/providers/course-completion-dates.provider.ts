// Implements REQ-FN-004: CSV Row CO-005
// Returns completion dates of the last three learning elements completed in a course

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Course Completion Dates Provider
 *
 * Implements CSV row CO-005
 * Dashboard Level: Course overview
 * Metric Description: "Completion date of the last three learning elements of any course completed by a student"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * @remarks
 * - Returns array of ISO 8601 timestamps for last 3 completions
 * - Orders by completion timestamp (most recent first)
 * - Filters by userId, courseId, and optional time range
 * - Returns fewer than 3 dates if not enough completions exist
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
 * console.log(result.value); // ['2025-11-15T10:00:00Z', '2025-11-14T09:30:00Z', '2025-11-13T14:20:00Z']
 * ```
 */
@Injectable()
export class CourseCompletionDatesProvider implements IMetricComputation {
  readonly id = 'course-completion-dates';
  readonly dashboardLevel = 'course';
  readonly title = 'Course Completion Dates';
  readonly description =
    'Completion date of the last three learning elements of any course completed by a student';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'courseId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', courseId: 'course-101' },
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
   * Compute the completion dates of the last three learning elements in a course
   * Filters completion statements and returns most recent three timestamps
   *
   * @param params - Must include userId and courseId; optional since/until for time filtering
   * @param lrsData - Array of xAPI statements from the LRS (pre-filtered by courseId and userId)
   * @returns Metric result with array of last 3 completion dates (ISO 8601 strings) and metadata
   *
   * @remarks
   * - Searches for completion verbs: completed, passed
   * - Orders by timestamp descending (most recent first)
   * - Returns up to 3 dates (may be fewer if insufficient completions)
   * - All dates are ISO 8601 formatted strings
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

    // Filter completion statements and extract timestamps
    const completionDates = lrsData
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
    const lastThreeDates = completionDates.slice(0, 3);

    return Promise.resolve({
      metricId: this.id,
      value: lastThreeDates,
      computed: new Date().toISOString(),
      metadata: {
        count: lastThreeDates.length,
        totalCompletions: completionDates.length,
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
        'userId is required for course-completion-dates metric computation',
      );
    }
    if (!params.courseId) {
      throw new Error(
        'courseId is required for course-completion-dates metric computation',
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
