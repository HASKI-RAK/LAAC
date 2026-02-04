// Implements REQ-FN-032: CSV v3 metric course-topics-scores
// Calculates, per topic within a course, the sum of best-attempt scores per element

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import { selectBestAttempt, extractScore } from '../utils/attempt-helpers';

/**
 * Course Topics Scores Provider
 * Implements CSV v3 metric: course-topics-scores — Calculates, per topic within a
 * given course, the sum of the highest score achieved by the user for each learning
 * element in that topic.
 *
 * @implements IMetricComputation
 */
@Injectable()
export class CourseTopicsScoresProvider implements IMetricComputation {
  readonly id = 'course-topics-scores';
  readonly dashboardLevel = 'topic';
  readonly title = 'Course Topics Scores';
  readonly description =
    'Calculates, per topic within a given course, the sum of the highest score achieved by the user for each learning element in that topic, optionally limited to a specified time range.';
  readonly version = '3.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'courseId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', courseId: 'course-1' },
    result: {
      value: [
        { topicId: 'topic-1', score: 85 },
        { topicId: 'topic-2', score: 72 },
      ],
    },
  };

  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    // Filter statements by course and group by topic and element
    const topics = new Map<string, Map<string, xAPIStatement[]>>();

    lrsData.forEach((statement) => {
      if (!this.belongsToCourse(statement, params.courseId!)) return;

      const topicIds = this.extractTopicIds(statement);
      if (topicIds.length === 0) return;

      const elementId = statement.object?.id;
      if (!elementId) return;

      topicIds.forEach((topicId) => {
        const elementsForTopic =
          topics.get(topicId) ?? new Map<string, xAPIStatement[]>();
        const attempts = elementsForTopic.get(elementId) ?? [];
        attempts.push(statement);
        elementsForTopic.set(elementId, attempts);
        topics.set(topicId, elementsForTopic);
      });
    });

    const values = Array.from(topics.entries())
      .map(([topicId, elementStatements]) => {
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

        return { topicId, score, elementCount: scoredElementCount };
      })
      .sort((a, b) => a.topicId.localeCompare(b.topicId));

    return Promise.resolve({
      metricId: this.id,
      value: values.map(({ topicId, score }) => ({
        topicId,
        score,
      })),
      computed: new Date().toISOString(),
      metadata: {
        topicCount: values.length,
        userId: params.userId,
        courseId: params.courseId,
        timeRange: params.since
          ? { since: params.since, until: params.until }
          : undefined,
      },
    });
  }

  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error('userId is required for course-topics-scores metric');
    }
    if (!params.courseId) {
      throw new Error('courseId is required for course-topics-scores metric');
    }

    if (params.since && params.until) {
      const since = new Date(params.since);
      const until = new Date(params.until);

      if (since > until) {
        throw new Error('since timestamp must be before until timestamp');
      }
    }
  }

  private belongsToCourse(statement: xAPIStatement, courseId: string): boolean {
    const contextActivities = statement.context?.contextActivities;
    if (!contextActivities) return false;

    const parents = contextActivities.parent ?? [];
    const groupings = contextActivities.grouping ?? [];

    const allActivities = [...parents, ...groupings];
    return allActivities.some((activity) => {
      const id = activity.id;
      if (!id) return false;
      return (
        id === courseId ||
        id.includes(`/course/${courseId}`) ||
        id.includes(`/courses/${courseId}`)
      );
    });
  }

  private extractTopicIds(statement: xAPIStatement): string[] {
    const contextActivities = statement.context?.contextActivities;
    if (!contextActivities) return [];

    const ids = new Set<string>();
    const parents = contextActivities.parent ?? [];

    parents.forEach((parent) => {
      const id = parent.id;
      if (!id) return;

      // Topic IDs typically contain /topic/ or /topics/
      if (id.includes('/topic/') || id.includes('/topics/')) {
        const parsed = this.parseTopicId(id);
        if (parsed) ids.add(parsed);
      }
    });

    return Array.from(ids);
  }

  private parseTopicId(id: string): string | null {
    if (!id) return null;

    if (id.includes('/topic/')) {
      const [, topic] = id.split('/topic/');
      return topic || null;
    }

    if (id.includes('/topics/')) {
      const [, topic] = id.split('/topics/');
      return topic || null;
    }

    return id;
  }
}
