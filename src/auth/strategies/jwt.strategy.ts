// Implements REQ-FN-023: JWT Authentication Strategy
// Uses passport-jwt for JWT token validation

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Configuration } from '../../core/config';

/**
 * JWT payload structure
 * Contains user identification and authorization scopes
 */
export interface JwtPayload {
  sub: string; // Subject (user ID)
  username?: string; // Optional username
  scopes: string[]; // Authorization scopes
  iat?: number; // Issued at timestamp
  exp?: number; // Expiration timestamp
}

/**
 * JWT Authentication Strategy
 * Validates JWT tokens and extracts user information and scopes
 * Implements REQ-FN-023: JWT Bearer token validation
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService<Configuration>) {
    const secret = configService.get('jwt.secret', { infer: true });
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Validates JWT payload and returns user object
   * Called automatically by Passport after token signature verification
   * @param payload - Decoded JWT payload
   * @returns User object with scopes for authorization
   * @throws UnauthorizedException if payload is invalid
   */
  validate(payload: JwtPayload): {
    userId: string;
    username?: string;
    scopes: string[];
  } {
    // Validate required fields
    if (!payload.sub || !payload.scopes) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return user object that will be attached to request
    return {
      userId: payload.sub,
      username: payload.username,
      scopes: payload.scopes,
    };
  }
}
