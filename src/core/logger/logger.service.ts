// Implements REQ-FN-020: Structured Logging with Correlation IDs
// Winston-based logger with NestJS integration and correlation ID support

import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { Configuration } from '../config/config.interface';
import { getCorrelationId } from './cls-context';

/**
 * Custom Winston logger service implementing NestJS LoggerService interface
 * Provides structured JSON logging with correlation IDs and configurable log levels
 *
 * @remarks
 * - Implements REQ-FN-020: Structured logging with correlation IDs
 * - Logs are emitted as JSON to stdout/stderr (REQ-NF-002)
 * - Log level is configurable via environment (REQ-FN-014)
 * - No PII or secrets are logged (REQ-NF-019)
 * - Correlation IDs are automatically included from CLS context
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;
  private context?: string;

  constructor(private readonly configService: ConfigService<Configuration>) {
    const logLevel =
      this.configService.get('log.level', { infer: true }) || 'log';

    // Map NestJS log levels to Winston levels
    const winstonLevel = this.mapNestToWinstonLevel(logLevel);

    this.logger = winston.createLogger({
      level: winstonLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
      ],
    });
  }

  /**
   * Maps NestJS log levels to Winston log levels
   * @param nestLevel - NestJS log level
   * @returns Corresponding Winston log level
   */
  private mapNestToWinstonLevel(
    nestLevel: 'error' | 'warn' | 'log' | 'debug' | 'verbose',
  ): string {
    const mapping: Record<string, string> = {
      error: 'error',
      warn: 'warn',
      log: 'info',
      debug: 'debug',
      verbose: 'silly',
    };
    return mapping[nestLevel] || 'info';
  }

  /**
   * Builds the log metadata object with correlation ID and context
   * @param context - Optional context/module name
   * @param meta - Additional metadata
   * @returns Complete metadata object
   */
  private buildMetadata(context?: string, meta?: Record<string, unknown>) {
    const correlationId = getCorrelationId();
    const metadata: Record<string, unknown> = {
      ...(meta || {}),
    };

    if (correlationId) {
      metadata.correlationId = correlationId;
    }

    if (context || this.context) {
      metadata.context = context || this.context;
    }

    return metadata;
  }

  /**
   * Sets the context (module/service name) for subsequent log calls
   * @param context - Context name
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Logs an informational message
   * @param message - Log message
   * @param context - Optional context override
   */
  log(message: string, context?: string): void;
  log(message: string, meta?: Record<string, unknown>): void;
  log(message: string, contextOrMeta?: string | Record<string, unknown>): void {
    const context =
      typeof contextOrMeta === 'string' ? contextOrMeta : undefined;
    const meta = typeof contextOrMeta === 'object' ? contextOrMeta : undefined;

    this.logger.info(message, this.buildMetadata(context, meta));
  }

  /**
   * Logs an error message with optional stack trace
   * @param message - Error message
   * @param trace - Optional stack trace
   * @param context - Optional context override
   */
  error(message: string, trace?: string, context?: string): void;
  error(message: string, error?: Error, context?: string): void;
  error(
    message: string,
    traceOrError?: string | Error,
    context?: string,
  ): void {
    const metadata = this.buildMetadata(context);

    if (traceOrError instanceof Error) {
      metadata.error = {
        message: traceOrError.message,
        stack: traceOrError.stack,
        code: (traceOrError as { code?: string }).code,
      };
    } else if (typeof traceOrError === 'string') {
      metadata.stack = traceOrError;
    }

    this.logger.error(message, metadata);
  }

  /**
   * Logs a warning message
   * @param message - Warning message
   * @param context - Optional context override
   */
  warn(message: string, context?: string): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  warn(
    message: string,
    contextOrMeta?: string | Record<string, unknown>,
  ): void {
    const context =
      typeof contextOrMeta === 'string' ? contextOrMeta : undefined;
    const meta = typeof contextOrMeta === 'object' ? contextOrMeta : undefined;

    this.logger.warn(message, this.buildMetadata(context, meta));
  }

  /**
   * Logs a debug message
   * @param message - Debug message
   * @param context - Optional context override
   */
  debug(message: string, context?: string): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  debug(
    message: string,
    contextOrMeta?: string | Record<string, unknown>,
  ): void {
    const context =
      typeof contextOrMeta === 'string' ? contextOrMeta : undefined;
    const meta = typeof contextOrMeta === 'object' ? contextOrMeta : undefined;

    this.logger.debug(message, this.buildMetadata(context, meta));
  }

  /**
   * Logs a verbose message
   * @param message - Verbose message
   * @param context - Optional context override
   */
  verbose(message: string, context?: string): void;
  verbose(message: string, meta?: Record<string, unknown>): void;
  verbose(
    message: string,
    contextOrMeta?: string | Record<string, unknown>,
  ): void {
    const context =
      typeof contextOrMeta === 'string' ? contextOrMeta : undefined;
    const meta = typeof contextOrMeta === 'object' ? contextOrMeta : undefined;

    this.logger.silly(message, this.buildMetadata(context, meta));
  }

  /**
   * Logs a fatal error (alias for error with critical severity)
   * @param message - Fatal error message
   * @param trace - Optional stack trace
   * @param context - Optional context override
   */
  fatal(message: string, trace?: string, context?: string): void {
    this.error(message, trace, context);
  }
}
