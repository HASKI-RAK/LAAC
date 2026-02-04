// Implements REQ-FN-032: CSV v3 metric courses-max-scores
// Calculates, per course, the maximum possible score (sum of max scores for all elements)

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Courses Max Scores Provider
 * Implements CSV v3 metric: courses-max-scores — Calculates, per course, the maximum
 * possible score, defined as the sum of the defined maximum scores configured for
 * all learning elements belonging to that course.
 *
 * @implements IMetricComputation
 */
@Injectable()
export class CoursesMaxScoresProvider implements IMetricComputation {
  readonly id = 'courses-max-scores';
  readonly dashboardLevel = 'course';
  readonly title = 'Courses Max Scores';
  readonly description =
    'Calculates, per course, the maximum possible score, defined as the sum of the defined maximum scores configured for all learning elements belonging to that course.';
  readonly version = '3.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId'];
  readonly optionalParams: Array<keyof MetricParams> = [];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123' },
    result: {
      value: [
        { courseId: 'course-1', maxScore: 300 },
        { courseId: 'course-2', maxScore: 200 },
      ],
    },
  };

  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    // Group statements by course and element, tracking max scores
    const courses = new Map<string, Map<string, number>>();

    lrsData.forEach((statement) => {
      const courseIds = this.extractCourseIds(statement);
      if (courseIds.length === 0) return;

      const elementId = statement.object?.id;
      if (!elementId) return;

      const maxScore = statement.result?.score?.max;
      if (maxScore === undefined || maxScore === null) return;

      courseIds.forEach((courseId) => {
        const elementsForCourse =
          courses.get(courseId) ?? new Map<string, number>();

        // Track the max score for each element (use highest if multiple statements)
        const currentMax = elementsForCourse.get(elementId) ?? 0;
        elementsForCourse.set(elementId, Math.max(currentMax, maxScore));
        courses.set(courseId, elementsForCourse);
      });
    });

    const values = Array.from(courses.entries())
      .map(([courseId, elementMaxScores]) => {
        let maxScore = 0;
        elementMaxScores.forEach((score) => {
          maxScore += score;
        });

        return { courseId, maxScore, elementCount: elementMaxScores.size };
      })
      .sort((a, b) => a.courseId.localeCompare(b.courseId));

    return Promise.resolve({
      metricId: this.id,
      value: values.map(({ courseId, maxScore }) => ({
        courseId,
        maxScore,
      })),
      computed: new Date().toISOString(),
      metadata: {
        courseCount: values.length,
        userId: params.userId,
      },
    });
  }

  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error('userId is required for courses-max-scores metric');
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
