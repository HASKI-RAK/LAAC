// Implements REQ-FN-032: CSV v4 metric course-elements-max-scores
// Returns the configured max score for each element in a course

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Course Elements Max Scores Provider
 * Implements CSV v4 metric: course-elements-max-scores — Returns for each learning
 * element within a specified course its defined maximum achievable score.
 *
 * @implements IMetricComputation
 */
@Injectable()
export class CourseElementsMaxScoresProvider implements IMetricComputation {
  readonly id = 'course-elements-max-scores';
  readonly dashboardLevel = 'element';
  readonly title = 'Course Elements Max Scores';
  readonly description =
    'Returns for each learning element within a specified course its defined maximum achievable score.';
  readonly version = '4.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'courseId'];
  readonly optionalParams: Array<keyof MetricParams> = [];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', courseId: 'course-1' },
    result: {
      value: [
        { elementId: 'element-1', maxScore: 100 },
        { elementId: 'element-2', maxScore: 50 },
        { elementId: 'element-3', maxScore: 75 },
      ],
    },
  };

  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    // Track max score for each element
    const elements = new Map<string, number>();

    lrsData.forEach((statement) => {
      const elementId = statement.object?.id;
      if (!elementId) return;

      const maxScore = statement.result?.score?.max;
      if (maxScore === undefined || maxScore === null) return;

      const currentMax = elements.get(elementId) ?? 0;
      elements.set(elementId, Math.max(currentMax, maxScore));
    });

    const values = Array.from(elements.entries())
      .map(([elementId, maxScore]) => ({
        elementId,
        maxScore,
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
      },
    });
  }

  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error(
        'userId is required for course-elements-max-scores metric',
      );
    }
    if (!params.courseId) {
      throw new Error(
        'courseId is required for course-elements-max-scores metric',
      );
    }
  }
}
