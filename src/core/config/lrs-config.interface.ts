// Implements REQ-FN-026: Multi-LRS Configuration Schema
// Defines TypeScript interfaces for multi-LRS instance configuration

/**
 * Authentication configuration for an LRS instance
 * Supports basic, bearer, and custom authentication types
 *
 * Note: The key/secret variant for basic auth is an input alias only.
 * It is normalized to username/password internally during parsing.
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
 * @property endpoint - xAPI base URL (e.g., 'https://lrs.example.com/xapi')
 * @property timeoutMs - Request timeout in milliseconds (default: 10000, always present after validation)
 * @property auth - Authentication configuration for the LRS
 */
export interface LRSInstance {
  id: string;
  name: string;
  endpoint: string;
  timeoutMs: number; // Default: 10000
  auth: LRSAuth;
}

/**
 * Multi-LRS configuration interface
 * Contains array of configured LRS instances
 */
export interface MultiLRSConfig {
  instances: LRSInstance[];
}
