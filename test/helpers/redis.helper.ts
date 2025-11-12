// REQ-FN-018: E2E Test Helper - Redis Test Management
// Provides utilities for managing test Redis instances

import Redis from 'ioredis';
import { TEST_CONFIG } from '../constants';

let testRedisClient: Redis | null = null;

/**
 * Setup test Redis client
 * @returns Redis client instance
 */
export async function setupTestRedis(): Promise<Redis> {
  if (testRedisClient && testRedisClient.status === 'ready') {
    return testRedisClient;
  }

  testRedisClient = new Redis({
    host: TEST_CONFIG.REDIS_HOST,
    port: TEST_CONFIG.REDIS_PORT,
    db: TEST_CONFIG.REDIS_DB,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      // Retry up to 3 times with exponential backoff
      if (times > 3) {
        return null; // Stop retrying
      }
      return Math.min(times * 100, 1000);
    },
    lazyConnect: false,
  });

  // Wait for connection to be ready
  await testRedisClient.ping();

  return testRedisClient;
}

/**
 * Cleanup test Redis - flush database and close connection
 */
export async function cleanupTestRedis(): Promise<void> {
  if (testRedisClient) {
    try {
      // Flush test database
      await testRedisClient.flushdb();
      // Close connection
      await testRedisClient.quit();
    } catch {
      // Force disconnect if quit fails
      testRedisClient.disconnect();
    } finally {
      testRedisClient = null;
    }
  }
}

/**
 * Clear all keys in test Redis database
 */
export async function clearTestRedis(): Promise<void> {
  if (testRedisClient) {
    await testRedisClient.flushdb();
  }
}

/**
 * Get test Redis client
 * @returns Current Redis client or null
 */
export function getTestRedisClient(): Redis | null {
  return testRedisClient;
}

/**
 * Check if test Redis is available and connected
 * @returns True if Redis is ready
 */
export async function isTestRedisReady(): Promise<boolean> {
  if (!testRedisClient || testRedisClient.status !== 'ready') {
    return false;
  }

  try {
    await testRedisClient.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Set a key-value pair in test Redis
 * @param key - Redis key
 * @param value - Value to store
 * @param ttl - Optional TTL in seconds
 */
export async function setTestKey(
  key: string,
  value: string,
  ttl?: number,
): Promise<void> {
  if (!testRedisClient) {
    throw new Error('Test Redis client not initialized');
  }

  if (ttl) {
    await testRedisClient.setex(key, ttl, value);
  } else {
    await testRedisClient.set(key, value);
  }
}

/**
 * Get a value from test Redis
 * @param key - Redis key
 * @returns Value or null if not found
 */
export async function getTestKey(key: string): Promise<string | null> {
  if (!testRedisClient) {
    throw new Error('Test Redis client not initialized');
  }

  return testRedisClient.get(key);
}

/**
 * Delete a key from test Redis
 * @param key - Redis key
 */
export async function deleteTestKey(key: string): Promise<void> {
  if (!testRedisClient) {
    throw new Error('Test Redis client not initialized');
  }

  await testRedisClient.del(key);
}

/**
 * Get all keys matching a pattern
 * @param pattern - Redis key pattern (e.g., 'cache:*')
 * @returns Array of matching keys
 */
export async function getTestKeys(pattern: string): Promise<string[]> {
  if (!testRedisClient) {
    throw new Error('Test Redis client not initialized');
  }

  return testRedisClient.keys(pattern);
}
