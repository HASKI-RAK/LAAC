// Implements REQ-FN-010: Example Metric Provider
// Demonstrates how to implement IMetricComputation interface

import { Injectable } from '@nestjs/common';
import { IMetricComputation } from '../interfaces/metric.interface';
import { MetricParams } from '../interfaces/metric-params.interface';
import { MetricResult } from '../interfaces/metric-result.interface';
import { xAPIStatement } from '../../data-access';

/**
 * Example Metric Provider
 * Demonstrates implementation of IMetricComputation interface
 * Implements REQ-FN-010: Metric Computation Engine
 *
 * @remarks
 * - This is a reference implementation for testing and documentation
 * - Real metric providers should follow this pattern
 * - Demonstrates stateless computation per REQ-FN-004
 * - Shows parameter validation and error handling
 * - Can be used in unit tests to verify interface compliance
 */
@Injectable()
export class ExampleMetricProvider implements IMetricComputation {
  /**
   * Unique identifier for this metric
   */
  readonly id = 'example-metric';

  /**
   * Dashboard level where this metric is displayed
   */
  readonly dashboardLevel = 'course';

  /**
   * Human-readable description
   */
  readonly description = 'Example metric that counts xAPI statements';

  /**
   * Semantic version
   */
  readonly version = '1.0.0';

  /**
   * Compute the metric value
   * Counts the number of xAPI statements matching the specified verb
   *
   * @param params - Must include courseId and optional verbId filter
   * @param lrsData - Array of xAPI statements from the LRS
   * @returns Metric result with statement count
   */
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult> {
    // Extract verb filter from custom filters (if provided)
    const targetVerb = params.filters?.verbId;

    // Filter statements by verb if specified, otherwise count all
    const matchingStatements = targetVerb
      ? lrsData.filter((stmt) => stmt.verb.id === targetVerb)
      : lrsData;

    // Compute the count
    const count = matchingStatements.length;

    // Return result with metadata
    return Promise.resolve({
      metricId: this.id,
      value: count,
      computed: new Date().toISOString(),
      metadata: {
        totalStatements: lrsData.length,
        matchingStatements: count,
        verbFilter: targetVerb || 'none',
        courseId: params.courseId,
      },
    });
  }

  /**
   * Validate metric-specific parameters
   * Ensures courseId is provided
   *
   * @param params - Parameters to validate
   * @throws Error if courseId is missing
   */
  validateParams(params: MetricParams): void {
    if (!params.courseId) {
      throw new Error('courseId is required for example-metric computation');
    }

    // Example: Validate time range if both since and until are provided
    if (params.since && params.until) {
      const since = new Date(params.since);
      const until = new Date(params.until);

      if (since > until) {
        throw new Error('since timestamp must be before until timestamp');
      }
    }
  }
}
