// REQ-FN-023: Unit tests for Scopes Authorization Guard

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopesGuard } from './scopes.guard';
import { LoggerService } from '../../core/logger';
import { SCOPES_KEY } from '../decorators/require-scopes.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('REQ-FN-023: ScopesGuard', () => {
  let guard: ScopesGuard;
  let reflector: Reflector;
  let logger: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScopesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            warn: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<ScopesGuard>(ScopesGuard);
    reflector = module.get<Reflector>(Reflector);
    logger = module.get<LoggerService>(LoggerService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;

    beforeEach(() => {
      mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: '/test',
            method: 'GET',
            user: {
              userId: 'user-123',
              scopes: ['analytics:read'],
            },
          }),
        }),
      } as any;
    });

    it('should allow access to public routes', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: unknown) => {
          if (key === IS_PUBLIC_KEY) return true;
          return undefined;
        });

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow access when no scopes are required', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: unknown) => {
          if (key === IS_PUBLIC_KEY) return false;
          if (key === SCOPES_KEY) return undefined;
          return undefined;
        });

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow access when user has required scope', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: unknown) => {
          if (key === IS_PUBLIC_KEY) return false;
          if (key === SCOPES_KEY) return ['analytics:read'];
          return undefined;
        });

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow access when user has one of multiple required scopes', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: unknown) => {
          if (key === IS_PUBLIC_KEY) return false;
          if (key === SCOPES_KEY) return ['admin:cache', 'analytics:read'];
          return undefined;
        });

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny access when user lacks required scope', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: unknown) => {
          if (key === IS_PUBLIC_KEY) return false;
          if (key === SCOPES_KEY) return ['admin:cache'];
          return undefined;
        });

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);

      expect(logger.warn).toHaveBeenCalledWith(
        'Authorization failed: insufficient scopes',
        expect.objectContaining({
          requiredScopes: ['admin:cache'],
          userScopes: ['analytics:read'],
        }),
      );
    });

    it('should deny access when user has no scopes', () => {
      const contextWithoutScopes = {
        ...mockContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: '/test',
            method: 'GET',
            user: {
              userId: 'user-456',
              scopes: [],
            },
          }),
        }),
      };

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: unknown) => {
          if (key === IS_PUBLIC_KEY) return false;
          if (key === SCOPES_KEY) return ['admin:config'];
          return undefined;
        });

      expect(() => guard.canActivate(contextWithoutScopes)).toThrow(
        ForbiddenException,
      );
    });

    it('should deny access when user is missing from request', () => {
      const contextWithoutUser = {
        ...mockContext,
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: '/test',
            method: 'GET',
            user: null,
          }),
        }),
      };

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: unknown) => {
          if (key === IS_PUBLIC_KEY) return false;
          if (key === SCOPES_KEY) return ['analytics:read'];
          return undefined;
        });

      expect(() => guard.canActivate(contextWithoutUser)).toThrow(
        ForbiddenException,
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Authorization check failed: no user or scopes',
        expect.anything(),
      );
    });

    it('should throw ForbiddenException with descriptive message', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key: unknown) => {
          if (key === IS_PUBLIC_KEY) return false;
          if (key === SCOPES_KEY) return ['admin:cache', 'admin:config'];
          return undefined;
        });

      try {
        guard.canActivate(mockContext);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).getResponse()).toEqual({
          statusCode: 403,
          message:
            'Access denied. Required scopes: admin:cache or admin:config',
          error: 'Forbidden',
        });
      }
    });
  });
});
