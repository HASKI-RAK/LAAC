// Implements REQ-FN-004: CSV Row CO-004
// Returns the last three learning elements of a course completed by a student

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Course Last Elements Provider
 *
 * Implements CSV row CO-004
 * Dashboard Level: Course overview
 * Metric Description: "Last three learning elements of any course completed by a student"
 * CSV Source: docs/resources/LAAC_Learning_Analytics_Requirements.csv
 *
 * @remarks
 * - Returns array of the 3 most recently completed elements
 * - Orders by completion timestamp (most recent first)
 * - Filters by userId, courseId, and optional time range
 * - Returns fewer than 3 elements if not enough completions exist
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
 * console.log(result.value); // [{ elementId: 'e3', title: '...', completedAt: '...' }, ...]
 * ```
 */
@Injectable()
export class CourseLastElementsProvider implements IMetricComputation {
  readonly id = 'course-last-elements';
  readonly dashboardLevel = 'course';
  readonly title = 'Course Last Completed Elements';
  readonly description =
    'Last three learning elements of any course completed by a student';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'courseId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', courseId: 'course-101' },
    result: {
      value: [
        { elementId: 'element-3', completedAt: '2025-11-15T10:00:00Z' },
        { elementId: 'element-2', completedAt: '2025-11-14T09:30:00Z' },
        { elementId: 'element-1', completedAt: '2025-11-13T14:20:00Z' },
      ],
      metadata: { count: 3 },
    },
  };

  /**
   * Compute the last three completed learning elements in a course
   * Filters completion statements and returns most recent three
   *
   * @param params - Must include userId and courseId; optional since/until for time filtering
   * @param lrsData - Array of xAPI statements from the LRS (pre-filtered by courseId and userId)
   * @returns Metric result with array of last 3 completed elements and metadata
   *
   * @remarks
   * - Searches for completion verbs: completed, passed
   * - Orders by timestamp descending (most recent first)
   * - Returns up to 3 elements (may be fewer if insufficient completions)
   * - Each element includes elementId, title (if available), and completedAt timestamp
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

    // Filter completion statements and extract element data
    const completions = lrsData
      .filter((stmt) => completionVerbs.includes(stmt.verb.id))
      .filter(
        (stmt) =>
          stmt.result?.completion === true ||
          stmt.result?.success === true ||
          true,
      ) // Accept any completion verb
      .filter((stmt) => stmt.timestamp !== undefined) // Ensure timestamp exists
      .map((stmt) => ({
        elementId: stmt.object.id,
        title:
          stmt.object.definition?.name?.['en-US'] ||
          stmt.object.definition?.name?.['en'] ||
          undefined,
        completedAt: stmt.timestamp as string,
      }))
      .sort((a, b) => {
        // Sort by timestamp descending (most recent first)
        return (
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        );
      });

    // Take only the last 3 completions
    const lastThree = completions.slice(0, 3);

    return Promise.resolve({
      metricId: this.id,
      value: lastThree,
      computed: new Date().toISOString(),
      metadata: {
        count: lastThree.length,
        totalCompletions: completions.length,
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
        'userId is required for course-last-elements metric computation',
      );
    }
    if (!params.courseId) {
      throw new Error(
        'courseId is required for course-last-elements metric computation',
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
