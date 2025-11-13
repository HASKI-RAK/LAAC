// Implements REQ-FN-026: Multi-LRS Configuration Schema
// Defines TypeScript interfaces for multi-LRS instance configuration

/**
 * Authentication configuration for an LRS instance
 * Supports basic, bearer, and custom authentication types
 */
export type LRSAuth =
  | {
      type: 'basic';
      username: string;
      password: string;
    }
  | {
      type: 'basic';
      key: string;
      secret: string;
    }
  | {
      type: 'bearer';
      token: string;
    }
  | {
      type: 'custom';
      headers: Record<string, string>;
    };

/**
 * LRS instance configuration interface
 * Represents a single xAPI Learning Record Store instance
 *
 * @property id - Unique identifier for the instance (e.g., 'hs-ke')
 * @property name - Human-readable label (e.g., 'HS Kempten')
 * @property endpoint - xAPI base URL (typically ends with '/xapi')
 * @property timeoutMs - Optional request timeout in milliseconds (default: 10000)
 * @property auth - Authentication configuration for the LRS
 */
export interface LRSInstance {
  id: string;
  name: string;
  endpoint: string;
  timeoutMs?: number;
  auth: LRSAuth;
}

/**
 * Multi-LRS configuration interface
 * Contains array of configured LRS instances
 */
export interface MultiLRSConfig {
  instances: LRSInstance[];
}
