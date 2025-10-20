// Implements REQ-FN-020: Correlation ID Middleware
// Generates, extracts, and propagates correlation IDs for distributed request tracing

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runInContext, setCorrelationId } from '../logger/cls-context';

/**
 * HTTP header name for correlation ID
 */
export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

/**
 * Middleware to inject and propagate correlation IDs across requests
 *
 * @remarks
 * - Implements REQ-FN-020: Correlation ID handling
 * - Generates UUID v4 if not provided by client
 * - Extracts from `X-Correlation-ID` request header if present
 * - Stores in CLS context for async propagation
 * - Returns in `X-Correlation-ID` response header
 *
 * @example
 * ```typescript
 * // In module configuration
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(CorrelationIdMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  /**
   * Middleware handler to manage correlation IDs
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Next function in middleware chain
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Extract correlation ID from header or generate new one
    const correlationId =
      (req.headers[CORRELATION_ID_HEADER.toLowerCase()] as string) || uuidv4();

    // Run the rest of the request handling in a CLS context
    runInContext(() => {
      // Store correlation ID in CLS context for async propagation
      setCorrelationId(correlationId);

      // Add correlation ID to response header
      res.setHeader(CORRELATION_ID_HEADER, correlationId);

      // Continue to next middleware
      next();
    });
  }
}
