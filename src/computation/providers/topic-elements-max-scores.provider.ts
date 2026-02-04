// Implements REQ-FN-032: CSV v3 metric topic-elements-max-scores
// Returns the configured max score for each element in a topic

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Topic Elements Max Scores Provider
 * Implements CSV v3 metric: topic-elements-max-scores — Returns for each learning
 * element within a specified topic its defined maximum achievable score.
 *
 * @implements IMetricComputation
 */
@Injectable()
export class TopicElementsMaxScoresProvider implements IMetricComputation {
  readonly id = 'topic-elements-max-scores';
  readonly dashboardLevel = 'element';
  readonly title = 'Topic Elements Max Scores';
  readonly description =
    'Returns for each learning element within a specified topic its defined maximum achievable score.';
  readonly version = '3.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'topicId'];
  readonly optionalParams: Array<keyof MetricParams> = [];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', topicId: 'topic-1' },
    result: {
      value: [
        { elementId: 'element-1', score: 100 },
        { elementId: 'element-2', score: 50 },
        { elementId: 'element-3', score: 75 },
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
      if (!this.belongsToTopic(statement, params.topicId!)) return;

      const elementId = statement.object?.id;
      if (!elementId) return;

      const maxScore = statement.result?.score?.max;
      if (maxScore === undefined || maxScore === null) return;

      const currentMax = elements.get(elementId) ?? 0;
      elements.set(elementId, Math.max(currentMax, maxScore));
    });

    const values = Array.from(elements.entries())
      .map(([elementId, score]) => ({
        elementId,
        score,
      }))
      .sort((a, b) => a.elementId.localeCompare(b.elementId));

    return Promise.resolve({
      metricId: this.id,
      value: values,
      computed: new Date().toISOString(),
      metadata: {
        elementCount: values.length,
        userId: params.userId,
        topicId: params.topicId,
      },
    });
  }

  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error(
        'userId is required for topic-elements-max-scores metric',
      );
    }
    if (!params.topicId) {
      throw new Error(
        'topicId is required for topic-elements-max-scores metric',
      );
    }
  }

  private belongsToTopic(statement: xAPIStatement, topicId: string): boolean {
    const contextActivities = statement.context?.contextActivities;
    if (!contextActivities) return false;

    const parents = contextActivities.parent ?? [];

    return parents.some((activity) => {
      const id = activity.id;
      if (!id) return false;
      return (
        id === topicId ||
        id.includes(`/topic/${topicId}`) ||
        id.includes(`/topics/${topicId}`)
      );
    });
  }
}
