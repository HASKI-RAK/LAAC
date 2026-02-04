// Implements REQ-FN-032: CSV v3 metric user-last-elements
// Returns the three most recently completed learning elements across all courses

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import { isCompleted } from '../utils/attempt-helpers';

/**
 * User Last Elements Provider
 * Implements CSV v3 metric: user-last-elements — Returns the three most recently
 * completed learning elements by the user across all courses, ordered by completion
 * time descending.
 *
 * @implements IMetricComputation
 */
@Injectable()
export class UserLastElementsProvider implements IMetricComputation {
  readonly id = 'user-last-elements';
  readonly dashboardLevel = 'course'; // User-level but displays at course dashboard
  readonly title = 'User Last Elements';
  readonly description =
    'Returns the three most recently completed learning elements by the user across all courses, ordered by completion time descending and optionally filtered by a specified time range.';
  readonly version = '3.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId'];
  readonly optionalParams: Array<keyof MetricParams> = ['since', 'until'];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123' },
    result: {
      value: [
        { elementId: 'element-1', completedAt: '2026-02-04T12:00:00Z' },
        { elementId: 'element-2', completedAt: '2026-02-03T15:30:00Z' },
        { elementId: 'element-3', completedAt: '2026-02-02T09:00:00Z' },
      ],
    },
  };

  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    // Find all completed statements and track latest completion per element
    const elementCompletions = new Map<string, string>();

    lrsData.forEach((statement) => {
      if (!isCompleted(statement)) return;

      const elementId = statement.object?.id;
      if (!elementId) return;

      const timestamp = statement.timestamp;
      if (!timestamp) return;

      const existingTimestamp = elementCompletions.get(elementId);
      if (
        !existingTimestamp ||
        new Date(timestamp) > new Date(existingTimestamp)
      ) {
        elementCompletions.set(elementId, timestamp);
      }
    });

    // Convert to array, sort by completion time descending, take top 3
    const values = Array.from(elementCompletions.entries())
      .map(([elementId, completedAt]) => ({ elementId, completedAt }))
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      )
      .slice(0, 3);

    return Promise.resolve({
      metricId: this.id,
      value: values,
      computed: new Date().toISOString(),
      metadata: {
        totalCompletedElements: elementCompletions.size,
        returnedCount: values.length,
        userId: params.userId,
        timeRange: params.since
          ? { since: params.since, until: params.until }
          : undefined,
      },
    });
  }

  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error('userId is required for user-last-elements metric');
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
