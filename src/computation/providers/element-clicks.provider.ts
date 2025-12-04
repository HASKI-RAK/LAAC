import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';
import { DashboardLevel } from '../types/dashboard-level.type';

type ElementTypeCode =
  | 'CT'
  | 'CO'
  | 'RQ'
  | 'SE'
  | 'FO'
  | 'RM'
  | 'AN'
  | 'EC'
  | 'EX'
  | 'RA'
  | 'CC'
  | 'AS'
  | 'unknown';

interface TypeAggregate {
  type: ElementTypeCode;
  clickCount: number;
  firstAccessAt: string;
  elementIds: Set<string>;
  weight?: number;
  sequence?: number;
  dimensionScore?: number;
}

/**
 * Element Clicks Metric Provider
 *
 * - Counts clicks (opening of learning elements) per element type
 * - Applies sequence-based priority weighting (earliest accessed types rank higher)
 * - Each click contributes 5 points, then weighted; capped at 50 per type
 * - Commentary (CT) and Content Object (CO) are fixed in the first two positions:
 *   CO = highestOther + 3, CT = highestOther + 6 (both capped at 50)
 */
@Injectable()
export class ElementClicksProvider implements IMetricComputation {
  readonly id = 'element-clicks';
  readonly dashboardLevel: DashboardLevel = 'element';
  readonly title = 'Learning Element Clicks';
  readonly description =
    'Click counts per learning element type with sequence weighting';
  readonly version = '1.0.0';
  readonly requiredParams: Array<keyof MetricParams> = ['userId'];
  readonly optionalParams: Array<keyof MetricParams> = [
    'courseId',
    'topicId',
    'elementId',
    'since',
    'until',
  ];
  readonly outputType = 'array' as const;

  readonly example = {
    params: { userId: 'user-123', courseId: 'course-42' },
    result: {
      value: [
        {
          type: 'CT',
          clickCount: 1,
          sequence: 1,
          weight: 1.5,
          dimensionScore: 19.5,
          firstAccessAt: '2025-11-15T10:00:00Z',
          avgClicksPerElement: 1,
        },
      ],
      metadata: {
        totalClicks: 1,
        typeCount: 1,
      },
    },
  };

  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    this.validateParams(params);

    const clickVerbs = [
      'https://wiki.haski.app/variables/xapi.clicked',
      'https://wiki.haski.app/variables/services.clicked',
      'http://activitystrea.ms/schema/1.0/open',
      'http://activitystrea.ms/schema/1.0/view',
      'https://wiki.haski.app/answered', // Added based on LRS inspection
      'https://wiki.haski.app/viewed', // Added based on LRS inspection
    ];

    const clickStatements = lrsData.filter(
      (stmt) => stmt.verb && clickVerbs.includes(stmt.verb.id),
    );

    if (clickStatements.length === 0) {
      return Promise.resolve({
        metricId: this.id,
        value: [],
        computed: new Date().toISOString(),
        metadata: {
          totalClicks: 0,
          typeCount: 0,
          userId: params.userId,
          courseId: params.courseId,
          topicId: params.topicId,
        },
      });
    }

    const aggregates = this.buildAggregates(clickStatements);

    // Reserve first two slots for CT and CO when present
    let nextSequence = 1;
    const commentary = aggregates.find((a) => a.type === 'CT');
    if (commentary) {
      commentary.sequence = 1;
      // Weight for fixed items is not strictly defined by formula but we can assign 1.5 or ignore
      commentary.weight = 1.5;
      nextSequence = 2;
    }

    const contentObject = aggregates.find((a) => a.type === 'CO');
    if (contentObject) {
      contentObject.sequence = commentary ? 2 : 1;
      contentObject.weight = 1.5;
      nextSequence = Math.max(nextSequence, (contentObject.sequence ?? 0) + 1);
    }

    // Sequence the remaining types by first access time
    const remaining = aggregates
      .filter((a) => a.type !== 'CT' && a.type !== 'CO')
      .sort(
        (a, b) =>
          new Date(a.firstAccessAt).getTime() -
          new Date(b.firstAccessAt).getTime(),
      );

    // Assign sequence and weights to remaining items
    remaining.forEach((agg, index) => {
      agg.sequence = nextSequence + index;
      agg.weight = this.getWeightForRank(index);
    });

    // Compute dimension scores for non-fixed types
    for (const agg of remaining) {
      agg.dimensionScore = this.computeDimensionScore(
        agg.clickCount,
        agg.weight,
      );
    }

    const highestOtherScore =
      remaining.reduce(
        (max, agg) =>
          agg.dimensionScore !== undefined && agg.dimensionScore > max
            ? agg.dimensionScore
            : max,
        0,
      ) || 0;

    // Fixed positions: CO uses highest +3, CT uses highest +6 (capped at 50)
    if (contentObject) {
      contentObject.dimensionScore = Math.min(50, highestOtherScore + 3);
    }
    if (commentary) {
      commentary.dimensionScore = Math.min(50, highestOtherScore + 6);
    }

    // Build response array sorted by descending dimension score, then sequence
    const summaries = aggregates
      .map((agg) => {
        const dimensionScore =
          agg.dimensionScore ??
          this.computeDimensionScore(agg.clickCount, agg.weight);

        return {
          type: agg.type,
          clickCount: agg.clickCount,
          sequence: agg.sequence ?? null,
          weight: agg.weight ?? null,
          dimensionScore,
          firstAccessAt: agg.firstAccessAt,
          avgClicksPerElement:
            agg.elementIds.size > 0
              ? Math.round(
                  (agg.clickCount / agg.elementIds.size + Number.EPSILON) * 100,
                ) / 100
              : agg.clickCount,
        };
      })
      .sort((a, b) => {
        if (b.dimensionScore !== a.dimensionScore) {
          return (b.dimensionScore ?? 0) - (a.dimensionScore ?? 0);
        }
        return (
          (a.sequence ?? Number.MAX_SAFE_INTEGER) -
          (b.sequence ?? Number.MAX_SAFE_INTEGER)
        );
      });

    const totalClicks = clickStatements.length;

    return Promise.resolve({
      metricId: this.id,
      value: summaries,
      computed: new Date().toISOString(),
      metadata: {
        totalClicks,
        typeCount: summaries.length,
        userId: params.userId,
        courseId: params.courseId,
        topicId: params.topicId,
      },
    });
  }

  validateParams(params: MetricParams): void {
    if (!params.userId) {
      throw new Error('userId is required for element-clicks metric');
    }

    if (params.since && params.until) {
      const since = new Date(params.since);
      const until = new Date(params.until);
      if (since > until) {
        throw new Error('since timestamp must be before until timestamp');
      }
    }
  }

  private buildAggregates(statements: xAPIStatement[]): TypeAggregate[] {
    const map = new Map<ElementTypeCode, TypeAggregate>();

    for (const stmt of statements) {
      const type = this.detectElementType(stmt);
      if (type === 'unknown') continue;

      const ts = this.getTimestamp(stmt);
      const agg =
        map.get(type) ||
        ({
          type,
          clickCount: 0,
          firstAccessAt: ts,
          elementIds: new Set<string>(),
        } as TypeAggregate);

      agg.clickCount += 1;
      if (ts < agg.firstAccessAt) {
        agg.firstAccessAt = ts;
      }
      if (stmt.object?.id) {
        agg.elementIds.add(stmt.object.id);
      }

      map.set(type, agg);
    }

    return Array.from(map.values());
  }

  private detectElementType(stmt: xAPIStatement): ElementTypeCode {
    const typeFromDefinition = stmt.object?.definition?.type;
    let name =
      stmt.object?.definition?.name?.['en'] ||
      stmt.object?.definition?.name?.['en-US'] ||
      '';

    // Strip HTML tags from name (e.g. <h6>Kurzübersicht </h6>)
    name = name.replace(/<[^>]*>/g, '').trim();

    const haystack = (typeFromDefinition || '') + ' ' + name;
    const lowerHaystack = haystack.toLowerCase().replace(/_/g, '-');

    // German mappings
    if (
      lowerHaystack.includes('kurzübersicht') ||
      lowerHaystack.includes('kommentar')
    )
      return 'CT';
    if (lowerHaystack.includes('erklärung') || lowerHaystack.includes('inhalt'))
      return 'CO';
    if (
      lowerHaystack.includes('reflexion') ||
      lowerHaystack.includes('feedback')
    )
      return 'RQ';
    if (
      lowerHaystack.includes('selbsteinschätzungstest') ||
      lowerHaystack.includes('selftest')
    )
      return 'SE';
    if (lowerHaystack.includes('forum') || lowerHaystack.includes('diskussion'))
      return 'FO';
    if (
      lowerHaystack.includes('zusatzliteratur') ||
      lowerHaystack.includes('literatur')
    )
      return 'RM';
    if (lowerHaystack.includes('animation')) return 'AN';
    if (lowerHaystack.includes('übung') || lowerHaystack.includes('practice'))
      return 'EC';
    if (lowerHaystack.includes('beispiel')) return 'EX';
    if (
      lowerHaystack.includes('anwendung') ||
      lowerHaystack.includes('realitätsbezug')
    )
      return 'RA';
    if (
      lowerHaystack.includes('zusammenfassung') ||
      lowerHaystack.includes('fazit')
    )
      return 'CC';
    if (
      lowerHaystack.includes('aufgabe') ||
      lowerHaystack.includes('hausaufgabe')
    )
      return 'AS';

    // English mappings
    if (lowerHaystack.includes('commentary')) return 'CT';
    if (lowerHaystack.includes('content')) return 'CO';
    if (lowerHaystack.includes('reflection') || lowerHaystack.includes('quiz'))
      return 'RQ';
    if (lowerHaystack.includes('self-assessment')) return 'SE';
    if (lowerHaystack.includes('discussion')) return 'FO';
    if (lowerHaystack.includes('reading') || lowerHaystack.includes('resource'))
      return 'RM';
    // animation already covered
    if (lowerHaystack.includes('exercise')) return 'EC';
    if (lowerHaystack.includes('example')) return 'EX';
    if (lowerHaystack.includes('application')) return 'RA';
    if (lowerHaystack.includes('conclusion')) return 'CC';
    if (
      lowerHaystack.includes('assignment') ||
      lowerHaystack.includes('homework')
    )
      return 'AS';

    // Abbreviation prefix pattern: "SE - ..." etc.
    if (name) {
      const abbrev = name.split(/\s|-/)[0]?.toUpperCase();
      const codes: ElementTypeCode[] = [
        'CT',
        'CO',
        'RQ',
        'SE',
        'FO',
        'RM',
        'AN',
        'EC',
        'EX',
        'RA',
        'CC',
        'AS',
      ];
      if (codes.includes(abbrev as ElementTypeCode)) {
        return abbrev as ElementTypeCode;
      }
    }

    return 'unknown';
  }

  private getTimestamp(stmt: xAPIStatement): string {
    if (stmt.timestamp) {
      return stmt.timestamp;
    }
    if (stmt.stored) {
      return stmt.stored;
    }
    return new Date().toISOString();
  }

  private getWeightForRank(rank: number): number {
    // Rank 0 is the first non-fixed item (e.g. Sequence 3)
    const weights = [1.5, 1.5, 1.25, 1.1];
    if (rank < weights.length) {
      return weights[rank];
    }
    return 1.0;
  }

  private computeDimensionScore(clickCount: number, weight = 1): number {
    // "Each Click raises the dimension score by 5"
    const base = clickCount * 5;
    return Math.min(50, Math.round(base * weight * 100) / 100);
  }
}
