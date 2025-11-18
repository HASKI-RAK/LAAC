// Implements REQ-FN-014: Type-safe configuration interfaces
// Implements REQ-FN-026: Multi-LRS Configuration Schema
// Provides compile-time type safety for configuration access across the application

import { LRSInstance } from './lrs-config.interface';

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
  db: number;
  ttl: number;
  poolSize: number;
  ttlMetrics: number;
  ttlResults: number;
  ttlHealth: number;
}

/**
 * LRS (Learning Record Store) configuration interface
 * Implements REQ-FN-002: xAPI LRS Integration
 * Implements REQ-FN-026: Multi-LRS Configuration Schema
 *
 * Supports both legacy single-instance and multi-instance configurations:
 * - Single instance: url, apiKey, apiSecret, timeout (backward compatible)
 * - Multi-instance: instances array (REQ-FN-026)
 */
export interface LrsConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
  timeout: number;
  instances: LRSInstance[]; // REQ-FN-026: Multi-LRS support
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
 * Circuit breaker configuration interface
 * Implements REQ-FN-017: Resilience & Fault Tolerance
 */
export interface CircuitBreakerConfig {
  threshold: number; // Number of failures before opening circuit
  timeout: number; // Timeout in ms before attempting recovery
  halfOpenRequests: number; // Number of test requests in half-open state
}

/**
 * Graceful degradation configuration interface
 * Implements REQ-NF-003: Graceful Degradation
 */
export interface GracefulDegradationConfig {
  enabled: boolean; // Enable graceful degradation strategies
  cacheFallback: boolean; // Enable cache fallback (stale data)
  staleDataTtl: number; // Max age for stale cache in seconds
  defaultValue: unknown; // Default value when data unavailable
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
  circuitBreaker: CircuitBreakerConfig;
  gracefulDegradation: GracefulDegradationConfig;
}
