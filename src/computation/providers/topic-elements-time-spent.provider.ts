// Implements REQ-FN-032: CSV v3 metric topic-elements-time-spent
// Calculates, for each element in a topic, the total time spent across all attempts

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import { parseDuration } from '../utils/duration-helpers';

/**
 * Topic Elements Time Spent Provider
 * Implements CSV v3 metric: topic-elements-time-spent — Calculates, for each learning
 * element within a specified topic, the total time spent by the user across all attempts.
 *
 * @implements IMetricComputation
 */
@Injectable()
export class TopicElementsTimeSpentProvider implements IMetricComputation {
  readonly id = 'topic-elements-time-spent';
  readonly dashboardLevel = 'element';
  readonly title = 'Topic Elements Time Spent';
  readonly description =
    'Calculates, for each learning element within a specified topic, the total time spent by the user across all attempts, optionally limited to a specified time range.';
  readonly version = '3.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'topicId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', topicId: 'topic-1' },
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
      if (!this.belongsToTopic(statement, params.topicId!)) return;

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
        topicId: params.topicId,
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
        'userId is required for topic-elements-time-spent metric',
      );
    }
    if (!params.topicId) {
      throw new Error(
        'topicId is required for topic-elements-time-spent metric',
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
