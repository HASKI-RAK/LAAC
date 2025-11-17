// Implements REQ-FN-023: Track authentication failures and rate limiting
// Legacy metrics hooks now emit structured logs when METRICS_DEBUG=true.

import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../core/logger';

@Injectable()
export class AuthMetricsService {
  private readonly shouldLog =
    (process.env.METRICS_DEBUG ?? '').toLowerCase() === 'true';

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('AuthMetricsService');
  }

  incrementAuthFailures(reason: string, path?: string): void {
    this.log('auth.failure', { reason, path: path ?? 'unknown' });
  }

  incrementRateLimitRejections(path?: string): void {
    this.log('rate.limit', { path: path ?? 'unknown' });
  }

  private log(event: string, payload?: Record<string, unknown>): void {
    if (!this.shouldLog) {
      return;
    }

    this.logger.debug(`Telemetry event: ${event}`, payload ?? {});
  }
}
