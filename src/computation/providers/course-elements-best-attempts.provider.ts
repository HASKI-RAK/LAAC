// Implements REQ-FN-032: CSV v4 metric course-elements-best-attempts
// For each element in a course, returns best attempt score, completion status, and timestamp

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import {
  selectBestAttempt,
  extractScore,
  isCompleted,
} from '../utils/attempt-helpers';

/**
 * Course Elements Best Attempts Provider
 * Implements CSV v4 metric: course-elements-best-attempts — For each learning element
 * within a specified course, selects the user's highest-scoring attempt and returns
 * its score, completion status, and completion timestamp.
 *
 * @implements IMetricComputation
 */
@Injectable()
export class CourseElementsBestAttemptsProvider implements IMetricComputation {
  readonly id = 'course-elements-best-attempts';
  readonly dashboardLevel = 'element';
  readonly title = 'Course Elements Best Attempts';
  readonly description =
    "For each learning element within a specified course, selects the user's highest-scoring attempt and returns its score, completion status, and completion timestamp.";
  readonly version = '4.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'courseId'];
  readonly optionalParams: Array<keyof MetricParams> = [];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', courseId: 'course-1' },
    result: {
      value: [
        {
          elementId: 'element-1',
          score: 85,
          completionStatus: true,
          completedAt: '2026-02-04T12:00:00Z',
        },
        {
          elementId: 'element-2',
          score: 72,
          completionStatus: true,
          completedAt: '2026-02-03T15:30:00Z',
        },
        {
          elementId: 'element-3',
          score: null,
          completionStatus: false,
          completedAt: null,
        },
      ],
    },
  };

  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    // Group statements by element
    const elements = new Map<string, xAPIStatement[]>();

    lrsData.forEach((statement) => {
      const elementId = statement.object?.id;
      if (!elementId) return;

      const attempts = elements.get(elementId) ?? [];
      attempts.push(statement);
      elements.set(elementId, attempts);
    });

    const values = Array.from(elements.entries())
      .map(([elementId, statements]) => {
        const bestAttempt = selectBestAttempt(statements);

        let score: number | null = null;
        let completionStatus: boolean | null = null;
        let completedAt: string | null = null;

        if (bestAttempt) {
          score = extractScore(bestAttempt);
          completionStatus = isCompleted(bestAttempt);

          // Find completion timestamp from completed statements
          const completedStatement = statements.find((s) => isCompleted(s));
          if (completedStatement?.timestamp) {
            completedAt = completedStatement.timestamp;
          }
        }

        return {
          elementId,
          score,
          completionStatus,
          completedAt,
        };
      })
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
        'userId is required for course-elements-best-attempts metric',
      );
    }
    if (!params.courseId) {
      throw new Error(
        'courseId is required for course-elements-best-attempts metric',
      );
    }
  }
}
