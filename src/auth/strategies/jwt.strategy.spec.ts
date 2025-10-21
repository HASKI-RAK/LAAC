// REQ-FN-023: Unit tests for JWT Authentication Strategy

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy, JwtPayload } from './jwt.strategy';

describe('REQ-FN-023: JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret-key-at-least-32-chars'),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object with valid payload', () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        username: 'testuser',
        scopes: ['analytics:read'],
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-123',
        username: 'testuser',
        scopes: ['analytics:read'],
      });
    });

    it('should return user object without optional username', () => {
      const payload: JwtPayload = {
        sub: 'user-456',
        scopes: ['admin:cache', 'admin:config'],
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-456',
        username: undefined,
        scopes: ['admin:cache', 'admin:config'],
      });
    });

    it('should throw UnauthorizedException if sub is missing', () => {
      const payload = {
        scopes: ['analytics:read'],
      } as JwtPayload;

      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
      expect(() => strategy.validate(payload)).toThrow('Invalid token payload');
    });

    it('should throw UnauthorizedException if scopes are missing', () => {
      const payload = {
        sub: 'user-789',
      } as JwtPayload;

      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
      expect(() => strategy.validate(payload)).toThrow('Invalid token payload');
    });

    it('should accept empty scopes array', () => {
      const payload: JwtPayload = {
        sub: 'user-999',
        scopes: [],
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-999',
        username: undefined,
        scopes: [],
      });
    });
  });

  describe('constructor', () => {
    it('should throw error if JWT_SECRET is not configured', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        new JwtStrategy(mockConfigService as any);
      }).toThrow('JWT_SECRET is not configured');
    });
  });
});
