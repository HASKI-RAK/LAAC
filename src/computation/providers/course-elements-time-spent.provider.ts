// Implements REQ-FN-032: CSV v4 metric course-elements-time-spent
// Calculates, for each element in a course, the total time spent across all attempts

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import { parseDuration } from '../utils/duration-helpers';

/**
 * Course Elements Time Spent Provider
 * Implements CSV v4 metric: course-elements-time-spent — Calculates, for each learning
 * element within a specified course, the total time spent by the user across all attempts.
 *
 * @implements IMetricComputation
 */
@Injectable()
export class CourseElementsTimeSpentProvider implements IMetricComputation {
  readonly id = 'course-elements-time-spent';
  readonly dashboardLevel = 'element';
  readonly title = 'Course Elements Time Spent';
  readonly description =
    'Calculates, for each learning element within a specified course, the total time spent by the user across all attempts, optionally limited to a specified time range.';
  readonly version = '4.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'courseId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', courseId: 'course-1' },
    result: {
      value: [
        { elementId: 'element-1', timeSpent: 1200 },
        { elementId: 'element-2', timeSpent: 600 },
        { elementId: 'element-3', timeSpent: 900 },
      ],
    },
  };

  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    const elements = new Map<string, number>();

    lrsData.forEach((statement) => {
      const elementId = statement.object?.id;
      if (!elementId) return;

      const duration = statement.result?.duration;
      if (!duration) return;

      const seconds = parseDuration(duration);
      if (seconds <= 0 || seconds > 86400) return; // Skip invalid or > 24h

      const currentTime = elements.get(elementId) ?? 0;
      elements.set(elementId, currentTime + seconds);
    });

    const values = Array.from(elements.entries())
      .map(([elementId, timeSpent]) => ({
        elementId,
        timeSpent: Math.round(timeSpent),
      }))
      .sort((a, b) => a.elementId.localeCompare(b.elementId));

    return Promise.resolve({
      metricId: this.id,
      value: values,
      computed: new Date().toISOString(),
      metadata: {
        elementCount: values.length,
        userId: params.userId,
        courseId: params.courseId,
        unit: 'seconds',
        timeRange: params.since
          ? { since: params.since, until: params.until }
          : undefined,
      },
    });
  }

  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error(
        'userId is required for course-elements-time-spent metric',
      );
    }
    if (!params.courseId) {
      throw new Error(
        'courseId is required for course-elements-time-spent metric',
      );
    }

    if (params.since && params.until) {
      const since = new Date(params.since);
      const until = new Date(params.until);

      if (since > until) {
        throw new Error('since timestamp must be before until timestamp');
      }
    }
  }
}
