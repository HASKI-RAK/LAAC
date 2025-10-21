// Implements REQ-NF-002: Health/Readiness Endpoints - LRS Health Indicator
// Custom health indicator for LRS (Learning Record Store) connectivity

import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import { Configuration } from '../../config';

/**
 * LRS health indicator
 * Checks connectivity to Learning Record Store (xAPI endpoint)
 */
@Injectable()
export class LrsHealthIndicator extends HealthIndicator {
  private readonly lrsConfig: {
    url: string;
    apiKey: string;
    timeout: number;
  };

  constructor(
    private readonly configService: ConfigService<Configuration>,
    private readonly httpService: HttpService,
  ) {
    super();
    const config = this.configService.get('lrs', { infer: true });

    if (!config) {
      throw new Error('LRS configuration is missing');
    }

    this.lrsConfig = config;
  }

  /**
   * Check if LRS is reachable
   * Performs a simple HTTP GET to verify connectivity
   * @param key - Health check key name
   * @returns Health indicator result
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const timeoutMs = Math.min(this.lrsConfig.timeout, 5000); // Max 5 seconds for health check

      // Try to reach the LRS endpoint
      // Use /about endpoint if available, otherwise just check base URL
      const checkUrl = this.lrsConfig.url;

      const response = await firstValueFrom(
        this.httpService
          .get(checkUrl, {
            headers: {
              Authorization: `Bearer ${this.lrsConfig.apiKey}`,
            },
            timeout: timeoutMs,
          })
          .pipe(timeout(timeoutMs)),
      );

      // Consider 2xx, 401, and 403 as "up" (server is reachable)
      // 401/403 means auth issue but LRS is accessible
      if (
        response.status >= 200 &&
        (response.status < 300 ||
          response.status === 401 ||
          response.status === 403)
      ) {
        return this.getStatus(key, true, {
          status: 'up',
          message: 'LRS is reachable',
          statusCode: response.status,
        });
      }

      throw new Error(`LRS returned unexpected status: ${response.status}`);
    } catch (error: unknown) {
      // If it's a 401 or 403, LRS is actually up (just auth issue)
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as Record<string, unknown>).response === 'object'
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const status = (error as Record<string, any>).response?.status;
        if (status === 401 || status === 403) {
          return this.getStatus(key, true, {
            status: 'up',
            message: 'LRS is reachable (auth expected)',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            statusCode: status,
          });
        }
      }

      const result = this.getStatus(key, false, {
        status: 'down',
        message:
          error instanceof Error ? error.message : 'LRS health check failed',
      });
      throw new HealthCheckError('LRS health check failed', result);
    }
  }
}
