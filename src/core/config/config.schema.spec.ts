// Unit tests for REQ-FN-014: Environment variable validation
// Tests validation schema with valid and invalid configurations

import { configValidationSchema, configFactory } from './config.schema';

// Note: Joi's validate() returns `any` for the value property.
// We disable unsafe-member-access for this test file since we're explicitly
// testing the validation schema's behavior and structure.

describe('REQ-FN-014: Configuration Validation Schema', () => {
  // Store original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Valid Configuration', () => {
    it('should validate a complete valid configuration', () => {
      const validConfig = {
        NODE_ENV: 'development',
        PORT: 3000,
        API_PREFIX: 'api/v1',
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        JWT_EXPIRATION: '1h',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: 'redis-password',
        REDIS_TTL: 3600,
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-lrs-api-key',
        LRS_TIMEOUT: 10000,
        LOG_LEVEL: 'log',
      };

      const result = configValidationSchema.validate(validConfig);

      expect(result.error).toBeUndefined();
      expect(result.value).toBeDefined();
      expect(result.value.NODE_ENV).toBe('development');
      expect(result.value.JWT_SECRET).toBe(
        'test-secret-key-with-min-32-chars-long',
      );
    });

    it('should apply default values for optional fields', () => {
      const minimalConfig = {
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-lrs-api-key',
      };

      const result = configValidationSchema.validate(minimalConfig);

      expect(result.error).toBeUndefined();
      expect(result.value.NODE_ENV).toBe('development');
      expect(result.value.PORT).toBe(3000);
      expect(result.value.API_PREFIX).toBe('api/v1');
      expect(result.value.JWT_EXPIRATION).toBe('1h');
      expect(result.value.REDIS_HOST).toBe('localhost');
      expect(result.value.REDIS_PORT).toBe(6379);
      expect(result.value.REDIS_TTL).toBe(3600);
      expect(result.value.LRS_TIMEOUT).toBe(10000);
      expect(result.value.LOG_LEVEL).toBe('log');
    });

    it('should accept optional REDIS_PASSWORD as empty string', () => {
      const config = {
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-lrs-api-key',
        REDIS_PASSWORD: '',
      };

      const { error } = configValidationSchema.validate(config);

      expect(error).toBeUndefined();
    });

    it('should accept all valid NODE_ENV values', () => {
      const environments = ['development', 'production', 'test'];

      environments.forEach((env) => {
        const config = {
          NODE_ENV: env,
          JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
          LRS_URL: 'https://lrs.example.com/xapi',
          LRS_API_KEY: 'test-lrs-api-key',
        };

        const { error } = configValidationSchema.validate(config);

        expect(error).toBeUndefined();
      });
    });

    it('should accept all valid LOG_LEVEL values', () => {
      const logLevels = ['error', 'warn', 'log', 'debug', 'verbose'];

      logLevels.forEach((level) => {
        const config = {
          LOG_LEVEL: level,
          JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
          LRS_URL: 'https://lrs.example.com/xapi',
          LRS_API_KEY: 'test-lrs-api-key',
        };

        const { error } = configValidationSchema.validate(config);

        expect(error).toBeUndefined();
      });
    });

    it('should accept valid JWT expiration patterns', () => {
      const expirationPatterns = ['30s', '5m', '1h', '7d', '365d'];

      expirationPatterns.forEach((pattern) => {
        const config = {
          JWT_EXPIRATION: pattern,
          JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
          LRS_URL: 'https://lrs.example.com/xapi',
          LRS_API_KEY: 'test-lrs-api-key',
        };

        const { error } = configValidationSchema.validate(config);

        expect(error).toBeUndefined();
      });
    });
  });

  describe('Invalid Configuration - Required Fields', () => {
    it('should reject missing JWT_SECRET', () => {
      const config = {
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-lrs-api-key',
      };

      const { error } = configValidationSchema.validate(config);

      expect(error).toBeDefined();
      expect(error?.message).toContain('JWT_SECRET');
      expect(error?.message).toContain('required');
    });

    // REQ-FN-026: LRS_URL and LRS_API_KEY are now optional (backward compatible)
    // Multi-LRS config takes precedence via LRS_INSTANCES
    it('should accept missing LRS_URL when using multi-LRS config', () => {
      const config = {
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_INSTANCES: JSON.stringify([
          {
            id: 'hs-ke',
            name: 'HS Kempten',
            endpoint: 'https://ke.lrs.haski.app/xapi',
            auth: { type: 'basic', username: 'key', password: 'secret' },
          },
        ]),
      };

      const { error } = configValidationSchema.validate(config);

      expect(error).toBeUndefined();
    });

    it('should accept missing LRS_API_KEY when using multi-LRS config', () => {
      const config = {
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_INSTANCES: JSON.stringify([
          {
            id: 'hs-ke',
            name: 'HS Kempten',
            endpoint: 'https://ke.lrs.haski.app/xapi',
            auth: { type: 'basic', username: 'key', password: 'secret' },
          },
        ]),
      };

      const { error } = configValidationSchema.validate(config);

      expect(error).toBeUndefined();
    });
  });

  describe('Invalid Configuration - Validation Rules', () => {
    it('should reject JWT_SECRET shorter than 32 characters', () => {
      const config = {
        JWT_SECRET: 'short-secret',
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-lrs-api-key',
      };

      const { error } = configValidationSchema.validate(config);

      expect(error).toBeDefined();
      expect(error?.message).toContain('JWT_SECRET');
      expect(error?.message).toContain('32');
    });

    it('should reject invalid NODE_ENV value', () => {
      const config = {
        NODE_ENV: 'invalid-env',
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-lrs-api-key',
      };

      const { error } = configValidationSchema.validate(config);

      expect(error).toBeDefined();
      expect(error?.message).toContain('NODE_ENV');
    });

    it('should reject invalid LOG_LEVEL value', () => {
      const config = {
        LOG_LEVEL: 'invalid-level',
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-lrs-api-key',
      };

      const { error } = configValidationSchema.validate(config);

      expect(error).toBeDefined();
      expect(error?.message).toContain('LOG_LEVEL');
    });

    it('should reject invalid LRS_URL format', () => {
      const config = {
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_URL: 'not-a-valid-url',
        LRS_API_KEY: 'test-lrs-api-key',
      };

      const { error } = configValidationSchema.validate(config);

      expect(error).toBeDefined();
      expect(error?.message).toContain('LRS_URL');
      expect(error?.message).toContain('uri');
    });

    it('should reject invalid PORT value', () => {
      const config = {
        PORT: 99999, // Invalid port number (> 65535)
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-lrs-api-key',
      };

      const { error } = configValidationSchema.validate(config);

      expect(error).toBeDefined();
      expect(error?.message).toContain('PORT');
    });

    it('should reject invalid REDIS_PORT value', () => {
      const config = {
        REDIS_PORT: -1,
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-lrs-api-key',
      };

      const { error } = configValidationSchema.validate(config);

      expect(error).toBeDefined();
      expect(error?.message).toContain('REDIS_PORT');
    });

    it('should reject invalid JWT_EXPIRATION pattern', () => {
      const config = {
        JWT_EXPIRATION: 'invalid-pattern',
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-lrs-api-key',
      };

      const { error } = configValidationSchema.validate(config);

      expect(error).toBeDefined();
      expect(error?.message).toContain('JWT_EXPIRATION');
    });

    it('should reject LRS_TIMEOUT less than 1000ms', () => {
      const config = {
        LRS_TIMEOUT: 500,
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-lrs-api-key',
      };

      const { error } = configValidationSchema.validate(config);

      expect(error).toBeDefined();
      expect(error?.message).toContain('LRS_TIMEOUT');
    });

    it('should reject negative REDIS_TTL', () => {
      const config = {
        REDIS_TTL: -100,
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-lrs-api-key',
      };

      const { error } = configValidationSchema.validate(config);

      expect(error).toBeDefined();
      expect(error?.message).toContain('REDIS_TTL');
    });
  });

  describe('Configuration Factory', () => {
    it('should create typed configuration object from environment', () => {
      process.env = {
        NODE_ENV: 'test',
        PORT: '4000',
        API_PREFIX: 'api/v2',
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        JWT_EXPIRATION: '2h',
        REDIS_HOST: 'redis-server',
        REDIS_PORT: '6380',
        REDIS_PASSWORD: 'test-password',
        REDIS_TTL: '7200',
        LRS_URL: 'https://test-lrs.example.com/xapi',
        LRS_API_KEY: 'test-api-key',
        LRS_TIMEOUT: '15000',
        LOG_LEVEL: 'debug',
      };

      const config = configFactory();

      expect(config.app.nodeEnv).toBe('test');
      expect(config.app.port).toBe(4000);
      expect(config.app.apiPrefix).toBe('api/v2');
      expect(config.jwt.secret).toBe('test-secret-key-with-min-32-chars-long');
      expect(config.jwt.expirationTime).toBe('2h');
      expect(config.redis.host).toBe('redis-server');
      expect(config.redis.port).toBe(6380);
      expect(config.redis.password).toBe('test-password');
      expect(config.redis.ttl).toBe(7200);
      expect(config.lrs.url).toBe('https://test-lrs.example.com/xapi');
      expect(config.lrs.apiKey).toBe('test-api-key');
      expect(config.lrs.timeout).toBe(15000);
      expect(config.log.level).toBe('debug');
    });

    it('should use default values when environment variables are not set', () => {
      process.env = {
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-api-key',
      };

      const config = configFactory();

      expect(config.app.port).toBe(3000);
      expect(config.app.apiPrefix).toBe('api/v1');
      expect(config.jwt.expirationTime).toBe('1h');
      expect(config.redis.host).toBe('localhost');
      expect(config.redis.port).toBe(6379);
      expect(config.redis.ttl).toBe(3600);
      expect(config.lrs.timeout).toBe(10000);
      expect(config.log.level).toBe('log');
    });

    it('should handle optional REDIS_PASSWORD correctly', () => {
      process.env = {
        JWT_SECRET: 'test-secret-key-with-min-32-chars-long',
        LRS_URL: 'https://lrs.example.com/xapi',
        LRS_API_KEY: 'test-api-key',
      };

      const config = configFactory();

      expect(config.redis.password).toBeUndefined();
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should report all validation errors at once (abortEarly: false)', () => {
      const config = {
        NODE_ENV: 'invalid',
        PORT: 99999,
        JWT_SECRET: 'short', // Too short
        LOG_LEVEL: 'invalid',
        // Missing required: LRS_URL, LRS_API_KEY
      };

      const { error } = configValidationSchema.validate(config, {
        abortEarly: false,
      });

      expect(error).toBeDefined();
      expect(error?.details).toBeDefined();
      expect(error!.details.length).toBeGreaterThan(1);
    });
  });
});
