// Implements REQ-FN-014: Environment variable validation schema
// Uses Joi for declarative validation with fail-fast behavior at application startup

import * as Joi from 'joi';

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

  // LRS Configuration (REQ-FN-002)
  LRS_URL: Joi.string()
    .uri()
    .required()
    .description('Learning Record Store xAPI endpoint URL'),

  LRS_API_KEY: Joi.string()
    .required()
    .description('LRS API authentication key'),

  LRS_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .default(10000)
    .description('LRS request timeout in milliseconds'),

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
});

/**
 * Type-safe configuration factory function
 * Transforms validated environment variables into typed configuration object
 * @returns Configuration object with type-safe access
 */
export const configFactory = () => ({
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
  },
  lrs: {
    url: process.env.LRS_URL as string,
    apiKey: process.env.LRS_API_KEY as string,
    timeout: parseInt(process.env.LRS_TIMEOUT || '10000', 10),
  },
  log: {
    level: (process.env.LOG_LEVEL || 'log') as Configuration['log']['level'],
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
});

// Import Configuration type for use in configFactory
import type { Configuration } from './config.interface';
