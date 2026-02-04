// Implements REQ-FN-032: CSV v3 metric course-topics-max-scores
// Calculates, per topic within a course, the sum of configured max scores for all elements

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import { extractCourseIds, matchesCourse } from '../utils/course-helpers';
import {
  extractTopicIds,
  extractCourseIdFromTopicUrl,
} from '../utils/topic-helpers';

/**
 * Course Topics Max Scores Provider
 * Implements CSV v3 metric: course-topics-max-scores — Calculates, per topic within
 * a given course, the maximum possible score, defined as the sum of the defined
 * maximum scores configured for all learning elements in that topic.
 *
 * @implements IMetricComputation
 */
@Injectable()
export class CourseTopicsMaxScoresProvider implements IMetricComputation {
  readonly id = 'course-topics-max-scores';
  readonly dashboardLevel = 'topic';
  readonly title = 'Course Topics Max Scores';
  readonly description =
    'Calculates, per topic within a given course, the maximum possible score, defined as the sum of the defined maximum scores configured for all learning elements in that topic.';
  readonly version = '3.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'courseId'];
  readonly optionalParams: Array<keyof MetricParams> = [];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', courseId: 'course-1' },
    result: {
      value: [
        { topicId: 'topic-1', maxScore: 100 },
        { topicId: 'topic-2', maxScore: 150 },
      ],
    },
  };

  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    // Group statements by topic and element, tracking max scores
    const topics = new Map<string, Map<string, number>>();

    lrsData.forEach((statement) => {
      if (!this.belongsToCourse(statement, params.courseId!)) return;

      const topicIds = extractTopicIds(statement);
      if (topicIds.length === 0) return;

      const elementId = statement.object?.id;
      if (!elementId) return;

      const maxScore = statement.result?.score?.max;
      if (maxScore === undefined || maxScore === null) return;

      topicIds.forEach((topicId) => {
        const elementsForTopic =
          topics.get(topicId) ?? new Map<string, number>();

        const currentMax = elementsForTopic.get(elementId) ?? 0;
        elementsForTopic.set(elementId, Math.max(currentMax, maxScore));
        topics.set(topicId, elementsForTopic);
      });
    });

    const values = Array.from(topics.entries())
      .map(([topicId, elementMaxScores]) => {
        let maxScore = 0;
        elementMaxScores.forEach((score) => {
          maxScore += score;
        });

        return { topicId, maxScore, elementCount: elementMaxScores.size };
      })
      .sort((a, b) => a.topicId.localeCompare(b.topicId));

    return Promise.resolve({
      metricId: this.id,
      value: values.map(({ topicId, maxScore }) => ({
        topicId,
        maxScore,
      })),
      computed: new Date().toISOString(),
      metadata: {
        topicCount: values.length,
        userId: params.userId,
        courseId: params.courseId,
      },
    });
  }

  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error('userId is required for course-topics-max-scores metric');
    }
    if (!params.courseId) {
      throw new Error(
        'courseId is required for course-topics-max-scores metric',
      );
    }
  }

  private belongsToCourse(statement: xAPIStatement, courseId: string): boolean {
    // Check if the statement has course context that matches the target course
    const courseIds = extractCourseIds(statement);

    // Direct course match from context activities
    if (courseIds.some((id) => matchesCourse(id, courseId))) {
      return true;
    }

    // For Frontend statements, check if topics are within the target course
    // Topic URLs contain the course ID: /course/{courseId}/topic/{topicId}
    const topicIds = extractTopicIds(statement);
    for (const topicId of topicIds) {
      const topicCourseId = extractCourseIdFromTopicUrl(topicId);
      if (topicCourseId && matchesCourse(topicCourseId, courseId)) {
        return true;
      }
    }

    return false;
  }
}
