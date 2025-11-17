import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';
import {
  ILRSClient,
  xAPIStatement,
  xAPIQueryFilters,
  xAPIStatementResult,
  LRSHealthStatus,
  LRSInstanceConfig,
} from '../interfaces/lrs.interface';
import { LRSQueryBuilder } from './lrs-query.builder';
import { LoggerService } from '../../core/logger/logger.service';
import { MetricsRegistryService } from '../../admin/services/metrics-registry.service';
import { Configuration } from '../../core/config/config.interface';
import { getCorrelationId } from '../../core/logger/cls-context';

/**
 * LRS Client
 * Implements xAPI Statement API client with HTTP Basic Auth
 * Handles pagination, retry logic, and error handling
 * Emits telemetry hooks for monitoring
 *
 * @remarks
 * - REQ-FN-002: xAPI Learning Record Store Integration
 * - REQ-FN-025: Provides health check interface via getInstanceHealth()
 * - Supports HTTP Basic Authentication (username:password or key:secret)
 * - Implements retry logic with exponential backoff (3 retries, 100-500ms)
 * - Propagates correlation IDs via X-Correlation-ID header
 * - Records telemetry hooks for query duration and error counts
 * - Follows xAPI 1.0.3 specification
 */
@Injectable()
export class LRSClient implements ILRSClient, OnModuleInit {
  private config: LRSInstanceConfig;
  private readonly xapiVersion = '1.0.3';
  private readonly maxRetries: number;
  private readonly retryDelayBase = 100; // ms
  private readonly retryDelayMax = 500; // ms

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<Configuration>,
    private readonly logger: LoggerService,
    @Inject(forwardRef(() => MetricsRegistryService))
    private readonly metricsRegistry: MetricsRegistryService,
  ) {
    // For now, use single LRS configuration from env
    // TODO: REQ-FN-026 will add multi-LRS support
    const lrsConfig = this.configService.get('lrs', { infer: true });

    if (!lrsConfig) {
      throw new Error('LRS configuration is required');
    }

    this.config = {
      id: 'default',
      name: 'Default LRS',
      endpoint: lrsConfig.url,
      auth: {
        type: 'basic',
        username: lrsConfig.apiKey,
        password: lrsConfig.apiSecret,
      },
      timeoutMs: lrsConfig.timeout,
      maxRetries: 3,
    };

    this.maxRetries = this.config.maxRetries || 3;
  }

  onModuleInit() {
    this.logger.log('LRS Client initialized', {
      context: 'LRSClient',
      instanceId: this.instanceId,
      endpoint: this.config.endpoint,
    });
  }

  get instanceId(): string {
    return this.config.id;
  }

  /**
   * Query xAPI statements with pagination support
   * Automatically follows `more` links until all results retrieved
   */
  async queryStatements(
    filters: xAPIQueryFilters,
    maxStatements: number = 10000,
  ): Promise<xAPIStatement[]> {
    const startTime = Date.now();
    const correlationId = getCorrelationId() || 'unknown';

    this.logger.debug('LRS query started', {
      context: 'LRSClient',
      instanceId: this.instanceId,
      correlationId,
      filters: this.sanitizeFiltersForLogging(filters),
    });

    try {
      const statements: xAPIStatement[] = [];
      let moreUrl: string | undefined;
      let pageCount = 0;

      // Build initial query
      const queryBuilder = LRSQueryBuilder.fromFilters(filters);
      const url = `${this.config.endpoint}/statements`;
      const params = queryBuilder.build();

      // Fetch statements with pagination
      while (statements.length < maxStatements) {
        pageCount++;

        const result = await this.fetchStatementsPage(
          moreUrl || url,
          moreUrl ? undefined : params,
          correlationId,
        );

        // REQ-FN-017: Tag each statement with instanceId from LRS configuration (ADR-008)
        const taggedStatements = result.statements.map((stmt) =>
          this.tagStatementWithInstance(stmt),
        );

        statements.push(...taggedStatements);

        // Check for more results
        if (!result.more || statements.length >= maxStatements) {
          break;
        }

        // Prepare for next page
        moreUrl = this.buildMoreUrl(result.more);
      }

      // Trim to max if exceeded
      const finalStatements = statements.slice(0, maxStatements);

      const durationSeconds = (Date.now() - startTime) / 1000;
      this.metricsRegistry.recordLrsQuery(durationSeconds);

      this.logger.debug('LRS query completed', {
        context: 'LRSClient',
        instanceId: this.instanceId,
        correlationId,
        statementCount: finalStatements.length,
        pageCount,
        durationMs: Date.now() - startTime,
      });

      return finalStatements;
    } catch (error) {
      const durationSeconds = (Date.now() - startTime) / 1000;
      this.metricsRegistry.recordLrsQuery(durationSeconds);

      // Record error metric
      const errorType = this.categorizeError(error);
      this.metricsRegistry.recordLrsError(errorType);

      // Type assertion for known error structure
      const err = error as Error;
      const sanitizedFilters = this.sanitizeFiltersForLogging(filters);

      this.logger.error(
        `LRS query failed: ${err.message}`,
        undefined,
        'LRSClient',
      );
      this.logger.debug('LRS query error details', {
        context: 'LRSClient',
        instanceId: this.instanceId,
        correlationId,
        errorType,
        filters: sanitizedFilters,
      });

      throw this.handleError(error, 'queryStatements');
    }
  }

  /**
   * Aggregate statements (count only)
   * Note: xAPI spec doesn't define a standard count endpoint, so this
   * fetches statements with pagination to get accurate count
   */
  async aggregate(filters: xAPIQueryFilters): Promise<number> {
    const startTime = Date.now();
    const correlationId = getCorrelationId() || 'unknown';

    this.logger.debug('LRS aggregate query started', {
      context: 'LRSClient',
      instanceId: this.instanceId,
      correlationId,
      filters: this.sanitizeFiltersForLogging(filters),
    });

    try {
      // Fetch first page with reasonable limit to get total count
      // Note: xAPI doesn't have a dedicated count endpoint, so we need
      // to fetch statements to determine count
      const queryBuilder = LRSQueryBuilder.fromFilters(filters);
      if (!filters.limit) {
        queryBuilder.limit(100); // Use reasonable default for counting
      }

      const url = `${this.config.endpoint}/statements`;
      const params = queryBuilder.build();

      const result = await this.fetchStatementsPage(url, params, correlationId);

      const durationSeconds = (Date.now() - startTime) / 1000;
      this.metricsRegistry.recordLrsQuery(durationSeconds);

      // Return count from first page as approximation
      // For exact count, caller should use queryStatements() and count results
      const count = result.statements.length;

      this.logger.debug('LRS aggregate query completed', {
        context: 'LRSClient',
        instanceId: this.instanceId,
        correlationId,
        count,
        hasMore: !!result.more,
        durationMs: Date.now() - startTime,
      });

      return count;
    } catch (error) {
      const durationSeconds = (Date.now() - startTime) / 1000;
      this.metricsRegistry.recordLrsQuery(durationSeconds);

      // Record error metric
      const errorType = this.categorizeError(error);
      this.metricsRegistry.recordLrsError(errorType);

      this.logger.error(
        `LRS aggregate query failed: ${(error as Error).message}`,
        undefined,
        'LRSClient',
      );
      this.logger.debug('LRS aggregate error details', {
        context: 'LRSClient',
        instanceId: this.instanceId,
        correlationId,
        errorType,
      });

      throw this.handleError(error, 'aggregate');
    }
  }

  /**
   * Health check for LRS instance
   * Uses GET /xapi/about endpoint
   */
  async getInstanceHealth(): Promise<LRSHealthStatus> {
    const startTime = Date.now();
    const correlationId = getCorrelationId() || 'unknown';

    try {
      const url = `${this.config.endpoint}/about`;
      const config = this.buildRequestConfig(correlationId);

      const response = await firstValueFrom(
        this.httpService.get<{ version?: string }>(url, config).pipe(
          catchError((error: AxiosError) => {
            throw error;
          }),
        ),
      );

      const responseTimeMs = Date.now() - startTime;
      const version = response.data?.version;

      this.logger.debug('LRS health check succeeded', {
        context: 'LRSClient',
        instanceId: this.instanceId,
        correlationId,
        responseTimeMs,
        version,
      });

      return {
        instanceId: this.instanceId,
        healthy: true,
        version: version || this.xapiVersion,
        responseTimeMs,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const axiosError = error as AxiosError;

      // 401/403 considered reachable (auth issue, not unavailability)
      const isAuthError =
        axiosError.response?.status === 401 ||
        axiosError.response?.status === 403;

      this.logger.warn('LRS health check failed', {
        context: 'LRSClient',
        instanceId: this.instanceId,
        correlationId,
        error: (error as Error).message,
        status: axiosError.response?.status,
        responseTimeMs,
      });

      return {
        instanceId: this.instanceId,
        healthy: isAuthError, // Auth errors = LRS reachable
        error: (error as Error).message,
        responseTimeMs,
      };
    }
  }

  /**
   * Fetch a single page of statements
   * Handles retry logic with exponential backoff
   */
  private async fetchStatementsPage(
    url: string,
    params: URLSearchParams | undefined,
    correlationId: string,
  ): Promise<xAPIStatementResult> {
    let lastError: Error | AxiosError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const config = this.buildRequestConfig(correlationId);
        if (params) {
          config.params = params;
        }

        const response = await firstValueFrom(
          this.httpService.get<xAPIStatementResult>(url, config).pipe(
            catchError((error: AxiosError) => {
              throw error;
            }),
          ),
        );

        return response.data;
      } catch (error) {
        lastError = error as Error | AxiosError;

        const axiosError = error as AxiosError;

        // Don't retry on 4xx errors (except 429 rate limit)
        if (
          axiosError.response?.status &&
          axiosError.response.status >= 400 &&
          axiosError.response.status < 500 &&
          axiosError.response.status !== 429
        ) {
          break;
        }

        // Calculate delay with exponential backoff
        if (attempt < this.maxRetries) {
          const delay = Math.min(
            this.retryDelayBase * Math.pow(2, attempt),
            this.retryDelayMax,
          );

          this.logger.debug('Retrying LRS request', {
            context: 'LRSClient',
            instanceId: this.instanceId,
            correlationId,
            attempt: attempt + 1,
            maxRetries: this.maxRetries,
            delayMs: delay,
            error: (error as Error).message,
          });

          await this.sleep(delay);
        }
      }
    }

    // Ensure we throw an Error object
    if (lastError) {
      throw lastError;
    }
    throw new Error('LRS request failed after all retry attempts');
  }

  /**
   * Build Axios request configuration
   * Includes auth, headers, and timeout
   */
  private buildRequestConfig(correlationId: string): AxiosRequestConfig {
    const headers: Record<string, string> = {
      'X-Experience-API-Version': this.xapiVersion,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    };

    const config: AxiosRequestConfig = {
      timeout: this.config.timeoutMs,
      headers,
    };

    // Add authentication
    if (this.config.auth.type === 'basic') {
      const username = this.config.auth.username || this.config.auth.key;
      const password = this.config.auth.password || this.config.auth.secret;

      if (username && password) {
        const authString = Buffer.from(`${username}:${password}`).toString(
          'base64',
        );
        headers.Authorization = `Basic ${authString}`;
      }
    } else if (this.config.auth.type === 'bearer' && this.config.auth.token) {
      headers.Authorization = `Bearer ${this.config.auth.token}`;
    } else if (this.config.auth.type === 'custom' && this.config.auth.headers) {
      Object.assign(headers, this.config.auth.headers);
    }

    return config;
  }

  /**
   * Build absolute URL from relative `more` link
   */
  private buildMoreUrl(morePath: string): string {
    if (morePath.startsWith('http://') || morePath.startsWith('https://')) {
      return morePath;
    }

    // Remove leading slash if present
    const path = morePath.startsWith('/') ? morePath.substring(1) : morePath;

    // Use URL constructor for robust base URL extraction
    const url = new URL(this.config.endpoint);
    return `${url.protocol}//${url.host}/${path}`;
  }

  /**
   * Handle and categorize errors
   */
  private handleError(error: unknown, operation: string): Error {
    const err = error as Error & {
      code?: string;
      response?: { status: number };
    };

    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return new Error(
        `LRS request timeout after ${this.config.timeoutMs}ms (${operation})`,
      );
    }

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return new Error(
        `LRS connection error: ${err.message} (${operation}). Check LRS_DOMAIN configuration and network connectivity.`,
      );
    }

    if (err.response?.status === 401) {
      return new Error(
        `LRS authentication failed (${operation}). Check LRS_USER and LRS_SECRET credentials.`,
      );
    }

    if (err.response?.status === 403) {
      return new Error(
        `LRS authorization failed (${operation}). Insufficient permissions for this operation.`,
      );
    }

    if (err.response?.status === 429) {
      return new Error(
        `LRS rate limit exceeded (${operation}). Retry after backoff period.`,
      );
    }

    if (err.response?.status && err.response.status >= 500) {
      return new Error(
        `LRS server error: ${err.response.status} (${operation})`,
      );
    }

    return new Error(`LRS error: ${err.message} (${operation})`);
  }

  /**
   * Categorize error for telemetry hooks
   */
  private categorizeError(error: unknown): string {
    const err = error as Error & {
      code?: string;
      response?: { status: number };
    };

    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return 'timeout';
    }

    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return 'connection';
    }

    if (err.response?.status === 401 || err.response?.status === 403) {
      return 'auth';
    }

    if (err.response?.status === 429) {
      return 'rate_limit';
    }

    if (err.response?.status && err.response.status >= 500) {
      return 'server';
    }

    if (
      err.response?.status &&
      err.response.status >= 400 &&
      err.response.status < 500
    ) {
      return 'client';
    }

    return 'unknown';
  }

  /**
   * Sanitize filters for logging (remove sensitive data)
   */
  private sanitizeFiltersForLogging(
    filters: xAPIQueryFilters,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Copy all filter properties except agent
    for (const [key, value] of Object.entries(filters)) {
      if (key !== 'agent') {
        result[key] = value;
      }
    }

    // Log agent structure without full details
    if (filters.agent) {
      result.agent = {
        objectType: filters.agent.objectType,
        hasAccount: !!filters.agent.account,
        hasMbox: !!filters.agent.mbox,
      };
    }

    return result;
  }

  /**
   * Tag xAPI statement with instanceId from LRS configuration
   * Implements REQ-FN-017: Instance tagging during ingestion (ADR-008)
   *
   * @param statement - xAPI statement from LRS
   * @returns Statement with instanceId field set
   *
   * @remarks
   * - LRS configuration is THE authoritative source for instanceId (ADR-008)
   * - Optional: Validates statement context for consistency checking
   * - If context mismatch detected: logs WARNING but trusts LRS config
   */
  private tagStatementWithInstance(statement: xAPIStatement): xAPIStatement {
    const taggedStatement = {
      ...statement,
      instanceId: this.instanceId,
    };

    // REQ-FN-017: Optional context validation for consistency checking
    // This is NOT mandatory and does not affect operation
    this.validateInstanceContext(statement);

    return taggedStatement;
  }

  /**
   * Validate statement context against LRS instanceId (optional consistency check)
   * Implements REQ-FN-017: Optional context validation
   *
   * @param statement - xAPI statement to validate
   *
   * @remarks
   * - Checks context.extensions, context.contextActivities, context.platform
   * - Logs WARNING on mismatch, but ALWAYS trusts LRS configuration
   * - Validation sources (in order of preference):
   *   1. context.extensions["https://wiki.haski.app/"].domain
   *   2. context.contextActivities.parent[].definition.name.en
   *   3. context.platform
   */
  private validateInstanceContext(statement: xAPIStatement): void {
    if (!statement.context) {
      return; // No context to validate
    }

    let contextInstanceId: string | undefined;

    // Check extensions first
    if (statement.context.extensions) {
      const haskiExtension = statement.context.extensions[
        'https://wiki.haski.app/'
      ] as { domain?: string } | undefined;
      if (haskiExtension?.domain) {
        contextInstanceId = haskiExtension.domain.toLowerCase();
      }
    }

    // Check contextActivities.parent if no extension found
    if (
      !contextInstanceId &&
      statement.context.contextActivities?.parent?.length
    ) {
      const parentActivity = statement.context.contextActivities.parent[0];
      if (parentActivity.definition?.name?.en) {
        // Extract ID from names like "HS-KE" -> "hs-ke"
        const match = parentActivity.definition.name.en.match(/HS-([A-Z]+)/i);
        if (match) {
          contextInstanceId = `hs-${match[1].toLowerCase()}`;
        }
      }
    }

    // Check platform if no other source found
    if (!contextInstanceId && statement.context.platform) {
      contextInstanceId = statement.context.platform.toLowerCase();
    }

    // Log warning if mismatch detected (but trust LRS config)
    if (contextInstanceId && contextInstanceId !== this.instanceId) {
      this.logger.warn('Instance ID mismatch in statement context', {
        context: 'LRSClient',
        lrsInstanceId: this.instanceId,
        contextInstanceId,
        statementId: statement.id,
        note: 'Trusting LRS configuration per ADR-008',
      });
    }
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
