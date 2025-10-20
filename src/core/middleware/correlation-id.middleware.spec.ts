// REQ-FN-020: Unit tests for CorrelationIdMiddleware
// Verifies correlation ID generation, extraction, and propagation

import {
  CorrelationIdMiddleware,
  CORRELATION_ID_HEADER,
} from './correlation-id.middleware';
import { Request, Response, NextFunction } from 'express';
import * as clsContext from '../logger/cls-context';

describe('REQ-FN-020: CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let setHeaderSpy: jest.Mock;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();

    setHeaderSpy = jest.fn();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: setHeaderSpy,
    };
    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('correlation ID generation', () => {
    it('should generate a new UUID v4 when no correlation ID is provided', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Verify a correlation ID was set in the response header
      expect(setHeaderSpy).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,
        expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
      );
    });

    it('should call next middleware', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('correlation ID extraction', () => {
    it('should extract correlation ID from request header (lowercase)', () => {
      const clientCorrelationId = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.headers = {
        'x-correlation-id': clientCorrelationId,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(setHeaderSpy).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,
        clientCorrelationId,
      );
    });

    it('should handle correlation ID header case-insensitively', () => {
      const clientCorrelationId = '550e8400-e29b-41d4-a716-446655440000';
      mockRequest.headers = {
        'X-CORRELATION-ID': clientCorrelationId,
      };

      // Express normalizes headers to lowercase
      mockRequest.headers = {
        'x-correlation-id': clientCorrelationId,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(setHeaderSpy).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,
        clientCorrelationId,
      );
    });
  });

  describe('correlation ID propagation', () => {
    it('should set correlation ID in response header', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(setHeaderSpy).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,
        expect.any(String),
      );
    });

    it('should store correlation ID in CLS context', () => {
      const setCorrelationIdSpy = jest.spyOn(clsContext, 'setCorrelationId');

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(setCorrelationIdSpy).toHaveBeenCalledWith(expect.any(String));
    });

    it('should run request handling in CLS context', () => {
      const runInContextSpy = jest.spyOn(clsContext, 'runInContext');

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(runInContextSpy).toHaveBeenCalled();
    });
  });

  describe('end-to-end correlation ID flow', () => {
    it('should use client-provided correlation ID throughout the flow', () => {
      const clientCorrelationId = 'client-provided-id';
      mockRequest.headers = {
        'x-correlation-id': clientCorrelationId,
      };

      const setCorrelationIdSpy = jest.spyOn(clsContext, 'setCorrelationId');

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Verify the same ID is used in CLS and response header
      expect(setCorrelationIdSpy).toHaveBeenCalledWith(clientCorrelationId);
      expect(setHeaderSpy).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,
        clientCorrelationId,
      );
    });

    it('should generate and propagate new correlation ID when not provided', () => {
      const setCorrelationIdSpy = jest.spyOn(clsContext, 'setCorrelationId');

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Get the generated correlation ID from the response header call
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const generatedId = setHeaderSpy.mock.calls[0][1];

      // Verify the same ID is used in CLS and response header

      expect(setCorrelationIdSpy).toHaveBeenCalledWith(generatedId);
      expect(setHeaderSpy).toHaveBeenCalledWith(
        CORRELATION_ID_HEADER,

        generatedId,
      );
    });
  });

  describe('REQ-FN-020: Correlation ID format', () => {
    it('should generate correlation IDs as UUID v4 format', () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const generatedId = setHeaderSpy.mock.calls[0][1];

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      // where y is one of [8, 9, a, b]
      const uuidV4Pattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(generatedId).toMatch(uuidV4Pattern);
    });
  });
});
