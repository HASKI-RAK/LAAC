// REQ-FN-023: Unit tests for JWT Authentication Guard

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoggerService } from '../../core/logger';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('REQ-FN-023: JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let configService: ConfigService;
  let logger: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(true), // authEnabled defaults to true
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

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    configService = module.get<ConfigService>(ConfigService);
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
          }),
        }),
      } as any;
    });

    it('should allow access when auth is disabled', () => {
      jest.spyOn(configService, 'get').mockReturnValue(false); // authEnabled = false

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow access to public routes', () => {
      jest.spyOn(configService, 'get').mockReturnValue(true); // authEnabled = true
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true); // isPublic = true

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    it('should enforce authentication for non-public routes', () => {
      jest.spyOn(configService, 'get').mockReturnValue(true); // authEnabled = true
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false); // isPublic = false

      // Mock the parent canActivate method
      const superSpy = jest

        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      guard.canActivate(mockContext);

      expect(superSpy).toHaveBeenCalledWith(mockContext);
    });
  });

  describe('handleRequest', () => {
    let mockContext: ExecutionContext;

    beforeEach(() => {
      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: '/test',
            method: 'GET',
          }),
        }),
      } as any;
    });

    it('should return user on successful authentication', () => {
      const user = { userId: '123', scopes: ['analytics:read'] };

      const result = guard.handleRequest(null, user, null, mockContext);

      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException when user is not present', () => {
      expect(() => guard.handleRequest(null, null, null, mockContext)).toThrow(
        UnauthorizedException,
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Authentication failed',
        expect.objectContaining({
          path: '/test',
          method: 'GET',
        }),
      );
    });

    it('should throw UnauthorizedException on error', () => {
      const error = new Error('Token expired');

      expect(() => guard.handleRequest(error, null, null, mockContext)).toThrow(
        UnauthorizedException,
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Authentication failed',
        expect.objectContaining({
          path: '/test',
          method: 'GET',
          reason: 'Token expired',
        }),
      );
    });

    it('should log info message with reason from info object', () => {
      const info = { message: 'No auth token provided' };

      expect(() => guard.handleRequest(null, null, info, mockContext)).toThrow(
        UnauthorizedException,
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Authentication failed',
        expect.objectContaining({
          reason: 'No auth token provided',
        }),
      );
    });
  });
});
