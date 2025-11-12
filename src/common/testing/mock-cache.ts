// REQ-NF-020: Mock Cache/Redis Service for Testing
// Provides mock implementations for Redis and cache operations

import { Redis } from 'ioredis';

/**
 * Mock Redis client for testing
 * Implements common Redis methods as jest mock functions
 */
export interface MockRedis extends Partial<Redis> {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  exists: jest.Mock;
  expire: jest.Mock;
  ttl: jest.Mock;
  keys: jest.Mock;
  flushdb: jest.Mock;
  ping: jest.Mock;
  quit: jest.Mock;
  disconnect: jest.Mock;
}

/**
 * Creates a mock Redis client with in-memory storage
 * Simulates basic Redis operations for testing without requiring a real Redis instance
 *
 * @returns Mock Redis client with test-friendly implementations
 *
 * @example
 * ```typescript
 * const mockRedis = createMockRedis();
 * await mockRedis.set('key', 'value');
 * const result = await mockRedis.get('key');
 * expect(result).toBe('value');
 * ```
 */
export function createMockRedis(): MockRedis {
  const storage = new Map<string, string>();
  const expirations = new Map<string, number>();

  const mockRedis: MockRedis = {
    get: jest.fn((key: string) => {
      // Check if key is expired
      const expiry = expirations.get(key);
      if (expiry && Date.now() > expiry) {
        storage.delete(key);
        expirations.delete(key);
        return Promise.resolve(null);
      }
      return Promise.resolve(storage.get(key) || null);
    }),

    set: jest.fn((key: string, value: string, ...args: any[]) => {
      storage.set(key, value);

      // Handle EX (seconds) option
      if (args[0] === 'EX' && typeof args[1] === 'number') {
        const ttl = args[1] * 1000; // Convert to milliseconds
        expirations.set(key, Date.now() + ttl);
      }

      return Promise.resolve('OK');
    }),

    del: jest.fn((...keys: string[]) => {
      let deleted = 0;
      keys.forEach((key) => {
        if (storage.has(key)) {
          // Check if key is expired
          const expiry = expirations.get(key);
          if (expiry && Date.now() > expiry) {
            // Already expired, don't count as deleted
            storage.delete(key);
            expirations.delete(key);
          } else {
            // Valid key, count as deleted
            storage.delete(key);
            expirations.delete(key);
            deleted++;
          }
        }
      });
      return Promise.resolve(deleted);
    }),

    exists: jest.fn((...keys: string[]) => {
      return Promise.resolve(
        keys.filter((key) => {
          if (!storage.has(key)) return false;
          const expiry = expirations.get(key);
          if (expiry && Date.now() > expiry) {
            storage.delete(key);
            expirations.delete(key);
            return false;
          }
          return true;
        }).length,
      );
    }),

    expire: jest.fn((key: string, seconds: number) => {
      // Check if key is expired
      const existingExpiry = expirations.get(key);
      if (existingExpiry && Date.now() > existingExpiry) {
        storage.delete(key);
        expirations.delete(key);
        return Promise.resolve(0);
      }
      if (!storage.has(key)) return Promise.resolve(0);
      expirations.set(key, Date.now() + seconds * 1000);
      return Promise.resolve(1);
    }),

    ttl: jest.fn((key: string) => {
      if (!storage.has(key)) return Promise.resolve(-2); // Key doesn't exist
      const expiry = expirations.get(key);
      if (!expiry) return Promise.resolve(-1); // Key doesn't have expiration
      const remaining = Math.ceil((expiry - Date.now()) / 1000);
      return Promise.resolve(remaining > 0 ? remaining : -2);
    }),

    keys: jest.fn((pattern: string) => {
      const regex = new RegExp(
        pattern.replace(/\*/g, '.*').replace(/\?/g, '.'),
      );
      return Promise.resolve(
        Array.from(storage.keys()).filter((key) => regex.test(key)),
      );
    }),

    flushdb: jest.fn(() => {
      storage.clear();
      expirations.clear();
      return Promise.resolve('OK');
    }),

    ping: jest.fn(() => Promise.resolve('PONG')),

    quit: jest.fn(() => Promise.resolve('OK')),

    disconnect: jest.fn(() => Promise.resolve()),
  };

  return mockRedis;
}

/**
 * Mock cache service interface
 * Generic cache service with common cache operations
 */
export interface MockCacheService {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  clear: jest.Mock;
  has: jest.Mock;
}

/**
 * Creates a mock cache service with in-memory storage
 * Higher-level abstraction over Redis for application caching
 *
 * @returns Mock cache service
 *
 * @example
 * ```typescript
 * const mockCache = createMockCache();
 * await mockCache.set('metric:123', { data: 'value' }, 3600);
 * const result = await mockCache.get('metric:123');
 * ```
 */
export function createMockCache(): MockCacheService {
  const storage = new Map<string, unknown>();

  return {
    get: jest.fn((key: string) => {
      return Promise.resolve(storage.get(key) || null);
    }),

    set: jest.fn((key: string, value: unknown) => {
      storage.set(key, value);
      return Promise.resolve(true);
    }),

    del: jest.fn((key: string) => {
      return Promise.resolve(storage.delete(key));
    }),

    clear: jest.fn(() => {
      storage.clear();
      return Promise.resolve(true);
    }),

    has: jest.fn((key: string) => {
      return Promise.resolve(storage.has(key));
    }),
  };
}

/**
 * Creates a mock cache provider for NestJS dependency injection
 * @param token - Injection token (e.g., 'ICacheService' or CacheService class)
 * @returns Provider configuration
 *
 * @example
 * ```typescript
 * const module = await Test.createTestingModule({
 *   providers: [
 *     MyService,
 *     getMockCacheProvider('ICacheService'),
 *   ],
 * }).compile();
 * ```
 */

export function getMockCacheProvider(token: any = 'ICacheService') {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    provide: token,
    useValue: createMockCache(),
  };
}

/**
 * Creates a mock Redis provider for NestJS dependency injection
 * @param token - Injection token (default: 'REDIS_CLIENT')
 * @returns Provider configuration
 */
export function getMockRedisProvider(token: string = 'REDIS_CLIENT') {
  return {
    provide: token,
    useValue: createMockRedis(),
  };
}
