// Implements REQ-FN-026: Multi-LRS Configuration Schema
// Joi validation schemas for multi-LRS configuration parsing and validation

import * as Joi from 'joi';
import { LRSInstance } from './lrs-config.interface';

/**
 * Joi schema for basic authentication (username/password or key/secret)
 * REQ-FN-026: Supports both username/password and key/secret aliases
 */
const basicAuthSchema = Joi.object({
  type: Joi.string().valid('basic').required(),
}).or('username', 'key'); // At least one of username or key must be present

/**
 * Complete basic auth with username/password
 */
const basicAuthUsernamePasswordSchema = basicAuthSchema.keys({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

/**
 * Complete basic auth with key/secret (alias for username/password)
 */
const basicAuthKeySecretSchema = basicAuthSchema.keys({
  key: Joi.string().required(),
  secret: Joi.string().required(),
});

/**
 * Joi schema for bearer token authentication
 */
const bearerAuthSchema = Joi.object({
  type: Joi.string().valid('bearer').required(),
  token: Joi.string().required(),
});

/**
 * Joi schema for custom header authentication
 */
const customAuthSchema = Joi.object({
  type: Joi.string().valid('custom').required(),
  headers: Joi.object().pattern(Joi.string(), Joi.string()).required(),
});

/**
 * Joi schema for LRS authentication
 * REQ-FN-026: Supports basic (username/password or key/secret), bearer, and custom auth
 */
export const lrsAuthSchema = Joi.alternatives().try(
  basicAuthUsernamePasswordSchema,
  basicAuthKeySecretSchema,
  bearerAuthSchema,
  customAuthSchema,
);

/**
 * Joi schema for a single LRS instance
 * REQ-FN-026: Validates id, name, endpoint, timeoutMs, and auth
 */
export const lrsInstanceSchema = Joi.object({
  id: Joi.string()
    .required()
    .pattern(/^[a-z0-9-]+$/)
    .description(
      'Unique instance identifier (lowercase alphanumeric with hyphens)',
    ),
  name: Joi.string().required().description('Human-readable label'),
  endpoint: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .description('xAPI base URL (HTTP/HTTPS only)'),
  timeoutMs: Joi.number()
    .integer()
    .min(1000)
    .default(10000)
    .description('Request timeout in milliseconds'),
  auth: lrsAuthSchema.required().description('Authentication configuration'),
});

/**
 * Parse LRS_INSTANCES JSON array from environment variable
 * REQ-FN-026: Primary configuration method via JSON array
 *
 * @param lrsInstancesJson - JSON string from LRS_INSTANCES env var
 * @returns Array of validated LRS instances
 * @throws Error if parsing or validation fails
 */
export function parseLRSInstancesFromJSON(
  lrsInstancesJson: string,
): LRSInstance[] {
  try {
    const parsed: unknown = JSON.parse(lrsInstancesJson);

    if (!Array.isArray(parsed)) {
      throw new Error('LRS_INSTANCES must be a JSON array');
    }

    // Validate array is not empty
    if (parsed.length === 0) {
      throw new Error(
        'At least one LRS instance must be configured in LRS_INSTANCES',
      );
    }

    // Validate each instance
    const instances: LRSInstance[] = [];
    const ids = new Set<string>();

    for (const instance of parsed) {
      const validationResult = lrsInstanceSchema.validate(instance, {
        abortEarly: false,
      });

      if (validationResult.error) {
        throw new Error(
          `Invalid LRS instance configuration: ${validationResult.error.message}`,
        );
      }

      const validatedInstance = validationResult.value as LRSInstance;

      // Check for duplicate IDs
      if (ids.has(validatedInstance.id)) {
        throw new Error(
          `Duplicate LRS instance ID '${validatedInstance.id}'. Instance IDs must be unique.`,
        );
      }

      ids.add(validatedInstance.id);

      // Normalize auth: convert key/secret to username/password
      if (
        validatedInstance.auth.type === 'basic' &&
        'key' in validatedInstance.auth &&
        'secret' in validatedInstance.auth
      ) {
        const keySecretAuth = validatedInstance.auth as {
          type: 'basic';
          key: string;
          secret: string;
        };
        instances.push({
          ...validatedInstance,
          auth: {
            type: 'basic',
            username: keySecretAuth.key,
            password: keySecretAuth.secret,
          },
        });
      } else {
        instances.push(validatedInstance);
      }
    }

    return instances;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse LRS_INSTANCES JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse LRS instances from prefixed environment variables
 * REQ-FN-026: Secondary configuration method via prefixed env vars
 *
 * Pattern: LRS_<ID>_ENDPOINT, LRS_<ID>_AUTH_TYPE, etc.
 * Example: LRS_HS_KE_ENDPOINT, LRS_HS_KE_AUTH_TYPE, LRS_HS_KE_USERNAME
 *
 * @param env - Environment variables object
 * @returns Array of validated LRS instances
 */
export function parseLRSInstancesFromPrefixedEnvVars(
  env: Record<string, string | undefined>,
): LRSInstance[] {
  const instances: LRSInstance[] = [];
  const ids = new Set<string>();

  // Find all unique instance IDs from LRS_*_ENDPOINT pattern
  for (const key in env) {
    const match = key.match(/^LRS_([A-Z0-9_]+)_ENDPOINT$/);
    if (match) {
      const envId = match[1]; // e.g., 'HS_KE'
      const id = envId.toLowerCase().replace(/_/g, '-'); // Convert to 'hs-ke'
      ids.add(id);
    }
  }

  if (ids.size === 0) {
    return [];
  }

  // Parse each instance
  for (const id of ids) {
    const envId = id.toUpperCase().replace(/-/g, '_'); // 'hs-ke' -> 'HS_KE'
    const prefix = `LRS_${envId}_`;

    const endpoint = env[`${prefix}ENDPOINT`];
    const name = env[`${prefix}NAME`] || id;
    const timeoutMsStr = env[`${prefix}TIMEOUT_MS`];
    const timeoutMs = timeoutMsStr ? parseInt(timeoutMsStr, 10) : 10000;
    const authType = env[`${prefix}AUTH_TYPE`];

    if (!endpoint) {
      throw new Error(`Missing ${prefix}ENDPOINT for LRS instance '${id}'`);
    }

    if (!authType) {
      throw new Error(`Missing ${prefix}AUTH_TYPE for LRS instance '${id}'`);
    }

    let auth: LRSInstance['auth'];

    if (authType === 'basic') {
      const username = env[`${prefix}USERNAME`];
      const password = env[`${prefix}PASSWORD`];
      const key = env[`${prefix}KEY`];
      const secret = env[`${prefix}SECRET`];

      if ((username && password) || (key && secret)) {
        auth = {
          type: 'basic',
          username: username || key!,
          password: password || secret!,
        };
      } else {
        throw new Error(
          `Missing credentials for LRS instance '${id}': provide either ${prefix}USERNAME + ${prefix}PASSWORD or ${prefix}KEY + ${prefix}SECRET`,
        );
      }
    } else if (authType === 'bearer') {
      const token = env[`${prefix}TOKEN`];
      if (!token) {
        throw new Error(
          `Missing ${prefix}TOKEN for bearer auth in LRS instance '${id}'`,
        );
      }
      auth = { type: 'bearer', token };
    } else if (authType === 'custom') {
      // Parse custom headers from comma-separated key:value pairs
      const headersStr = env[`${prefix}HEADERS`];
      if (!headersStr) {
        throw new Error(
          `Missing ${prefix}HEADERS for custom auth in LRS instance '${id}'`,
        );
      }

      const headers: Record<string, string> = {};
      const pairs = headersStr.split(',');
      for (const pair of pairs) {
        const parts = pair.split(':').map((s) => s.trim());
        const [key, value] = parts;
        if (key && value) {
          headers[key] = value;
        }
      }

      if (Object.keys(headers).length === 0) {
        throw new Error(
          `Invalid ${prefix}HEADERS format for LRS instance '${id}': expected 'key:value,key2:value2'`,
        );
      }

      auth = { type: 'custom', headers };
    } else {
      throw new Error(
        `Invalid ${prefix}AUTH_TYPE '${authType}' for LRS instance '${id}': must be 'basic', 'bearer', or 'custom'`,
      );
    }

    const instance: LRSInstance = {
      id,
      name,
      endpoint,
      timeoutMs,
      auth,
    };

    // Validate the constructed instance
    const validationResult = lrsInstanceSchema.validate(instance, {
      abortEarly: false,
    });

    if (validationResult.error) {
      throw new Error(
        `Invalid LRS instance '${id}' from prefixed env vars: ${validationResult.error.message}`,
      );
    }

    const validatedInstance = validationResult.value as LRSInstance;
    instances.push(validatedInstance);
  }

  return instances;
}

/**
 * Parse and validate LRS instances from environment
 * REQ-FN-026: Tries JSON array first, then falls back to prefixed env vars
 *
 * @param env - Environment variables object
 * @returns Array of validated LRS instances
 * @throws Error if no instances configured or validation fails
 */
export function parseLRSInstances(
  env: Record<string, string | undefined>,
): LRSInstance[] {
  // Try JSON array first (primary method)
  if (env.LRS_INSTANCES) {
    return parseLRSInstancesFromJSON(env.LRS_INSTANCES);
  }

  // Fall back to prefixed env vars (secondary method)
  const instances = parseLRSInstancesFromPrefixedEnvVars(env);

  if (instances.length === 0) {
    throw new Error(
      'No LRS instances configured. Set LRS_INSTANCES (JSON array) or use prefixed env vars (LRS_<ID>_ENDPOINT, etc.)',
    );
  }

  return instances;
}

/**
 * Redact credentials from LRS instances for logging
 * REQ-FN-026: Logs instance IDs and endpoints but NOT credentials
 *
 * @param instances - Array of LRS instances
 * @returns Array of redacted instances safe for logging
 */
export function redactLRSInstancesForLogging(
  instances: LRSInstance[],
): Array<{ id: string; name: string; endpoint: string; authType: string }> {
  return instances.map((instance) => ({
    id: instance.id,
    name: instance.name,
    endpoint: instance.endpoint,
    authType: instance.auth.type,
  }));
}
