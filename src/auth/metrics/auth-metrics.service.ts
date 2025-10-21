// Implements REQ-FN-021: Prometheus metrics for authentication and authorization
// Implements REQ-FN-023: Track authentication failures and rate limiting

import { Injectable } from '@nestjs/common';
import { Counter } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

/**
 * Authentication and Authorization Metrics Service
 * Provides counters for tracking security events
 * Implements REQ-FN-021: Prometheus metrics export
 */
@Injectable()
export class AuthMetricsService {
  constructor(
    @InjectMetric('auth_failures_total')
    public readonly authFailuresCounter: Counter<string>,
    @InjectMetric('rate_limit_rejections_total')
    public readonly rateLimitRejectionsCounter: Counter<string>,
  ) {}

  /**
   * Increment authentication failure counter
   * @param reason - Reason for authentication failure
   * @param path - Request path
   */
  incrementAuthFailures(reason: string, path?: string): void {
    this.authFailuresCounter.inc({
      reason,
      path: path || 'unknown',
    });
  }

  /**
   * Increment rate limit rejection counter
   * @param path - Request path
   */
  incrementRateLimitRejections(path?: string): void {
    this.rateLimitRejectionsCounter.inc({
      path: path || 'unknown',
    });
  }
}
