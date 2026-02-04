// Implements REQ-FN-032: CSV v3 metric course-topics-time-spent
// Calculates, per topic within a course, the total time spent across all attempts

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import { parseDuration } from '../utils/duration-helpers';

/**
 * Course Topics Time Spent Provider
 * Implements CSV v3 metric: course-topics-time-spent — Calculates, per topic within
 * a given course, the total time spent by the user across all attempts of all
 * learning elements in that topic.
 *
 * @implements IMetricComputation
 */
@Injectable()
export class CourseTopicsTimeSpentProvider implements IMetricComputation {
  readonly id = 'course-topics-time-spent';
  readonly dashboardLevel = 'topic';
  readonly title = 'Course Topics Time Spent';
  readonly description =
    'Calculates, per topic within a given course, the total time spent by the user across all attempts of all learning elements in that topic, optionally limited to a specified time range.';
  readonly version = '3.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId', 'courseId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', courseId: 'course-1' },
    result: {
      value: [
        { topicId: 'topic-1', timeSpent: 1800 },
        { topicId: 'topic-2', timeSpent: 2400 },
      ],
    },
  };

  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    const topics = new Map<string, number>();

    lrsData.forEach((statement) => {
      if (!this.belongsToCourse(statement, params.courseId!)) return;

      const topicIds = this.extractTopicIds(statement);
      if (topicIds.length === 0) return;

      const duration = statement.result?.duration;
      if (!duration) return;

      const seconds = parseDuration(duration);
      if (seconds <= 0 || seconds > 86400) return; // Skip invalid or > 24h

      topicIds.forEach((topicId) => {
        const currentTime = topics.get(topicId) ?? 0;
        topics.set(topicId, currentTime + seconds);
      });
    });

    const values = Array.from(topics.entries())
      .map(([topicId, timeSpent]) => ({
        topicId,
        timeSpent: Math.round(timeSpent),
      }))
      .sort((a, b) => a.topicId.localeCompare(b.topicId));

    return Promise.resolve({
      metricId: this.id,
      value: values,
      computed: new Date().toISOString(),
      metadata: {
        topicCount: values.length,
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
      throw new Error('userId is required for course-topics-time-spent metric');
    }
    if (!params.courseId) {
      throw new Error(
        'courseId is required for course-topics-time-spent metric',
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
