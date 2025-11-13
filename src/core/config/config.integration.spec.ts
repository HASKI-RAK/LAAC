// Integration test for REQ-FN-026: Multi-LRS Configuration Schema
// Verifies that configuration loads correctly with multi-LRS setup

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configFactory, configValidationSchema } from './config.schema';
import { Configuration } from './config.interface';

describe('REQ-FN-026: Multi-LRS Configuration Integration', () => {
  let configService: ConfigService<Configuration>;

  beforeEach(() => {
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('JSON Array Configuration', () => {
    it('should load multi-LRS configuration from JSON array', async () => {
      process.env.JWT_SECRET = 'test-secret-key-with-min-32-chars-long';
      process.env.LRS_INSTANCES = JSON.stringify([
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

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            cache: true,
            load: [configFactory],
            validationSchema: configValidationSchema,
            validationOptions: {
              allowUnknown: true,
              abortEarly: false,
            },
          }),
        ],
      }).compile();

      configService = module.get<ConfigService<Configuration>>(ConfigService);

      const lrsConfig = configService.get('lrs', { infer: true });

      expect(lrsConfig).toBeDefined();
      expect(lrsConfig?.instances).toHaveLength(2);
      expect(lrsConfig?.instances[0]).toMatchObject({
        id: 'hs-ke',
        name: 'HS Kempten',
        endpoint: 'https://ke.lrs.haski.app/xapi',
      });
      expect(lrsConfig?.instances[1]).toMatchObject({
        id: 'hs-rv',
        name: 'HS Ravensburg',
        endpoint: 'https://rv.lrs.haski.app/xapi',
      });

      // Verify console log called with redacted instances
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[ConfigService] Loaded LRS instances:'),
        expect.any(String),
      );
    });
  });

  describe('Prefixed Env Vars Configuration', () => {
    it('should load multi-LRS configuration from prefixed env vars', async () => {
      process.env.JWT_SECRET = 'test-secret-key-with-min-32-chars-long';
      delete process.env.LRS_INSTANCES;
      process.env.LRS_HS_KE_ENDPOINT = 'https://ke.lrs.haski.app/xapi';
      process.env.LRS_HS_KE_NAME = 'HS Kempten';
      process.env.LRS_HS_KE_AUTH_TYPE = 'basic';
      process.env.LRS_HS_KE_USERNAME = 'apiKey';
      process.env.LRS_HS_KE_PASSWORD = 'apiSecret';
      process.env.LRS_HS_KE_TIMEOUT_MS = '15000';

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            cache: false, // Disable cache to reload env vars
            load: [configFactory],
            validationSchema: configValidationSchema,
            validationOptions: {
              allowUnknown: true,
              abortEarly: false,
            },
          }),
        ],
      }).compile();

      configService = module.get<ConfigService<Configuration>>(ConfigService);

      const lrsConfig = configService.get('lrs', { infer: true });

      expect(lrsConfig).toBeDefined();
      expect(lrsConfig?.instances).toHaveLength(1);
      expect(lrsConfig?.instances[0]).toMatchObject({
        id: 'hs-ke',
        name: 'HS Kempten',
        endpoint: 'https://ke.lrs.haski.app/xapi',
        timeoutMs: 15000,
      });
    });
  });

  describe('Legacy Single-Instance Configuration', () => {
    it('should fall back to legacy configuration when no multi-LRS config', async () => {
      process.env.JWT_SECRET = 'test-secret-key-with-min-32-chars-long';
      delete process.env.LRS_INSTANCES;
      delete process.env.LRS_HS_KE_ENDPOINT;
      process.env.LRS_URL = 'https://lrs.example.com/xapi';
      process.env.LRS_API_KEY = 'legacy-api-key';
      process.env.LRS_TIMEOUT = '12000';

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            cache: false,
            load: [configFactory],
            validationSchema: configValidationSchema,
            validationOptions: {
              allowUnknown: true,
              abortEarly: false,
            },
          }),
        ],
      }).compile();

      configService = module.get<ConfigService<Configuration>>(ConfigService);

      const lrsConfig = configService.get('lrs', { infer: true });

      expect(lrsConfig).toBeDefined();
      expect(lrsConfig?.instances).toHaveLength(1);
      expect(lrsConfig?.instances[0]).toMatchObject({
        id: 'default',
        name: 'Default LRS',
        endpoint: 'https://lrs.example.com/xapi',
        timeoutMs: 12000,
      });
      expect(lrsConfig?.url).toBe('https://lrs.example.com/xapi');
      expect(lrsConfig?.apiKey).toBe('legacy-api-key');

      // Verify console log called for legacy fallback
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[ConfigService] Using legacy single-instance'),
      );
    });
  });

  describe('Credential Redaction', () => {
    it('should not log credentials in startup messages', async () => {
      process.env.JWT_SECRET = 'test-secret-key-with-min-32-chars-long';
      process.env.LRS_INSTANCES = JSON.stringify([
        {
          id: 'hs-test',
          name: 'Test Instance',
          endpoint: 'https://test.lrs.haski.app/xapi',
          auth: {
            type: 'basic',
            username: 'SECRET_USERNAME',
            password: 'SECRET_PASSWORD',
          },
        },
      ]);

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            cache: false,
            load: [configFactory],
            validationSchema: configValidationSchema,
            validationOptions: {
              allowUnknown: true,
              abortEarly: false,
            },
          }),
        ],
      }).compile();

      configService = module.get<ConfigService<Configuration>>(ConfigService);

      // Get all console.log calls
      const consoleCalls = (console.log as jest.Mock).mock.calls;
      const allLogs = consoleCalls
        .map((call: unknown[]) => call.join(' '))
        .join('\n');

      // Verify credentials are NOT logged
      expect(allLogs).not.toContain('SECRET_USERNAME');
      expect(allLogs).not.toContain('SECRET_PASSWORD');

      // Verify non-sensitive info IS logged
      expect(allLogs).toContain('hs-test');
      expect(allLogs).toContain('Test Instance');
      expect(allLogs).toContain('https://test.lrs.haski.app/xapi');
      expect(allLogs).toContain('basic');
    });
  });
});
