// Implements REQ-FN-002: xAPI Learning Record Store Integration
// Defines the contract for LRS client operations with multi-instance support

/**
 * xAPI Statement structure (simplified for common fields)
 * Full spec: https://github.com/adlnet/xAPI-Spec
 *
 * REQ-FN-017: instanceId field added for multi-instance support
 */
export interface xAPIStatement {
  id?: string;
  actor: xAPIActor;
  verb: xAPIVerb;
  object: xAPIObject;
  result?: xAPIResult;
  context?: xAPIContext;
  timestamp?: string;
  stored?: string;
  authority?: xAPIAgent;
  version?: string;
  attachments?: xAPIAttachment[];
  // REQ-FN-017: Instance identifier for multi-instance support
  // Set from LRS configuration during ingestion (ADR-008)
  instanceId?: string;
}

/**
 * xAPI Actor (Agent or Group)
 * HASKI uses account-based identification
 */
export interface xAPIActor {
  objectType?: 'Agent' | 'Group';
  name?: string;
  mbox?: string;
  mbox_sha1sum?: string;
  openid?: string;
  account?: xAPIAccount;
  member?: xAPIAgent[];
}

export interface xAPIAgent {
  objectType?: 'Agent';
  name?: string;
  mbox?: string;
  mbox_sha1sum?: string;
  openid?: string;
  account?: xAPIAccount;
}

export interface xAPIAccount {
  homePage: string;
  name: string;
}

/**
 * xAPI Verb
 */
export interface xAPIVerb {
  id: string;
  display?: { [language: string]: string };
}

/**
 * xAPI Object (Activity, Agent, or Statement)
 */
export interface xAPIObject {
  objectType?: 'Activity' | 'Agent' | 'SubStatement' | 'StatementRef';
  id: string;
  definition?: xAPIActivityDefinition;
}

export interface xAPIActivityDefinition {
  name?: { [language: string]: string };
  description?: { [language: string]: string };
  type?: string;
  moreInfo?: string;
  extensions?: Record<string, unknown>;
}

/**
 * xAPI Result
 */
export interface xAPIResult {
  score?: xAPIScore;
  success?: boolean;
  completion?: boolean;
  response?: string;
  duration?: string;
  extensions?: Record<string, unknown>;
}

export interface xAPIScore {
  scaled?: number;
  raw?: number;
  min?: number;
  max?: number;
}

/**
 * xAPI Context
 */
export interface xAPIContext {
  registration?: string;
  instructor?: xAPIAgent;
  team?: xAPIGroup;
  contextActivities?: xAPIContextActivities;
  revision?: string;
  platform?: string;
  language?: string;
  statement?: xAPIStatementRef;
  extensions?: Record<string, unknown>;
}

export interface xAPIGroup {
  objectType: 'Group';
  name?: string;
  member?: xAPIAgent[];
  mbox?: string;
  account?: xAPIAccount;
}

export interface xAPIContextActivities {
  parent?: xAPIObject[];
  grouping?: xAPIObject[];
  category?: xAPIObject[];
  other?: xAPIObject[];
}

export interface xAPIStatementRef {
  objectType: 'StatementRef';
  id: string;
}

export interface xAPIAttachment {
  usageType: string;
  display: { [language: string]: string };
  description?: { [language: string]: string };
  contentType: string;
  length: number;
  sha2: string;
  fileUrl?: string;
}

/**
 * Query filters for xAPI statements
 * Supports common filtering patterns per xAPI spec
 */
export interface xAPIQueryFilters {
  agent?: xAPIAgent;
  verb?: string; // IRI of the verb
  activity?: string; // IRI of the activity
  registration?: string;
  related_activities?: boolean;
  related_agents?: boolean;
  since?: string; // ISO 8601 timestamp
  until?: string; // ISO 8601 timestamp
  limit?: number; // Max 1000 per page
  format?: 'ids' | 'exact' | 'canonical';
  attachments?: boolean;
  ascending?: boolean;
}

/**
 * LRS Statement API response structure
 * Per xAPI spec: GET /xapi/statements returns StatementResult
 */
export interface xAPIStatementResult {
  statements: xAPIStatement[];
  more?: string; // Relative URL for pagination
}

/**
 * LRS health status
 * Used for health checks and monitoring
 */
export interface LRSHealthStatus {
  instanceId: string;
  healthy: boolean;
  version?: string; // xAPI version supported
  error?: string;
  responseTimeMs?: number;
}

/**
 * LRS authentication configuration
 * Supports HTTP Basic Auth (username/password or key/secret)
 */
export interface LRSAuthConfig {
  type: 'basic' | 'bearer' | 'custom';
  username?: string;
  password?: string;
  key?: string; // Alias for username (Yetanalytics convention)
  secret?: string; // Alias for password (Yetanalytics convention)
  token?: string; // For bearer auth
  headers?: { [key: string]: string }; // For custom auth
}

/**
 * LRS instance configuration
 * Supports multi-LRS deployment per REQ-FN-002
 */
export interface LRSInstanceConfig {
  id: string; // Unique instance identifier (e.g., 'hs-ke')
  name: string; // Human-readable name (e.g., 'HS Kempten')
  endpoint: string; // Base URL (e.g., 'https://lrs.example.com/xapi')
  auth: LRSAuthConfig;
  timeoutMs?: number; // Request timeout (default: 10000ms)
  maxRetries?: number; // Max retry attempts (default: 3)
}

/**
 * LRS Client Interface
 * Abstracts xAPI Statement API operations
 * Implements REQ-FN-002: xAPI Learning Record Store Integration
 *
 * @remarks
 * - Supports multi-instance LRS deployment
 * - Handles authentication (HTTP Basic Auth)
 * - Implements pagination with `more` link following
 * - Propagates correlation IDs for distributed tracing
 * - Implements retry logic with exponential backoff
 * - Exports Prometheus metrics for monitoring
 */
export interface ILRSClient {
  /**
   * Unique identifier for this LRS instance
   */
  readonly instanceId: string;

  /**
   * Execute xAPI GET /statements query with pagination
   * Automatically follows `more` links until all results retrieved
   *
   * @param filters - xAPI query filters (actor, verb, time range, etc.)
   * @param maxStatements - Maximum total statements to retrieve (default: 10000)
   * @returns Array of xAPI statements
   * @throws Error on timeout, auth failure, or connection error
   * @remarks
   * - Sends required headers: X-Experience-API-Version, Authorization, X-Correlation-ID
   * - Handles pagination by following `more` links
   * - Implements retry logic with exponential backoff (3 retries)
   * - Logs query details at DEBUG level
   * - Records Prometheus metrics: lrs_query_duration_seconds, lrs_errors_total
   */
  queryStatements(
    filters: xAPIQueryFilters,
    maxStatements?: number,
  ): Promise<xAPIStatement[]>;

  /**
   * Aggregate statements (count, sum, etc.)
   * Executes query and returns count without retrieving full statement array
   *
   * @param filters - xAPI query filters
   * @returns Count of matching statements
   * @remarks
   * - More efficient than queryStatements when only count is needed
   * - Uses same authentication and retry logic as queryStatements
   */
  aggregate(filters: xAPIQueryFilters): Promise<number>;

  /**
   * Health check for this LRS instance
   * Typically uses GET /xapi/about endpoint
   *
   * @returns LRS health status with version and response time
   * @remarks
   * - Returns healthy: false on connection error or timeout
   * - 401/403 considered reachable (auth issue, not unavailability)
   * - Used by /health/readiness endpoint to monitor LRS availability
   */
  getInstanceHealth(): Promise<LRSHealthStatus>;
}
