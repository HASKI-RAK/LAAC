// Implements REQ-FN-014: Environment variable validation schema
// Implements REQ-FN-026: Multi-LRS Configuration Schema
// Uses Joi for declarative validation with fail-fast behavior at application startup

import * as Joi from 'joi';
import {
  parseLRSInstances,
  redactLRSInstancesForLogging,
  lrsInstanceSchema,
} from './lrs-config.schema';
import type { LRSInstance } from './lrs-config.interface';

/**
 * Joi validation schema for environment variables
 * Validates all required configuration at startup (REQ-FN-014)
 * Provides clear error messages for missing or invalid values
 */
export const configValidationSchema = Joi.object({
  // Application Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .description('Application environment'),

  PORT: Joi.number().port().default(3000).description('Application port'),

  API_PREFIX: Joi.string()
    .default('api/v1')
    .description('API route prefix for versioning'),

  // JWT Authentication Configuration (REQ-FN-023)
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT signing secret (minimum 32 characters)'),

  JWT_EXPIRATION: Joi.string()
    .default('1h')
    .pattern(/^\d+[smhd]$/)
    .description('JWT expiration time (e.g., 1h, 30m, 7d)'),

  AUTH_ENABLED: Joi.boolean()
    .default(true)
    .description(
      'Enable/disable authentication (default: true, set false for dev/test)',
    ),

  // Redis Cache Configuration (REQ-FN-006)
  REDIS_HOST: Joi.string()
    .hostname()
    .default('localhost')
    .description('Redis server hostname'),

  REDIS_PORT: Joi.number()
    .port()
    .default(6379)
    .description('Redis server port'),

  REDIS_PASSWORD: Joi.string()
    .optional()
    .allow('')
    .description('Redis authentication password (optional)'),

  REDIS_TTL: Joi.number()
    .integer()
    .min(0)
    .default(3600)
    .description('Default cache TTL in seconds'),

  // Cache-specific TTL configuration (REQ-FN-006)
  CACHE_TTL_METRICS: Joi.number()
    .integer()
    .min(0)
    .default(3600)
    .description('Cache TTL for metrics catalog in seconds (default: 1 hour)'),

  CACHE_TTL_RESULTS: Joi.number()
    .integer()
    .min(0)
    .default(300)
    .description(
      'Cache TTL for metric results in seconds (default: 5 minutes)',
    ),

  CACHE_TTL_HEALTH: Joi.number()
    .integer()
    .min(0)
    .default(60)
    .description(
      'Cache TTL for health check data in seconds (default: 1 minute)',
    ),

  REDIS_POOL_SIZE: Joi.number()
    .integer()
    .min(1)
    .default(10)
    .description('Maximum Redis connection pool size'),

  // LRS Configuration (REQ-FN-002, REQ-FN-026)
  // Legacy single-instance config (backward compatible)
  LRS_URL: Joi.string()
    .uri()
    .optional()
    .description(
      'Learning Record Store xAPI endpoint URL (legacy single-instance)',
    ),

  LRS_API_KEY: Joi.string()
    .optional()
    .description('LRS API authentication key (legacy single-instance)'),

  LRS_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .default(10000)
    .description('LRS request timeout in milliseconds'),

  // REQ-FN-026: Multi-LRS configuration
  // Primary method: JSON array
  LRS_INSTANCES: Joi.string()
    .optional()
    .description('JSON array of LRS instance configurations (REQ-FN-026)'),

  // Secondary method: Prefixed env vars (detected automatically, no explicit validation here)
  // Pattern: LRS_<ID>_ENDPOINT, LRS_<ID>_AUTH_TYPE, LRS_<ID>_USERNAME, etc.

  // Logging Configuration (REQ-FN-020)
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'log', 'debug', 'verbose')
    .default('log')
    .description('Application log level'),

  // Rate Limiting Configuration (REQ-FN-024)
  RATE_LIMIT_TTL: Joi.number()
    .integer()
    .min(1)
    .default(60)
    .description('Rate limit time window in seconds (default: 60)'),

  RATE_LIMIT_MAX: Joi.number()
    .integer()
    .min(1)
    .default(100)
    .description('Maximum requests per time window (default: 100)'),

  // Circuit Breaker Configuration (REQ-FN-017)
  CIRCUIT_BREAKER_THRESHOLD: Joi.number()
    .integer()
    .min(1)
    .default(5)
    .description(
      'Number of consecutive failures before opening circuit (default: 5)',
    ),

  CIRCUIT_BREAKER_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .default(30000)
    .description(
      'Timeout in milliseconds before attempting recovery (default: 30000)',
    ),

  CIRCUIT_BREAKER_HALF_OPEN_REQUESTS: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .description(
      'Number of successful test requests required to close circuit (default: 1)',
    ),
});

/**
 * Type-safe configuration factory function
 * Transforms validated environment variables into typed configuration object
 * @returns Configuration object with type-safe access
 */
export const configFactory = () => {
  // REQ-FN-026: Parse and validate multi-LRS configuration
  let lrsInstances: LRSInstance[];
  try {
    lrsInstances = parseLRSInstances(
      process.env as Record<string, string | undefined>,
    );

    // REQ-FN-026: Log configured instances (redacted, no credentials)
    // Note: Using console.log here as LoggerService is not available in config factory
    // This is acceptable for startup configuration logging before DI container is initialized
    const redactedInstances = redactLRSInstancesForLogging(lrsInstances);
    console.log(
      '[ConfigService] Loaded LRS instances:',
      JSON.stringify(redactedInstances, null, 2),
    );
  } catch (error) {
    // Backward compatibility: Fall back to legacy single-instance config if available
    if (process.env.LRS_URL && process.env.LRS_API_KEY) {
      console.log(
        '[ConfigService] Using legacy single-instance LRS configuration',
      );

      // Construct and validate legacy instance
      const legacyInstance = {
        id: 'default',
        name: 'Default LRS',
        endpoint: process.env.LRS_URL,
        timeoutMs: parseInt(process.env.LRS_TIMEOUT || '10000', 10),
        auth: {
          type: 'basic' as const,
          // Legacy LRS_API_KEY is used for both username and password
          // This is a limitation of the legacy single-instance configuration
          username: process.env.LRS_API_KEY,
          password: process.env.LRS_API_KEY,
        },
      };

      // Validate the legacy instance with the same schema
      const validationResult = lrsInstanceSchema.validate(legacyInstance, {
        abortEarly: false,
      });

      if (validationResult.error) {
        console.error(
          '[ConfigService] ERROR: Invalid legacy LRS configuration:',
          validationResult.error.message,
        );
        throw new Error(
          `Invalid legacy LRS configuration: ${validationResult.error.message}`,
        );
      }

      lrsInstances = [validationResult.value as LRSInstance];
    } else {
      // REQ-FN-026: Log validation errors with clear guidance
      console.error(
        '[ConfigService] ERROR: Failed to load LRS instances:',
        (error as Error).message,
      );
      throw error;
    }
  }

  return {
    app: {
      nodeEnv: process.env.NODE_ENV as
        | 'development'
        | 'production'
        | 'test'
        | undefined,
      port: parseInt(process.env.PORT || '3000', 10),
      apiPrefix: process.env.API_PREFIX || 'api/v1',
    },
    jwt: {
      secret: process.env.JWT_SECRET as string,
      expirationTime: process.env.JWT_EXPIRATION || '1h',
      authEnabled: process.env.AUTH_ENABLED === 'false' ? false : true,
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
      poolSize: parseInt(process.env.REDIS_POOL_SIZE || '10', 10),
      ttlMetrics: parseInt(process.env.CACHE_TTL_METRICS || '3600', 10),
      ttlResults: parseInt(process.env.CACHE_TTL_RESULTS || '300', 10),
      ttlHealth: parseInt(process.env.CACHE_TTL_HEALTH || '60', 10),
    },
    lrs: {
      // Legacy single-instance support (backward compatible)
      url:
        process.env.LRS_URL ||
        (lrsInstances.length > 0 ? lrsInstances[0].endpoint : ''),
      apiKey: process.env.LRS_API_KEY || '',
      timeout: parseInt(process.env.LRS_TIMEOUT || '10000', 10),
      // REQ-FN-026: Multi-LRS instances
      instances: lrsInstances,
    },
    log: {
      level: (process.env.LOG_LEVEL || 'log') as Configuration['log']['level'],
    },
    rateLimit: {
      ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
      limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    },
    circuitBreaker: {
      threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '30000', 10),
      halfOpenRequests: parseInt(
        process.env.CIRCUIT_BREAKER_HALF_OPEN_REQUESTS || '1',
        10,
      ),
    },
  };
};

// Import Configuration type for use in configFactory
import type { Configuration } from './config.interface';
