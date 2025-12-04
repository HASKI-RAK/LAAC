import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import { DashboardLevel } from '../types/dashboard-level.type';
import {
  ElementTypeCode,
  detectElementType,
} from '../utils/element-type-helpers';
import { parseDuration } from '../utils/duration-helpers';

interface TypeTimeAggregate {
  type: ElementTypeCode;
  totalSeconds: number;
  elementIds: Set<string>;
}

/**
 * Element Type Time Spent Provider
 *
 * - Computes total and average time spent per learning element type
 * - Implements "proportional average for time spent" from Concept 2025
 * - Aggregates result.duration from statements
 */
@Injectable()
export class ElementTypeTimeSpentProvider implements IMetricComputation {
  readonly id = 'element-type-time-spent';
  readonly dashboardLevel: DashboardLevel = 'element';
  readonly title = 'Time Spent per Element Type';
  readonly description =
    'Total and average time spent per learning element type';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId'];
  readonly optionalParams: Array<keyof MetricParams> = [
    'courseId',
    'topicId',
    'since',
    'until',
  ];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123' },
    result: {
      value: [
        {
          type: 'SE',
          totalSeconds: 1200,
          avgSecondsPerElement: 600,
          elementCount: 2,
        },
      ],
      metadata: {
        totalSeconds: 1200,
        typeCount: 1,
      },
    },
  };

  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    this.validateParams(params);

    const durationStatements = lrsData.filter((stmt) => stmt.result?.duration);

    if (durationStatements.length === 0) {
      return Promise.resolve({
        metricId: this.id,
        value: [],
        computed: new Date().toISOString(),
        metadata: {
          totalSeconds: 0,
          typeCount: 0,
          userId: params.userId,
        },
      });
    }

    const aggregates = this.buildAggregates(durationStatements);

    const summaries = aggregates
      .map((agg) => ({
        type: agg.type,
        totalSeconds: agg.totalSeconds,
        elementCount: agg.elementIds.size,
        avgSecondsPerElement:
          agg.elementIds.size > 0
            ? Math.round(agg.totalSeconds / agg.elementIds.size)
            : 0,
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);

    const totalSeconds = summaries.reduce((sum, s) => sum + s.totalSeconds, 0);

    return Promise.resolve({
      metricId: this.id,
      value: summaries,
      computed: new Date().toISOString(),
      metadata: {
        totalSeconds,
        typeCount: summaries.length,
        userId: params.userId,
        courseId: params.courseId,
        topicId: params.topicId,
      },
    });
  }

  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error('userId is required for element-type-time-spent metric');
    }

    if (params.since && params.until) {
      const since = new Date(params.since);
      const until = new Date(params.until);
      if (since > until) {
        throw new Error('since timestamp must be before until timestamp');
      }
    }
  }

  private buildAggregates(statements: xAPIStatement[]): TypeTimeAggregate[] {
    const map = new Map<ElementTypeCode, TypeTimeAggregate>();

    for (const stmt of statements) {
      const type = detectElementType(stmt);
      if (type === 'unknown') continue;

      const duration = parseDuration(stmt.result?.duration || '');
      if (duration <= 0) continue;

      const agg =
        map.get(type) ||
        ({
          type,
          totalSeconds: 0,
          elementIds: new Set<string>(),
        } as TypeTimeAggregate);

      agg.totalSeconds += duration;
      if (stmt.object?.id) {
        agg.elementIds.add(stmt.object.id);
      }

      map.set(type, agg);
    }

    return Array.from(map.values());
  }
}
