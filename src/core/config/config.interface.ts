// Implements REQ-FN-014: Type-safe configuration interfaces
// Provides compile-time type safety for configuration access across the application

/**
 * Application configuration interface
 * Maps environment variables to typed configuration properties
 */
export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  apiPrefix: string;
}

/**
 * JWT authentication configuration interface
 * Implements REQ-FN-023: Authentication and Authorization
 */
export interface JwtConfig {
  secret: string;
  expirationTime: string;
  authEnabled: boolean;
}

/**
 * Redis cache configuration interface
 * Implements REQ-FN-006: Analytics Caching
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  ttl: number;
}

/**
 * LRS (Learning Record Store) configuration interface
 * Implements REQ-FN-002: xAPI LRS Integration
 */
export interface LrsConfig {
  url: string;
  apiKey: string;
  timeout: number;
}

/**
 * Logging configuration interface
 * Implements REQ-FN-020: Structured Logging with Correlation IDs
 */
export interface LogConfig {
  level: 'error' | 'warn' | 'log' | 'debug' | 'verbose';
}

/**
 * Rate limiting configuration interface
 * Implements REQ-FN-024: Input Validation and Rate Limiting
 */
export interface RateLimitConfig {
  ttl: number; // Time window in seconds
  limit: number; // Max requests per window
}

/**
 * Complete application configuration interface
 * Aggregates all configuration sections
 */
export interface Configuration {
  app: AppConfig;
  jwt: JwtConfig;
  redis: RedisConfig;
  lrs: LrsConfig;
  log: LogConfig;
  rateLimit: RateLimitConfig;
}
