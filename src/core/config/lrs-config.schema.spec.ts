// Unit tests for REQ-FN-026: Multi-LRS Configuration Schema
// Tests JSON parsing, prefixed env var parsing, and validation rules

import {
  parseLRSInstancesFromJSON,
  parseLRSInstancesFromPrefixedEnvVars,
  parseLRSInstances,
  redactLRSInstancesForLogging,
  lrsInstanceSchema,
} from './lrs-config.schema';
import { LRSInstance } from './lrs-config.interface';

describe('REQ-FN-026: Multi-LRS Configuration Schema', () => {
  describe('JSON Parsing - parseLRSInstancesFromJSON', () => {
    it('should parse valid JSON array with basic auth (username/password)', () => {
      const json = JSON.stringify([
        {
          id: 'hs-ke',
          name: 'HS Kempten',
          endpoint: 'https://ke.lrs.haski.app/xapi',
          timeoutMs: 10000,
          auth: {
            type: 'basic',
            username: 'apiKey',
            password: 'apiSecret',
          },
        },
      ]);

      const instances = parseLRSInstancesFromJSON(json);

      expect(instances).toHaveLength(1);
      expect(instances[0]).toMatchObject({
        id: 'hs-ke',
        name: 'HS Kempten',
        endpoint: 'https://ke.lrs.haski.app/xapi',
        timeoutMs: 10000,
        auth: {
          type: 'basic',
          username: 'apiKey',
          password: 'apiSecret',
        },
      });
    });

    it('should parse valid JSON array with basic auth (key/secret alias)', () => {
      const json = JSON.stringify([
        {
          id: 'hs-rv',
          name: 'HS Ravensburg',
          endpoint: 'https://rv.lrs.haski.app/xapi',
          auth: {
            type: 'basic',
            key: 'apiKey2',
            secret: 'apiSecret2',
          },
        },
      ]);

      const instances = parseLRSInstancesFromJSON(json);

      expect(instances).toHaveLength(1);
      // key/secret should be normalized to username/password
      expect(instances[0].auth).toEqual({
        type: 'basic',
        username: 'apiKey2',
        password: 'apiSecret2',
      });
    });

    it('should parse valid JSON array with bearer auth', () => {
      const json = JSON.stringify([
        {
          id: 'hs-aa',
          name: 'HS Aschaffenburg',
          endpoint: 'https://aa.lrs.haski.app/xapi',
          auth: {
            type: 'bearer',
            token: 'bearer-token-123',
          },
        },
      ]);

      const instances = parseLRSInstancesFromJSON(json);

      expect(instances).toHaveLength(1);
      expect(instances[0].auth).toEqual({
        type: 'bearer',
        token: 'bearer-token-123',
      });
    });

    it('should parse valid JSON array with custom auth', () => {
      const json = JSON.stringify([
        {
          id: 'hs-custom',
          name: 'HS Custom',
          endpoint: 'https://custom.lrs.haski.app/xapi',
          auth: {
            type: 'custom',
            headers: {
              'X-API-Key': 'custom-key',
              'X-Custom-Header': 'custom-value',
            },
          },
        },
      ]);

      const instances = parseLRSInstancesFromJSON(json);

      expect(instances).toHaveLength(1);
      expect(instances[0].auth).toEqual({
        type: 'custom',
        headers: {
          'X-API-Key': 'custom-key',
          'X-Custom-Header': 'custom-value',
        },
      });
    });

    it('should parse multiple instances', () => {
      const json = JSON.stringify([
        {
          id: 'hs-ke',
          name: 'HS Kempten',
          endpoint: 'https://ke.lrs.haski.app/xapi',
          auth: {
            type: 'basic',
            username: 'key1',
            password: 'secret1',
          },
        },
        {
          id: 'hs-rv',
          name: 'HS Ravensburg',
          endpoint: 'https://rv.lrs.haski.app/xapi',
          auth: {
            type: 'basic',
            key: 'key2',
            secret: 'secret2',
          },
        },
      ]);

      const instances = parseLRSInstancesFromJSON(json);

      expect(instances).toHaveLength(2);
      expect(instances[0].id).toBe('hs-ke');
      expect(instances[1].id).toBe('hs-rv');
    });

    it('should apply default timeoutMs of 10000', () => {
      const json = JSON.stringify([
        {
          id: 'hs-ke',
          name: 'HS Kempten',
          endpoint: 'https://ke.lrs.haski.app/xapi',
          auth: {
            type: 'basic',
            username: 'key',
            password: 'secret',
          },
        },
      ]);

      const instances = parseLRSInstancesFromJSON(json);

      expect(instances[0].timeoutMs).toBe(10000);
    });

    it('should reject invalid JSON', () => {
      const invalidJson = '{invalid json}';

      expect(() => parseLRSInstancesFromJSON(invalidJson)).toThrow(
        /Failed to parse LRS_INSTANCES JSON/,
      );
    });

    it('should reject non-array JSON', () => {
      const json = JSON.stringify({ id: 'single-object' });

      expect(() => parseLRSInstancesFromJSON(json)).toThrow(
        /LRS_INSTANCES must be a JSON array/,
      );
    });

    it('should reject empty array', () => {
      const json = JSON.stringify([]);

      expect(() => parseLRSInstancesFromJSON(json)).toThrow(
        /At least one LRS instance must be configured/,
      );
    });

    it('should reject duplicate instance IDs', () => {
      const json = JSON.stringify([
        {
          id: 'hs-ke',
          name: 'HS Kempten',
          endpoint: 'https://ke.lrs.haski.app/xapi',
          auth: { type: 'basic', username: 'key1', password: 'secret1' },
        },
        {
          id: 'hs-ke', // Duplicate ID
          name: 'HS Kempten Duplicate',
          endpoint: 'https://ke2.lrs.haski.app/xapi',
          auth: { type: 'basic', username: 'key2', password: 'secret2' },
        },
      ]);

      expect(() => parseLRSInstancesFromJSON(json)).toThrow(
        /Duplicate LRS instance ID 'hs-ke'/,
      );
    });

    it('should reject invalid endpoint (non-HTTP/HTTPS)', () => {
      const json = JSON.stringify([
        {
          id: 'hs-ke',
          name: 'HS Kempten',
          endpoint: 'ftp://ke.lrs.haski.app/xapi', // Invalid protocol
          auth: { type: 'basic', username: 'key', password: 'secret' },
        },
      ]);

      expect(() => parseLRSInstancesFromJSON(json)).toThrow(
        /Invalid LRS instance configuration/,
      );
    });

    it('should reject missing auth', () => {
      const json = JSON.stringify([
        {
          id: 'hs-ke',
          name: 'HS Kempten',
          endpoint: 'https://ke.lrs.haski.app/xapi',
          // Missing auth
        },
      ]);

      expect(() => parseLRSInstancesFromJSON(json)).toThrow(
        /Invalid LRS instance configuration/,
      );
    });

    it('should reject basic auth without credentials', () => {
      const json = JSON.stringify([
        {
          id: 'hs-ke',
          name: 'HS Kempten',
          endpoint: 'https://ke.lrs.haski.app/xapi',
          auth: {
            type: 'basic',
            // Missing username/password or key/secret
          },
        },
      ]);

      expect(() => parseLRSInstancesFromJSON(json)).toThrow(
        /Invalid LRS instance configuration/,
      );
    });

    it('should reject bearer auth without token', () => {
      const json = JSON.stringify([
        {
          id: 'hs-ke',
          name: 'HS Kempten',
          endpoint: 'https://ke.lrs.haski.app/xapi',
          auth: {
            type: 'bearer',
            // Missing token
          },
        },
      ]);

      expect(() => parseLRSInstancesFromJSON(json)).toThrow(
        /Invalid LRS instance configuration/,
      );
    });

    it('should reject custom auth without headers', () => {
      const json = JSON.stringify([
        {
          id: 'hs-ke',
          name: 'HS Kempten',
          endpoint: 'https://ke.lrs.haski.app/xapi',
          auth: {
            type: 'custom',
            // Missing headers
          },
        },
      ]);

      expect(() => parseLRSInstancesFromJSON(json)).toThrow(
        /Invalid LRS instance configuration/,
      );
    });
  });

  describe('Prefixed Env Vars Parsing - parseLRSInstancesFromPrefixedEnvVars', () => {
    it('should parse single instance with basic auth (username/password)', () => {
      const env = {
        LRS_HS_KE_ENDPOINT: 'https://ke.lrs.haski.app/xapi',
        LRS_HS_KE_NAME: 'HS Kempten',
        LRS_HS_KE_AUTH_TYPE: 'basic',
        LRS_HS_KE_USERNAME: 'apiKey',
        LRS_HS_KE_PASSWORD: 'apiSecret',
        LRS_HS_KE_TIMEOUT_MS: '15000',
      };

      const instances = parseLRSInstancesFromPrefixedEnvVars(env);

      expect(instances).toHaveLength(1);
      expect(instances[0]).toMatchObject({
        id: 'hs-ke',
        name: 'HS Kempten',
        endpoint: 'https://ke.lrs.haski.app/xapi',
        timeoutMs: 15000,
        auth: {
          type: 'basic',
          username: 'apiKey',
          password: 'apiSecret',
        },
      });
    });

    it('should parse single instance with basic auth (key/secret)', () => {
      const env = {
        LRS_HS_RV_ENDPOINT: 'https://rv.lrs.haski.app/xapi',
        LRS_HS_RV_AUTH_TYPE: 'basic',
        LRS_HS_RV_KEY: 'apiKey2',
        LRS_HS_RV_SECRET: 'apiSecret2',
      };

      const instances = parseLRSInstancesFromPrefixedEnvVars(env);

      expect(instances).toHaveLength(1);
      expect(instances[0].auth).toEqual({
        type: 'basic',
        username: 'apiKey2',
        password: 'apiSecret2',
      });
    });

    it('should use default timeoutMs of 10000 if not specified', () => {
      const env = {
        LRS_HS_KE_ENDPOINT: 'https://ke.lrs.haski.app/xapi',
        LRS_HS_KE_AUTH_TYPE: 'basic',
        LRS_HS_KE_USERNAME: 'key',
        LRS_HS_KE_PASSWORD: 'secret',
      };

      const instances = parseLRSInstancesFromPrefixedEnvVars(env);

      expect(instances[0].timeoutMs).toBe(10000);
    });

    it('should use ID as name if name not specified', () => {
      const env = {
        LRS_HS_KE_ENDPOINT: 'https://ke.lrs.haski.app/xapi',
        LRS_HS_KE_AUTH_TYPE: 'basic',
        LRS_HS_KE_USERNAME: 'key',
        LRS_HS_KE_PASSWORD: 'secret',
      };

      const instances = parseLRSInstancesFromPrefixedEnvVars(env);

      expect(instances[0].name).toBe('hs-ke');
    });

    it('should parse multiple instances', () => {
      const env = {
        LRS_HS_KE_ENDPOINT: 'https://ke.lrs.haski.app/xapi',
        LRS_HS_KE_AUTH_TYPE: 'basic',
        LRS_HS_KE_USERNAME: 'key1',
        LRS_HS_KE_PASSWORD: 'secret1',
        LRS_HS_RV_ENDPOINT: 'https://rv.lrs.haski.app/xapi',
        LRS_HS_RV_AUTH_TYPE: 'basic',
        LRS_HS_RV_KEY: 'key2',
        LRS_HS_RV_SECRET: 'secret2',
      };

      const instances = parseLRSInstancesFromPrefixedEnvVars(env);

      expect(instances).toHaveLength(2);
      expect(instances.map((i) => i.id).sort()).toEqual(['hs-ke', 'hs-rv']);
    });

    it('should parse bearer auth', () => {
      const env = {
        LRS_HS_AA_ENDPOINT: 'https://aa.lrs.haski.app/xapi',
        LRS_HS_AA_AUTH_TYPE: 'bearer',
        LRS_HS_AA_TOKEN: 'bearer-token-123',
      };

      const instances = parseLRSInstancesFromPrefixedEnvVars(env);

      expect(instances[0].auth).toEqual({
        type: 'bearer',
        token: 'bearer-token-123',
      });
    });

    it('should parse custom auth with headers', () => {
      const env = {
        LRS_HS_CUSTOM_ENDPOINT: 'https://custom.lrs.haski.app/xapi',
        LRS_HS_CUSTOM_AUTH_TYPE: 'custom',
        LRS_HS_CUSTOM_HEADERS: 'X-API-Key:key123, X-Custom:value456',
      };

      const instances = parseLRSInstancesFromPrefixedEnvVars(env);

      expect(instances[0].auth).toEqual({
        type: 'custom',
        headers: {
          'X-API-Key': 'key123',
          'X-Custom': 'value456',
        },
      });
    });

    it('should return empty array if no instances found', () => {
      const env = {
        OTHER_VAR: 'value',
      };

      const instances = parseLRSInstancesFromPrefixedEnvVars(env);

      expect(instances).toHaveLength(0);
    });

    it('should return empty array if endpoint missing (no instance detected)', () => {
      const env = {
        LRS_HS_KE_AUTH_TYPE: 'basic',
        LRS_HS_KE_USERNAME: 'key',
        LRS_HS_KE_PASSWORD: 'secret',
      };

      // Without LRS_HS_KE_ENDPOINT, the instance is not detected at all
      const instances = parseLRSInstancesFromPrefixedEnvVars(env);

      expect(instances).toHaveLength(0);
    });

    it('should reject missing auth type', () => {
      const env = {
        LRS_HS_KE_ENDPOINT: 'https://ke.lrs.haski.app/xapi',
        LRS_HS_KE_USERNAME: 'key',
        LRS_HS_KE_PASSWORD: 'secret',
      };

      expect(() => parseLRSInstancesFromPrefixedEnvVars(env)).toThrow(
        /Missing LRS_HS_KE_AUTH_TYPE/,
      );
    });

    it('should reject basic auth without credentials', () => {
      const env = {
        LRS_HS_KE_ENDPOINT: 'https://ke.lrs.haski.app/xapi',
        LRS_HS_KE_AUTH_TYPE: 'basic',
        // Missing credentials
      };

      expect(() => parseLRSInstancesFromPrefixedEnvVars(env)).toThrow(
        /Missing credentials for LRS instance/,
      );
    });

    it('should reject bearer auth without token', () => {
      const env = {
        LRS_HS_KE_ENDPOINT: 'https://ke.lrs.haski.app/xapi',
        LRS_HS_KE_AUTH_TYPE: 'bearer',
        // Missing token
      };

      expect(() => parseLRSInstancesFromPrefixedEnvVars(env)).toThrow(
        /Missing LRS_HS_KE_TOKEN/,
      );
    });

    it('should reject custom auth without headers', () => {
      const env = {
        LRS_HS_KE_ENDPOINT: 'https://ke.lrs.haski.app/xapi',
        LRS_HS_KE_AUTH_TYPE: 'custom',
        // Missing headers
      };

      expect(() => parseLRSInstancesFromPrefixedEnvVars(env)).toThrow(
        /Missing LRS_HS_KE_HEADERS/,
      );
    });

    it('should reject invalid auth type', () => {
      const env = {
        LRS_HS_KE_ENDPOINT: 'https://ke.lrs.haski.app/xapi',
        LRS_HS_KE_AUTH_TYPE: 'invalid-type',
      };

      expect(() => parseLRSInstancesFromPrefixedEnvVars(env)).toThrow(
        /Invalid LRS_HS_KE_AUTH_TYPE 'invalid-type'/,
      );
    });

    it('should reject invalid custom headers format', () => {
      const env = {
        LRS_HS_KE_ENDPOINT: 'https://ke.lrs.haski.app/xapi',
        LRS_HS_KE_AUTH_TYPE: 'custom',
        LRS_HS_KE_HEADERS: 'invalid-format',
      };

      expect(() => parseLRSInstancesFromPrefixedEnvVars(env)).toThrow(
        /Invalid LRS_HS_KE_HEADERS format/,
      );
    });
  });

  describe('Unified Parsing - parseLRSInstances', () => {
    it('should prioritize JSON array over prefixed env vars', () => {
      const env = {
        LRS_INSTANCES: JSON.stringify([
          {
            id: 'json-instance',
            name: 'JSON Instance',
            endpoint: 'https://json.lrs.haski.app/xapi',
            auth: { type: 'basic', username: 'key', password: 'secret' },
          },
        ]),
        LRS_HS_KE_ENDPOINT: 'https://ke.lrs.haski.app/xapi',
        LRS_HS_KE_AUTH_TYPE: 'basic',
        LRS_HS_KE_USERNAME: 'key2',
        LRS_HS_KE_PASSWORD: 'secret2',
      };

      const instances = parseLRSInstances(env);

      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe('json-instance');
    });

    it('should fall back to prefixed env vars if no JSON array', () => {
      const env = {
        LRS_HS_KE_ENDPOINT: 'https://ke.lrs.haski.app/xapi',
        LRS_HS_KE_AUTH_TYPE: 'basic',
        LRS_HS_KE_USERNAME: 'key',
        LRS_HS_KE_PASSWORD: 'secret',
      };

      const instances = parseLRSInstances(env);

      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe('hs-ke');
    });

    it('should throw error if no instances configured', () => {
      const env = {};

      expect(() => parseLRSInstances(env)).toThrow(
        /No LRS instances configured/,
      );
    });
  });

  describe('Credential Redaction - redactLRSInstancesForLogging', () => {
    it('should redact basic auth credentials', () => {
      const instances: LRSInstance[] = [
        {
          id: 'hs-ke',
          name: 'HS Kempten',
          endpoint: 'https://ke.lrs.haski.app/xapi',
          timeoutMs: 10000,
          auth: {
            type: 'basic',
            username: 'secret-username',
            password: 'secret-password',
          },
        },
      ];

      const redacted = redactLRSInstancesForLogging(instances);

      expect(redacted).toHaveLength(1);
      expect(redacted[0]).toEqual({
        id: 'hs-ke',
        name: 'HS Kempten',
        endpoint: 'https://ke.lrs.haski.app/xapi',
        authType: 'basic',
      });
      expect(redacted[0]).not.toHaveProperty('username');
      expect(redacted[0]).not.toHaveProperty('password');
    });

    it('should redact bearer token', () => {
      const instances: LRSInstance[] = [
        {
          id: 'hs-aa',
          name: 'HS Aschaffenburg',
          endpoint: 'https://aa.lrs.haski.app/xapi',
          auth: {
            type: 'bearer',
            token: 'secret-token-123',
          },
        },
      ];

      const redacted = redactLRSInstancesForLogging(instances);

      expect(redacted[0]).toEqual({
        id: 'hs-aa',
        name: 'HS Aschaffenburg',
        endpoint: 'https://aa.lrs.haski.app/xapi',
        authType: 'bearer',
      });
      expect(redacted[0]).not.toHaveProperty('token');
    });

    it('should redact custom headers', () => {
      const instances: LRSInstance[] = [
        {
          id: 'hs-custom',
          name: 'HS Custom',
          endpoint: 'https://custom.lrs.haski.app/xapi',
          auth: {
            type: 'custom',
            headers: {
              'X-API-Key': 'secret-key',
              'X-Secret': 'secret-value',
            },
          },
        },
      ];

      const redacted = redactLRSInstancesForLogging(instances);

      expect(redacted[0]).toEqual({
        id: 'hs-custom',
        name: 'HS Custom',
        endpoint: 'https://custom.lrs.haski.app/xapi',
        authType: 'custom',
      });
      expect(redacted[0]).not.toHaveProperty('headers');
    });
  });

  describe('Instance Schema Validation - lrsInstanceSchema', () => {
    it('should validate valid instance with all fields', () => {
      const instance = {
        id: 'hs-ke',
        name: 'HS Kempten',
        endpoint: 'https://ke.lrs.haski.app/xapi',
        timeoutMs: 10000,
        auth: {
          type: 'basic',
          username: 'key',
          password: 'secret',
        },
      };

      const { error } = lrsInstanceSchema.validate(instance);

      expect(error).toBeUndefined();
    });

    it('should reject ID with uppercase letters', () => {
      const instance = {
        id: 'HS-KE', // Invalid: uppercase
        name: 'HS Kempten',
        endpoint: 'https://ke.lrs.haski.app/xapi',
        auth: { type: 'basic', username: 'key', password: 'secret' },
      };

      const { error } = lrsInstanceSchema.validate(instance);

      expect(error).toBeDefined();
      expect(error?.message).toContain('id');
    });

    it('should reject ID with special characters', () => {
      const instance = {
        id: 'hs_ke!', // Invalid: underscore and special char
        name: 'HS Kempten',
        endpoint: 'https://ke.lrs.haski.app/xapi',
        auth: { type: 'basic', username: 'key', password: 'secret' },
      };

      const { error } = lrsInstanceSchema.validate(instance);

      expect(error).toBeDefined();
    });

    it('should accept ID with hyphens and numbers', () => {
      const instance = {
        id: 'hs-ke-01',
        name: 'HS Kempten',
        endpoint: 'https://ke.lrs.haski.app/xapi',
        auth: { type: 'basic', username: 'key', password: 'secret' },
      };

      const { error } = lrsInstanceSchema.validate(instance);

      expect(error).toBeUndefined();
    });

    it('should reject timeout less than 1000ms', () => {
      const instance = {
        id: 'hs-ke',
        name: 'HS Kempten',
        endpoint: 'https://ke.lrs.haski.app/xapi',
        timeoutMs: 500,
        auth: { type: 'basic', username: 'key', password: 'secret' },
      };

      const { error } = lrsInstanceSchema.validate(instance);

      expect(error).toBeDefined();
      expect(error?.message).toContain('timeoutMs');
    });

    it('should reject missing required fields', () => {
      const instance = {
        id: 'hs-ke',
        // Missing name, endpoint, auth
      };

      const { error } = lrsInstanceSchema.validate(instance);

      expect(error).toBeDefined();
    });
  });
});
