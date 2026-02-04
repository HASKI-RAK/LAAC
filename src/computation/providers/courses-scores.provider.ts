// Implements REQ-FN-032: CSV v3 metric courses-scores
// Calculates, per course, the sum of the highest score achieved by the user for each learning element

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import { selectBestAttempt, extractScore } from '../utils/attempt-helpers';

/**
 * Courses Scores Provider
 * Implements CSV v3 metric: courses-scores — Calculates, per course, the sum of
 * the highest score achieved by the user for each learning element in that course.
 *
 * @implements IMetricComputation
 */
@Injectable()
export class CoursesScoresProvider implements IMetricComputation {
  readonly id = 'courses-scores';
  readonly dashboardLevel = 'course';
  readonly title = 'Courses Scores';
  readonly description =
    'Calculates, per course, the sum of the highest score achieved by the user for each learning element in that course, optionally limited to a specified time range.';
  readonly version = '3.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123' },
    result: {
      value: [
        { courseId: 'course-1', score: 180 },
        { courseId: 'course-2', score: 95 },
      ],
    },
  };

  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    const courses = new Map<string, Map<string, xAPIStatement[]>>();

    lrsData.forEach((statement) => {
      const courseIds = this.extractCourseIds(statement);
      if (courseIds.length === 0) return;

      const elementId = statement.object?.id;
      if (!elementId) return;

      courseIds.forEach((courseId) => {
        const elementsForCourse =
          courses.get(courseId) ?? new Map<string, xAPIStatement[]>();
        const attempts = elementsForCourse.get(elementId) ?? [];
        attempts.push(statement);
        elementsForCourse.set(elementId, attempts);
        courses.set(courseId, elementsForCourse);
      });
    });

    const values = Array.from(courses.entries())
      .map(([courseId, elementStatements]) => {
        let score = 0;
        let scoredElementCount = 0;

        elementStatements.forEach((statements) => {
          const bestAttempt = selectBestAttempt(statements);
          const elementScore = bestAttempt ? extractScore(bestAttempt) : null;

          if (elementScore !== null) {
            score += elementScore;
            scoredElementCount += 1;
          }
        });

        return { courseId, score, elementCount: scoredElementCount };
      })
      .sort((a, b) => a.courseId.localeCompare(b.courseId));

    return Promise.resolve({
      metricId: this.id,
      value: values.map(({ courseId, score }) => ({
        courseId,
        score,
      })),
      computed: new Date().toISOString(),
      metadata: {
        courseCount: values.length,
        userId: params.userId,
        timeRange: params.since
          ? { since: params.since, until: params.until }
          : undefined,
      },
    });
  }

  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error('userId is required for courses-scores metric');
    }

    if (params.since && params.until) {
      const since = new Date(params.since);
      const until = new Date(params.until);

      if (since > until) {
        throw new Error('since timestamp must be before until timestamp');
      }
    }
  }

  private extractCourseIds(statement: xAPIStatement): string[] {
    const contextActivities = statement.context?.contextActivities;
    if (!contextActivities) return [];

    const ids = new Set<string>();
    const parents = contextActivities.parent ?? [];
    const groupings = contextActivities.grouping ?? [];

    parents.forEach((parent) => this.maybeAddCourseId(ids, parent.id));
    groupings.forEach((grouping) => this.maybeAddCourseId(ids, grouping.id));

    return Array.from(ids);
  }

  private maybeAddCourseId(target: Set<string>, id?: string): void {
    if (!id) return;

    const parsed = this.parseCourseId(id);
    if (parsed) {
      target.add(parsed);
    }
  }

  private parseCourseId(id: string): string | null {
    if (!id) return null;

    if (id.includes('/course/')) {
      const [, course] = id.split('/course/');
      return course || null;
    }

    if (id.includes('/courses/')) {
      const [, course] = id.split('/courses/');
      return course || null;
    }

    return id;
  }
}
