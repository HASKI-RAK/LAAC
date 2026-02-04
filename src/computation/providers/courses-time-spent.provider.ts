// Implements REQ-FN-032: CSV v3 metric courses-time-spent
// Calculates, per course, the total time spent across all attempts of all elements

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import { parseDuration } from '../utils/duration-helpers';
import { extractCourseIds } from '../utils/course-helpers';

/**
 * Courses Time Spent Provider
 * Implements CSV v3 metric: courses-time-spent — Calculates, per course, the total
 * time spent by the user across all attempts of all learning elements in that course.
 *
 * @implements IMetricComputation
 */
@Injectable()
export class CoursesTimeSpentProvider implements IMetricComputation {
  readonly id = 'courses-time-spent';
  readonly dashboardLevel = 'course';
  readonly title = 'Courses Time Spent';
  readonly description =
    'Calculates, per course, the total time spent by the user across all attempts of all learning elements in that course, optionally limited to a specified time range.';
  readonly version = '3.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123' },
    result: {
      value: [
        { courseId: 'course-1', timeSpent: 3600 },
        { courseId: 'course-2', timeSpent: 1800 },
      ],
    },
  };

  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    const courses = new Map<string, number>();

    lrsData.forEach((statement) => {
      const courseIds = extractCourseIds(statement);
      if (courseIds.length === 0) return;

      const duration = statement.result?.duration;
      if (!duration) return;

      const seconds = parseDuration(duration);
      if (seconds <= 0 || seconds > 86400) return; // Skip invalid or > 24h

      courseIds.forEach((courseId) => {
        const currentTime = courses.get(courseId) ?? 0;
        courses.set(courseId, currentTime + seconds);
      });
    });

    const values = Array.from(courses.entries())
      .map(([courseId, timeSpent]) => ({
        courseId,
        timeSpent: Math.round(timeSpent),
      }))
      .sort((a, b) => a.courseId.localeCompare(b.courseId));

    return Promise.resolve({
      metricId: this.id,
      value: values,
      computed: new Date().toISOString(),
      metadata: {
        courseCount: values.length,
        userId: params.userId,
        unit: 'seconds',
        timeRange: params.since
          ? { since: params.since, until: params.until }
          : undefined,
      },
    });
  }

  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error('userId is required for courses-time-spent metric');
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
