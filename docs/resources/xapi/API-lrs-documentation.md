# xAPI LRS Integration Guide for LAAC

**Developer-Ready Reference for LAAC System Integration**

> **Note**: While this guide references Yet Analytics SQL LRS (lrsql) as the primary implementation, it applies to any xAPI 1.0.3-compliant LRS. Validated against the HASKI production LRS instance.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Core Concepts](#2-core-concepts)
3. [Statement API](#3-statement-api)
4. [Query Patterns & Pagination](#4-query-patterns--pagination)
5. [Error Handling](#5-error-handling)
6. [Multi-Instance Architecture](#6-multi-instance-architecture)
7. [Performance & Resilience](#7-performance--resilience)
8. [Caching Strategy](#8-caching-strategy)
9. [Activities & Agents Lookup](#9-activities--agents-lookup)
10. [Documents & Metadata APIs](#10-documents--metadata-apis)
11. [Testing & Development](#11-testing--development)
12. [Reference](#12-reference)

---

## 1. Quick Start

### 1.1 Authentication Setup

Yet Analytics SQL LRS (lrsql) uses **HTTP Basic Authentication** for xAPI endpoints:

```typescript
// ILRSClient configuration (REQ-FN-002)
const config = {
  baseUrl: process.env.LRS_BASE_URL, // e.g., https://lrs.example.org
  apiKey: process.env.LRS_API_KEY,
  apiSecret: process.env.LRS_API_SECRET,
  timeout: 10000, // 10s per REQ-NF-018
};

// Authorization header
const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
headers: {
  'Authorization': `Basic ${auth}`,
  'X-Experience-API-Version': '1.0.3', // or '2.0.0'
  'Content-Type': 'application/json'
}
```

**Security Note**: Store credentials in environment variables or Docker secrets (REQ-FN-014). Never commit secrets to repository.

### 1.2 First Statement POST

```bash
curl -X POST https://lrs.example.org/xapi/statements \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  -H 'Content-Type: application/json' \
  -d '{
    "actor": {"mbox":"mailto:learner@example.org","name":"Learner"},
    "verb": {"id":"http://adlnet.gov/expapi/verbs/experienced",
             "display":{"en-US":"experienced"}},
    "object": {"id":"https://example.org/activities/course-1"}
  }'

# Response: ["550e8400-e29b-41d4-a716-446655440000"]
```

**Response Format**: POST returns **array of statement IDs** (UUIDs), NOT full statements.

### 1.3 First Statement GET

```bash
curl -G https://lrs.example.org/xapi/statements \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'limit=10'

# Response: StatementResult with statements array and more value
```

---

## 2. Core Concepts

### 2.1 Base URL & Path Prefix

- **Default**: All xAPI routes under `/xapi` (e.g., `https://lrs.example.org/xapi/statements`)
- **Configurable**: lrsql supports custom prefix via `LRSQL_URL_PREFIX` environment variable
- **Admin Routes**: `/admin/*` for credential management (separate from xAPI surface)

### 2.2 Required Headers

| Header                       | Required  | Values                                  | Purpose                    |
| ---------------------------- | --------- | --------------------------------------- | -------------------------- |
| `X-Experience-API-Version`   | Yes       | `1.0.3`, `2.0.0`                        | API version selection      |
| `Authorization`              | Yes       | `Basic <base64>`                        | HTTP Basic Auth            |
| `Content-Type`               | POST/PUT  | `application/json` or `multipart/mixed` | Request body format        |
| `Accept`                     | Optional  | `application/json`                      | Response format preference |
| `If-Match` / `If-None-Match` | Documents | ETag value                              | Optimistic concurrency     |

### 2.3 Version Compatibility

**Validated Support** (HASKI LRS instance):

- Supports xAPI versions: `1.0.0`, `1.0.1`, `1.0.2`, `1.0.3`
- Statement `version` property always set to `"1.0.0"` for 1.0.x specs
- `X-Experience-API-Version` header distinguishes patch versions
- **LAAC Recommendation**: Use `1.0.3` for maximum compatibility

**Note**: Yet Analytics lrsql also supports `2.0.0`, but production HASKI instance uses 1.0.x series only.

### 2.4 Statement Structure (Minimal)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000", // Optional on POST
  "actor": {
    "account": {
      "homePage": "https://ke.moodle.haski.app",
      "name": "1" // User ID
    }
  },
  "verb": {
    "id": "http://adlnet.gov/expapi/verbs/experienced",
    "display": { "en": "experienced" }
  },
  "object": {
    "id": "https://example.org/activities/course-1"
  },
  "timestamp": "2025-11-10T10:30:00+00:00", // Optional, LRS sets if omitted
  "stored": "2025-11-10T10:30:01.234000000Z" // Set by LRS, read-only
}
```

**Real-World Notes** (validated against HASKI LRS):

- Actors typically use `account` identification (homePage + name) rather than `mbox`
- Language tags use simple codes like `"en"` or `"de"` (not always `"en-US"`)
- `stored` timestamp has nanosecond precision with 9 decimal places
- `timestamp` may include timezone offset (e.g., `+00:00`)

**Key Fields**:

- `id`: LRS generates UUID if omitted
- `timestamp`: When event occurred (optional)
- `stored`: When LRS stored it (set by LRS, immutable)
- `version`: Set by LRS based on `X-Experience-API-Version` header
- `authority`: Set by LRS, identifies the system that stored the statement
- `context`: Optional, provides additional context (platform, language, extensions, contextActivities)

**Real-World Statement Example** (from HASKI production):

```json
{
  "id": "26535dec-9653-408f-a544-9e7203c378bb",
  "actor": {
    "account": {
      "homePage": "https://ke.moodle.haski.app",
      "name": "1"
    }
  },
  "verb": {
    "id": "https://wiki.haski.app/variables/xapi.clicked",
    "display": { "en": "clicked" }
  },
  "object": {
    "id": "https://ke.moodle.haski.app/course/view.php?id=1",
    "definition": {
      "name": { "en": "HS-KE" },
      "type": "http://id.tincanapi.com/activitytype/lms/course"
    }
  },
  "context": {
    "platform": "Moodle",
    "language": "en",
    "extensions": {
      "https://wiki.haski.app/": {
        "domain": "https://ke.moodle.haski.app",
        "domain_version": "4.2 (Build: 20230424)",
        "github": "https://github.com/HASKI-RAK",
        "event_function": "\\src\\transformer\\events\\core\\course_viewed"
      }
    },
    "contextActivities": {
      "parent": [
        {
          "id": "https://ke.moodle.haski.app",
          "definition": {
            "name": { "en": "HS-KE" },
            "type": "http://id.tincanapi.com/activitytype/lms"
          }
        }
      ],
      "grouping": [
        {
          "id": "https://ke.moodle.haski.app",
          "definition": {
            "name": { "en": "HS-KE" },
            "type": "http://id.tincanapi.com/activitytype/lms"
          }
        }
      ]
    }
  },
  "authority": {
    "account": {
      "homePage": "http://example.org",
      "name": "01928ae2-fcdd-8b3e-aa52-abd3fcf8e404"
    },
    "objectType": "Agent"
  },
  "version": "1.0.0",
  "timestamp": "2025-11-10T15:48:55+00:00",
  "stored": "2025-11-10T15:48:56.085000000Z"
}
```

---

## 3. Statement API

### 3.1 POST Statements (Store)

**Endpoint**: `POST /xapi/statements`

**Single Statement**:

```json
POST /xapi/statements
{
  "actor": {...},
  "verb": {...},
  "object": {...}
}

// Response: ["550e8400-e29b-41d4-a716-446655440000"]
```

**Batch Statements**:

```json
POST /xapi/statements
[
  { "actor": {...}, "verb": {...}, "object": {...} },
  { "actor": {...}, "verb": {...}, "object": {...} }
]

// Response: ["uuid-1", "uuid-2"]
```

**Status Codes**:

- `200 OK`: Success, returns array of UUIDs
- `400 Bad Request`: Malformed JSON, duplicate IDs in batch, validation failure
- `409 Conflict`: Statement ID already exists with different content

**LAAC Implementation Note**: For batch operations, handle partial failures by tracking which UUIDs were returned vs. submitted.

### 3.2 PUT Statement (Idempotent Store)

**Endpoint**: `PUT /xapi/statements?statementId=<uuid>`

```bash
PUT /xapi/statements?statementId=550e8400-e29b-41d4-a716-446655440000
{
  "id": "550e8400-e29b-41d4-a716-446655440000",  // Must match query param
  "actor": {...},
  "verb": {...},
  "object": {...}
}

// Response: 204 No Content
```

**Use Case**: Idempotent statement creation when client generates UUID.

### 3.3 GET Statements (Query)

**Endpoint**: `GET /xapi/statements`

#### Single Statement Fetch

```bash
# By ID
GET /xapi/statements?statementId=550e8400-e29b-41d4-a716-446655440000

# Voided statement
GET /xapi/statements?voidedStatementId=<uuid>
```

**Response**: Single statement object (not wrapped in array).

**Note**: `statementId` and `voidedStatementId` are **exclusive** with all other query parameters.

#### Collection Query Parameters

| Parameter            | Type               | Description                             | Example                                    |
| -------------------- | ------------------ | --------------------------------------- | ------------------------------------------ |
| `agent`              | JSON (URL-encoded) | Filter by actor/object                  | `{"mbox":"mailto:learner@example.org"}`    |
| `verb`               | IRI                | Filter by verb ID                       | `http://adlnet.gov/expapi/verbs/completed` |
| `activity`           | IRI                | Filter by activity ID                   | `https://example.org/course/1`             |
| `registration`       | UUID               | Filter by registration (session)        | `a1b2c3d4-e5f6-...`                        |
| `related_activities` | Boolean            | Broaden activity search to context      | `true`                                     |
| `related_agents`     | Boolean            | Broaden agent search to context         | `true`                                     |
| `since`              | ISO 8601 Timestamp | Statements stored after (exclusive)     | `2025-11-01T00:00:00Z`                     |
| `until`              | ISO 8601 Timestamp | Statements stored before/at (inclusive) | `2025-11-10T23:59:59Z`                     |
| `limit`              | Integer            | Max statements per page                 | `50` (default), max `50`                   |
| `ascending`          | Boolean            | Order by stored time                    | `false` (default: descending)              |
| `format`             | String             | `ids`, `exact`, `canonical`             | `exact` (default)                          |
| `attachments`        | Boolean            | Include binary attachments              | `false` (default)                          |

**Critical Notes**:

- `agent` parameter must be **JSON-encoded then URL-encoded**
- `since` is **exclusive**, `until` is **inclusive**
- `limit` default: 50 (configurable via `LRSQL_STMT_GET_DEFAULT`)
- `limit` maximum: 50 (configurable via `LRSQL_STMT_GET_MAX`)

#### Response Format: StatementResult

```json
{
  "statements": [
    { "id": "...", "actor": {...}, "verb": {...}, "object": {...}, ... },
    { "id": "...", "actor": {...}, "verb": {...}, "object": {...}, ... }
  ],
  "more": "/xapi/statements?limit=3&from=019a6e4e-60b5-84bc-9273-f039582b1b04"
}
```

**Pagination** (validated against HASKI LRS):

- `more`: **Relative path** to next page (not full URL)
- Uses `from` parameter with cursor/token value (not `more` parameter)
- Empty string `""` indicates no more results
- Call with same authentication and headers
- Preserves original query parameters (e.g., `limit`, `agent`, `activity`)

**Response Headers**:

- `X-Experience-API-Consistent-Through`: Timestamp indicating data completeness
  - Use for safe incremental polling (don't advance watermark past this value)

---

## 4. Query Patterns & Pagination

### 4.1 Watermark-Based Incremental Polling (REQ-FN-002)

**Pattern**: Track last processed `stored` timestamp, query for newer statements.

```typescript
// ILRSClient implementation pattern
async function incrementalPoll(
  lastWatermark: string, // ISO 8601 timestamp
  lrsClient: ILRSClient,
): Promise<{ statements: xAPIStatement[]; newWatermark: string }> {
  const results: xAPIStatement[] = [];
  let consistentThrough: string | null = null;

  let query = {
    since: lastWatermark,
    ascending: true, // Chronological order
    limit: 50,
  };

  let response = await lrsClient.getStatements(query);
  results.push(...response.statements);
  consistentThrough = response.headers['x-experience-api-consistent-through'];

  // Follow pagination
  while (response.more && response.more !== '') {
    response = await lrsClient.getStatements({ more: response.more });
    results.push(...response.statements);
  }

  // Advance watermark to consistent-through timestamp (safe for next poll)
  const newWatermark =
    consistentThrough ||
    (results.length > 0 ? results[results.length - 1].stored : lastWatermark);

  return { statements: results, newWatermark };
}
```

**Best Practices**:

1. Use `ascending=true` for chronological processing
2. Respect `X-Experience-API-Consistent-Through` header
3. Store watermark durably (database, not just memory)
4. Handle late-arriving statements by not advancing past `consistent-through`

### 4.2 Pagination Flow

```typescript
// Full pagination example
async function getAllStatements(
  query: StatementQueryParams,
  lrsClient: ILRSClient,
): Promise<xAPIStatement[]> {
  const allStatements: xAPIStatement[] = [];

  let result = await lrsClient.getStatements(query);
  allStatements.push(...result.statements);

  while (result.more && result.more !== '') {
    // more is relative path: /xapi/statements?session=...&more=...
    result = await lrsClient.getStatements({ morePath: result.more });
    allStatements.push(...result.statements);
  }

  return allStatements;
}
```

**Critical**: `more` is a **relative path**, not full URL. Prepend base URL and use same auth/headers.

### 4.3 Multi-Instance Concurrent Queries (REQ-FN-017)

```typescript
// Query multiple LRS instances in parallel
async function queryAllInstances(
  query: StatementQueryParams,
  lrsClients: Map<string, ILRSClient>, // instanceId -> client
): Promise<Map<string, xAPIStatement[]>> {
  const results = new Map<string, xAPIStatement[]>();

  const promises = Array.from(lrsClients.entries()).map(
    async ([instanceId, client]) => {
      try {
        const statements = await getAllStatements(query, client);
        // Tag statements with instanceId (REQ-NF-013)
        statements.forEach((stmt) => (stmt._instanceId = instanceId));
        return [instanceId, statements] as [string, xAPIStatement[]];
      } catch (error) {
        // Log error with correlation ID (REQ-FN-020)
        logger.error('LRS query failed', { instanceId, error, correlationId });
        return [instanceId, []] as [string, xAPIStatement[]];
      }
    },
  );

  const settled = await Promise.allSettled(promises);
  settled.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      const [instanceId, statements] = result.value;
      results.set(instanceId, statements);
    }
  });

  return results;
}
```

**LAAC Architecture Notes**:

- Each LRS instance has separate `ILRSClient` with own circuit breaker (ADR-007)
- Failed instances don't block successful queries
- Results tagged with `instanceId` for traceability (REQ-NF-013)

### 4.4 Common Query Examples

#### By Activity (Course Completion)

```bash
curl -G https://lrs.example.org/xapi/statements \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'activity=https://example.org/courses/cs101' \
  --data-urlencode 'verb=http://adlnet.gov/expapi/verbs/completed' \
  --data-urlencode 'limit=50'
```

#### By Agent (Learner Activity)

```bash
# With mbox (email-based identification)
curl -G https://lrs.example.org/xapi/statements \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'agent={"mbox":"mailto:learner@example.org"}' \
  --data-urlencode 'since=2025-11-01T00:00:00Z' \
  --data-urlencode 'ascending=true'

# With account (validated against HASKI LRS - more common)
curl -G https://lrs.example.org/xapi/statements \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'agent={"account":{"homePage":"https://ke.moodle.haski.app","name":"1"}}' \
  --data-urlencode 'since=2025-11-01T00:00:00Z' \
  --data-urlencode 'limit=50'
```

#### By Registration (Session)

```bash
curl -G https://lrs.example.org/xapi/statements \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'registration=a1b2c3d4-e5f6-4748-8901-234567890abc'
```

---

## 5. Error Handling

### 5.1 HTTP Status Codes

| Code                | Meaning               | Common Causes                                       | LAAC Response                       |
| ------------------- | --------------------- | --------------------------------------------------- | ----------------------------------- |
| `200`               | OK                    | Successful GET                                      | Process statements                  |
| `204`               | No Content            | Successful PUT/DELETE                               | Confirm operation                   |
| `400`               | Bad Request           | Malformed JSON, invalid params, duplicate batch IDs | Log error, fail fast (REQ-NF-018)   |
| `401`               | Unauthorized          | Missing/invalid credentials                         | Fail fast, alert (security event)   |
| `403`               | Forbidden             | Valid auth, insufficient permissions                | Fail fast, alert                    |
| `404`               | Not Found             | Statement/document ID not found                     | Handle gracefully (may be expected) |
| `409`               | Conflict              | Duplicate statement ID with different content       | Fail fast (data integrity)          |
| `412`               | Precondition Failed   | ETag mismatch (document concurrency)                | Retry with fresh ETag               |
| `413`               | Request Too Large     | Statement/attachment exceeds limits                 | Fail fast, log details              |
| `429`               | Too Many Requests     | Rate limit exceeded                                 | Exponential backoff (REQ-NF-018)    |
| `500`               | Internal Server Error | LRS internal error                                  | Retry with backoff (max 2 retries)  |
| `502`, `503`, `504` | Service Unavailable   | Downstream failure, timeout                         | Retry with backoff, circuit breaker |

### 5.2 Error Response Format

LRS SHOULD return explanatory message:

```json
{
  "error": "Bad Request",
  "message": "Statement validation failed: missing required property 'verb'",
  "details": { ... }
}
```

**Note**: Error format not standardized by xAPI spec. Parse defensively.

### 5.3 Retry Strategy (REQ-NF-018)

```typescript
// Exponential backoff with max retries
async function retryableQuery<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Fail fast on client errors (4xx except 429)
      if (
        error.statusCode >= 400 &&
        error.statusCode < 500 &&
        error.statusCode !== 429
      ) {
        throw error;
      }

      // Exponential backoff for 5xx and 429
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
```

**LAAC Configuration**:

- Max retries: 2 (REQ-NF-018)
- Base delay: 1000ms
- Fail fast on 4xx (except 429 rate limit)

### 5.4 Timeout Configuration (REQ-NF-018)

```typescript
// ILRSClient timeout configuration
const config = {
  queryTimeout: 10000, // 10s for statement queries
  healthCheckTimeout: 5000, // 5s for /xapi/about (REQ-FN-025)
};

// Axios example
const client = axios.create({
  baseURL: lrsBaseUrl,
  timeout: config.queryTimeout,
  auth: { username: apiKey, password: apiSecret },
  headers: { 'X-Experience-API-Version': '1.0.3' },
});
```

### 5.5 Circuit Breaker Pattern (ADR-007)

```typescript
// Per-instance circuit breaker
class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private openedAt: number | null = null;

  constructor(
    private threshold: number = 5,
    private timeoutMs: number = 30000,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt! >= this.timeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
  }
}
```

**LAAC Implementation**: Each LRS instance has separate circuit breaker in `ILRSClient` implementation.

---

## 6. Multi-Instance Architecture

### 6.1 Instance Configuration (REQ-FN-017)

```typescript
// Multi-instance LRS configuration
interface LRSInstanceConfig {
  instanceId: string;        // e.g., 'hs-ke', 'hs-bw'
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  enabled: boolean;
  healthCheckInterval: number; // milliseconds
}

// Environment variable pattern
LRS_INSTANCES='[
  {
    "instanceId": "hs-ke",
    "baseUrl": "https://lrs-ke.example.org",
    "apiKey": "${LRS_KE_API_KEY}",
    "apiSecret": "${LRS_KE_API_SECRET}",
    "enabled": true,
    "healthCheckInterval": 30000
  },
  {
    "instanceId": "hs-bw",
    "baseUrl": "https://lrs-bw.example.org",
    "apiKey": "${LRS_BW_API_KEY}",
    "apiSecret": "${LRS_BW_API_SECRET}",
    "enabled": true,
    "healthCheckInterval": 30000
  }
]'
```

### 6.2 Instance Tagging (REQ-NF-013)

```typescript
// Tag statements with source instance
interface TaggedStatement extends xAPIStatement {
  _instanceId: string; // Added by LAAC
  _retrievedAt: string; // ISO 8601 timestamp
}

function tagStatements(
  statements: xAPIStatement[],
  instanceId: string,
): TaggedStatement[] {
  const now = new Date().toISOString();
  return statements.map((stmt) => ({
    ...stmt,
    _instanceId: instanceId,
    _retrievedAt: now,
  }));
}
```

**Use Cases**:

- Metrics filtered by institution (REQ-FN-005)
- Data provenance tracking
- Debugging multi-instance issues

### 6.3 Health Monitoring (REQ-FN-025)

```typescript
// Health check via /xapi/about endpoint
async function checkLRSHealth(
  client: ILRSClient,
  instanceId: string,
): Promise<HealthStatus> {
  try {
    const response = await client.get('/xapi/about', { timeout: 5000 });
    const about = response.data;

    return {
      instanceId,
      status: 'healthy',
      versions: about.version, // ['1.0.3', '2.0.0']
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('LRS health check failed', { instanceId, error });
    return {
      instanceId,
      status: 'unhealthy',
      error: error.message,
      checkedAt: new Date().toISOString(),
    };
  }
}

// Periodic health checks (REQ-FN-025)
setInterval(async () => {
  for (const [instanceId, client] of lrsClients.entries()) {
    const health = await checkLRSHealth(client, instanceId);
    // Update metrics, emit events
    metricsService.recordHealthCheck(health);
  }
}, 30000); // 30s interval
```

### 6.4 Result Aggregation

```typescript
// Aggregate statements from multiple instances
function aggregateStatements(
  instanceResults: Map<string, TaggedStatement[]>,
  sortBy: 'stored' | 'timestamp' = 'stored',
): TaggedStatement[] {
  const allStatements = Array.from(instanceResults.values()).flat();

  // Sort by stored time (or timestamp)
  allStatements.sort((a, b) => {
    const timeA = new Date(a[sortBy]).getTime();
    const timeB = new Date(b[sortBy]).getTime();
    return timeA - timeB;
  });

  return allStatements;
}
```

---

## 7. Performance & Resilience

### 7.1 Connection Pooling

```typescript
// Axios HTTP agent with keep-alive
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

const httpAgent = new HttpAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50, // Per host
  maxFreeSockets: 10,
});

const httpsAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
});

const client = axios.create({
  baseURL: lrsBaseUrl,
  httpAgent,
  httpsAgent,
});
```

**Benefits**:

- Reuse TCP connections (reduce handshake overhead)
- Lower latency for subsequent requests
- Better performance for multi-page queries

### 7.2 Performance Metrics (REQ-FN-021)

```typescript
// Prometheus metrics for LRS queries
import { Histogram, Counter } from 'prom-client';

const lrsQueryDuration = new Histogram({
  name: 'lrs_query_duration_seconds',
  help: 'Duration of LRS queries',
  labelNames: ['instanceId', 'queryType', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const lrsQueryErrors = new Counter({
  name: 'lrs_query_errors_total',
  help: 'Total LRS query errors',
  labelNames: ['instanceId', 'errorType', 'statusCode'],
});

// Usage
const timer = lrsQueryDuration.startTimer({
  instanceId,
  queryType: 'statements',
});
try {
  const result = await client.getStatements(query);
  timer({ status: 'success' });
  return result;
} catch (error) {
  timer({ status: 'error' });
  lrsQueryErrors.inc({
    instanceId,
    errorType: error.name,
    statusCode: error.statusCode,
  });
  throw error;
}
```

### 7.3 Caching Decision Tree (REQ-FN-006)

```
Query received
    │
    ├─ Check cache key: cache:{metricId}:{instanceId}:{scope}:{filters}:{version}
    │
    ├─ Cache HIT?
    │  └─ YES → Return cached result (fast path)
    │
    └─ Cache MISS?
       └─ YES → Query LRS
              → Compute metric
              → Store in cache with TTL
              → Return result
```

### 7.4 Rate Limiting (REQ-FN-024)

```typescript
// Client-side rate limiting (protect LRS)
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  maxConcurrent: 5, // Max 5 concurrent requests
  minTime: 200, // Min 200ms between requests
  reservoir: 100, // 100 requests
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 60000, // per minute
});

// Wrap LRS client methods
const rateLimitedClient = {
  getStatements: (query) => limiter.schedule(() => client.getStatements(query)),
  postStatements: (statements) =>
    limiter.schedule(() => client.postStatements(statements)),
};
```

---

## 8. Caching Strategy

### 8.1 Cache Key Structure (REQ-NF-013)

```typescript
// Structured cache key format
function buildCacheKey(params: {
  metricId: string;
  instanceId: string;
  scope: 'course' | 'topic' | 'element';
  filters: Record<string, any>;
  version: string;
}): string {
  const filterHash = hashObject(params.filters);
  return `cache:${params.metricId}:${params.instanceId}:${params.scope}:${filterHash}:${params.version}`;
}

// Example
buildCacheKey({
  metricId: 'course-completion',
  instanceId: 'hs-ke',
  scope: 'course',
  filters: { courseId: '123' },
  version: 'v1',
});
// → "cache:course-completion:hs-ke:course:a1b2c3:v1"
```

### 8.2 Cache-Aside Pattern (REQ-FN-006)

```typescript
// ICacheService interface implementation
async function getMetricResults(
  metricId: string,
  params: MetricParams,
): Promise<MetricResult> {
  const cacheKey = buildCacheKey({ metricId, ...params });

  // 1. Check cache
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    logger.log('Cache hit', { metricId, cacheKey });
    return cached;
  }

  // 2. Cache miss: query LRS
  logger.log('Cache miss', { metricId, cacheKey });
  const statements = await lrsClient.getStatements(params.filters);

  // 3. Compute metric
  const result = await metricComputation.compute(params, statements);

  // 4. Store in cache with TTL
  const ttl = params.ttl || 3600; // 1 hour default
  await cacheService.set(cacheKey, result, ttl);

  // 5. Return result
  return result;
}
```

### 8.3 Cache Invalidation (REQ-FN-007)

```typescript
// Single key invalidation
async function invalidateMetricCache(
  metricId: string,
  instanceId: string,
  scope: string,
  filters: Record<string, any>
): Promise<void> {
  const cacheKey = buildCacheKey({ metricId, instanceId, scope, filters, version: '*' });
  await cacheService.delete(cacheKey);
  logger.log('Cache invalidated', { cacheKey });
}

// Pattern-based invalidation (admin endpoint)
async function invalidateCachePattern(pattern: string): Promise<number> {
  // Example: "cache:course-completion:hs-ke:*"
  const keys = await cacheService.keys(pattern);
  let deleted = 0;

  for (const key of keys) {
    await cacheService.delete(key);
    deleted++;
  }

  logger.log('Cache pattern invalidated', { pattern, deleted });
  return deleted;
}

// Admin API endpoint
@Post('/admin/cache/invalidate')
@UseGuards(JwtAuthGuard, ScopesGuard)
@Scopes('admin:cache')
async invalidateCache(@Body() dto: InvalidateCacheDto) {
  return this.adminService.invalidateCachePattern(dto.pattern);
}
```

### 8.4 TTL Recommendations

| Metric Type                    | TTL         | Rationale                         |
| ------------------------------ | ----------- | --------------------------------- |
| Real-time (live sessions)      | 60s         | High churn, fresh data critical   |
| Recent activity (last 7 days)  | 300s (5min) | Balance freshness and performance |
| Historical (completed courses) | 3600s (1hr) | Low churn, expensive computation  |
| Aggregates (monthly reports)   | 7200s (2hr) | Very expensive, rarely changes    |

**Dynamic TTL**:

```typescript
function calculateTTL(params: MetricParams): number {
  const now = new Date();
  const since = new Date(params.filters.since);
  const ageInDays = (now.getTime() - since.getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays < 1) return 60; // Last 24h: 1min
  if (ageInDays < 7) return 300; // Last week: 5min
  if (ageInDays < 30) return 1800; // Last month: 30min
  return 7200; // Older: 2hr
}
```

---

## 9. Activities & Agents Lookup

### 9.1 GET Activity (Canonical Definition)

**Endpoint**: `GET /xapi/activities?activityId=<iri>`

```bash
curl -G https://lrs.example.org/xapi/activities \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'activityId=https://example.org/courses/cs101'
```

**Response**:

```json
{
  "objectType": "Activity",
  "id": "https://example.org/courses/cs101",
  "definition": {
    "name": { "en-US": "Introduction to Computer Science" },
    "description": { "en-US": "Fundamentals of programming" },
    "type": "http://adlnet.gov/expapi/activities/course"
  }
}
```

**Use Case**: Resolve activity metadata for metric display (e.g., course names).

### 9.2 GET Agent (Person Object)

**Endpoint**: `GET /xapi/agents?agent=<json>`

```bash
curl -G https://lrs.example.org/xapi/agents \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'agent={"mbox":"mailto:learner@example.org"}'
```

**Response**:

```json
{
  "objectType": "Person",
  "name": ["Learner Name", "learner123"],
  "mbox": ["mailto:learner@example.org"],
  "mbox_sha1sum": [],
  "openid": [],
  "account": [{ "homePage": "https://id.example.org", "name": "learner-uuid" }]
}
```

**Person Object**: Aggregates all known identifiers for an agent (arrays for each property).

---

## 10. Documents & Metadata APIs

### 10.1 State Documents (REQ-FN-011)

**Endpoint**: `/xapi/activities/state`

**Use Case**: Persist learner progress, bookmarks, session data.

**Key Parameters**:

- `activityId` (IRI): Activity identifier
- `agent` (JSON): Agent object
- `stateId` (string): Document identifier
- `registration` (UUID, optional): Session/registration context

#### PUT State Document

```bash
curl -X PUT 'https://lrs.example.org/xapi/activities/state' \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  -H 'If-None-Match: *' \
  -H 'Content-Type: application/json' \
  --data-urlencode 'activityId=https://example.org/courses/cs101' \
  --data-urlencode 'agent={"mbox":"mailto:learner@example.org"}' \
  --data-urlencode 'stateId=progress' \
  --data '{"lesson": 5, "score": 0.82, "completed": false}'

# Response: 204 No Content
```

**Concurrency Control**: Use `If-Match` (update existing) or `If-None-Match: *` (create new).

#### GET State Document

```bash
curl -G 'https://lrs.example.org/xapi/activities/state' \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'activityId=https://example.org/courses/cs101' \
  --data-urlencode 'agent={"mbox":"mailto:learner@example.org"}' \
  --data-urlencode 'stateId=progress'

# Response: {"lesson": 5, "score": 0.82, "completed": false}
```

#### List State IDs

```bash
# Omit stateId to list all state documents for (activity, agent)
curl -G 'https://lrs.example.org/xapi/activities/state' \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'activityId=https://example.org/courses/cs101' \
  --data-urlencode 'agent={"mbox":"mailto:learner@example.org"}'

# Response: ["progress", "bookmark", "notes"]
```

### 10.2 Activity Profiles

**Endpoint**: `/xapi/activities/profile`

**Use Case**: Activity-level metadata (not learner-specific).

```bash
# PUT activity profile
curl -X PUT 'https://lrs.example.org/xapi/activities/profile' \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  -H 'If-None-Match: *' \
  --data-urlencode 'activityId=https://example.org/courses/cs101' \
  --data-urlencode 'profileId=metadata' \
  --data '{"difficulty": "intermediate", "credits": 3}'
```

### 10.3 Agent Profiles

**Endpoint**: `/xapi/agents/profile`

**Use Case**: Agent-level preferences, settings.

```bash
# GET agent profile
curl -G 'https://lrs.example.org/xapi/agents/profile' \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'agent={"mbox":"mailto:learner@example.org"}' \
  --data-urlencode 'profileId=preferences'
```

---

## 11. Testing & Development

### 11.1 Mocking LRS for Unit Tests

```typescript
// Mock ILRSClient for unit tests
class MockLRSClient implements ILRSClient {
  private statements: xAPIStatement[] = [];

  async getStatements(query: StatementQueryParams): Promise<StatementResult> {
    // Filter statements based on query
    let filtered = this.statements;

    if (query.activity) {
      filtered = filtered.filter(s => s.object.id === query.activity);
    }

    if (query.since) {
      filtered = filtered.filter(s => s.stored > query.since);
    }

    return {
      statements: filtered.slice(0, query.limit || 50),
      more: ''
    };
  }

  async postStatements(statements: xAPIStatement[]): Promise<string[]> {
    const ids = statements.map(s => s.id || uuidv4());
    this.statements.push(...statements.map((s, i) => ({ ...s, id: ids[i] })));
    return ids;
  }

  // Helper: Seed test data
  seedStatements(statements: xAPIStatement[]) {
    this.statements = statements;
  }
}

// Usage in tests
describe('MetricService', () => {
  let mockLRS: MockLRSClient;
  let metricService: MetricService;

  beforeEach(() => {
    mockLRS = new MockLRSClient();
    metricService = new MetricService(mockLRS);
  });

  it('should compute course completion metric', async () => {
    // Seed test data
    mockLRS.seedStatements([
      { actor: {...}, verb: {id: 'http://adlnet.gov/expapi/verbs/completed'}, object: {id: 'course-1'} },
      { actor: {...}, verb: {id: 'http://adlnet.gov/expapi/verbs/completed'}, object: {id: 'course-1'} }
    ]);

    const result = await metricService.computeCourseCompletion('course-1');
    expect(result.value).toBe(2);
  });
});
```

### 11.2 Test Fixtures

```typescript
// fixtures/xapi-statements.ts
export const sampleStatements = {
  courseCompleted: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    actor: { mbox: 'mailto:learner@example.org', name: 'Learner' },
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { 'en-US': 'completed' },
    },
    object: { id: 'https://example.org/courses/cs101' },
    timestamp: '2025-11-10T10:00:00Z',
    stored: '2025-11-10T10:00:01Z',
  },

  videoWatched: {
    id: '660f9511-f3ac-52e5-b827-557766551111',
    actor: { mbox: 'mailto:learner@example.org', name: 'Learner' },
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/experienced',
      display: { 'en-US': 'experienced' },
    },
    object: {
      id: 'https://example.org/videos/intro',
      definition: {
        type: 'http://activitystrea.ms/schema/1.0/video',
        name: { 'en-US': 'Introduction Video' },
      },
    },
    result: { duration: 'PT5M30S', completion: true },
    timestamp: '2025-11-10T10:05:00Z',
    stored: '2025-11-10T10:05:01Z',
  },
};

// Usage
import { sampleStatements } from './fixtures/xapi-statements';
mockLRS.seedStatements([sampleStatements.courseCompleted]);
```

### 11.3 Local Development Setup

#### Docker Compose for lrsql

```yaml
# docker-compose.dev.yml
services:
  lrsql:
    image: yetanalytics/lrsql:latest
    ports:
      - '8080:8080'
    environment:
      LRSQL_ADMIN_USER_DEFAULT: admin
      LRSQL_ADMIN_PASS_DEFAULT: admin_password
      LRSQL_DB_HOST: postgres
      LRSQL_DB_NAME: lrsql
      LRSQL_DB_USER: lrsql
      LRSQL_DB_PASSWORD: lrsql_password
      LRSQL_STMT_GET_DEFAULT: 50
      LRSQL_STMT_GET_MAX: 50
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: lrsql
      POSTGRES_USER: lrsql
      POSTGRES_PASSWORD: lrsql_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Start Local LRS**:

```bash
docker-compose -f docker-compose.dev.yml up -d
# Access: http://localhost:8080/admin
```

#### Create API Credentials

```bash
# Login to get JWT
curl -X POST http://localhost:8080/admin/account/login \
  -H 'Content-Type: application/json' \
  -d '{"username": "admin", "password": "admin_password"}'
# Response: {"jwt": "eyJ..."}

# Create API key/secret
curl -X POST http://localhost:8080/admin/creds \
  -H 'Authorization: Bearer eyJ...' \
  -H 'Content-Type: application/json' \
  -d '{"scopes": ["all"]}'
# Response: {"apiKey": "abc123", "apiSecret": "xyz789"}
```

### 11.4 Integration Tests

```typescript
// test/lrs.e2e-spec.ts
describe('LRS Integration (E2E)', () => {
  let app: INestApplication;
  let lrsClient: ILRSClient;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DataAccessModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    lrsClient = moduleRef.get<ILRSClient>('ILRSClient');
  });

  it('should POST and GET statement', async () => {
    // POST
    const statement = { actor: {...}, verb: {...}, object: {...} };
    const [id] = await lrsClient.postStatements([statement]);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);

    // GET by ID
    const retrieved = await lrsClient.getStatements({ statementId: id });
    expect(retrieved.statements[0].id).toBe(id);
  });

  it('should handle pagination', async () => {
    // POST 100 statements
    const statements = Array.from({ length: 100 }, (_, i) => ({
      actor: { mbox: `mailto:learner${i}@example.org` },
      verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
      object: { id: 'https://example.org/activity/test' }
    }));
    await lrsClient.postStatements(statements);

    // Query with pagination
    const result = await lrsClient.getStatements({ limit: 50 });
    expect(result.statements.length).toBe(50);
    expect(result.more).toBeTruthy();

    // Follow more
    const nextResult = await lrsClient.getStatements({ morePath: result.more });
    expect(nextResult.statements.length).toBe(50);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

## 12. Reference

### 12.1 About Endpoint

**Endpoint**: `GET /xapi/about`

```bash
curl https://lrs.example.org/xapi/about \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3'
```

**Response**:

```json
{
  "version": ["1.0.3", "2.0.0"],
  "extensions": {
    "https://lrsql.com/ext/health": { "status": "ok" }
  }
}
```

**Use Case**: Health checks, version discovery (REQ-FN-025).

### 12.2 Admin Endpoints (Credential Management)

| Endpoint               | Method | Purpose                  |
| ---------------------- | ------ | ------------------------ |
| `/admin/account/login` | POST   | Obtain JWT token         |
| `/admin/creds`         | POST   | Create API key/secret    |
| `/admin/creds`         | GET    | List credentials         |
| `/admin/creds`         | PUT    | Update credential scopes |
| `/admin/creds`         | DELETE | Revoke credentials       |
| `/admin/openapi`       | GET    | OpenAPI specification    |

**Authentication**: All admin endpoints require `Authorization: Bearer <jwt>` (except login).

**LAAC Usage**: Provisioning only, not used at runtime.

### 12.3 lrsql Configuration Variables

| Variable                      | Default       | Description                          |
| ----------------------------- | ------------- | ------------------------------------ |
| `LRSQL_STMT_GET_DEFAULT`      | 50            | Default page size for GET statements |
| `LRSQL_STMT_GET_MAX`          | 50            | Maximum page size allowed            |
| `LRSQL_URL_PREFIX`            | `/xapi`       | xAPI path prefix                     |
| `LRSQL_ENABLE_STRICT_VERSION` | false         | Strict 1.0.3 compatibility mode      |
| `LRSQL_SUPPORTED_VERSIONS`    | `1.0.3,2.0.0` | Supported xAPI versions              |
| `LRSQL_ENABLE_REACTIONS`      | false         | Enable event-driven reactions        |

### 12.4 Version Compatibility Matrix

| Feature              | xAPI 1.0.3 | xAPI 2.0.0 | Notes                                   |
| -------------------- | ---------- | ---------- | --------------------------------------- |
| Basic statements     | ✅         | ✅         | Core functionality                      |
| Attachments          | ✅         | ✅         | Multipart/mixed format                  |
| Language filtering   | ✅         | ✅         | `Accept-Language` header                |
| Statement references | ✅         | ✅         | `statementId` in object                 |
| Voiding              | ✅         | ✅         | `http://adlnet.gov/expapi/verbs/voided` |
| State/profile APIs   | ✅         | ✅         | Document storage                        |
| Query operators      | ✅         | ✅         | `related_agents`, `related_activities`  |
| 2.0-specific fields  | ❌         | ✅         | New extensions, stricter validation     |

**Recommendation**: Use `1.0.3` for LAAC unless 2.0-specific features required.

### 12.5 Common xAPI Verbs

| Verb ID                                      | Display     | Use Case                   |
| -------------------------------------------- | ----------- | -------------------------- |
| `http://adlnet.gov/expapi/verbs/completed`   | completed   | Course/activity completion |
| `http://adlnet.gov/expapi/verbs/passed`      | passed      | Assessment success         |
| `http://adlnet.gov/expapi/verbs/failed`      | failed      | Assessment failure         |
| `http://adlnet.gov/expapi/verbs/experienced` | experienced | Content consumption        |
| `http://adlnet.gov/expapi/verbs/answered`    | answered    | Question response          |
| `http://adlnet.gov/expapi/verbs/attempted`   | attempted   | Activity start             |
| `http://adlnet.gov/expapi/verbs/progressed`  | progressed  | Progress tracking          |
| `http://adlnet.gov/expapi/verbs/scored`      | scored      | Score recording            |

### 12.6 LAAC Requirement Traceability

| Feature         | Requirements           | Implementation                             |
| --------------- | ---------------------- | ------------------------------------------ |
| LRS Integration | REQ-FN-002, REQ-NF-006 | `ILRSClient` interface in DataAccessModule |
| Multi-Instance  | REQ-FN-017, REQ-NF-013 | Instance tagging, concurrent queries       |
| Caching         | REQ-FN-006, 007        | Redis cache-aside with `ICacheService`     |
| Error Handling  | REQ-NF-018             | Retry logic, circuit breaker (ADR-007)     |
| Health Checks   | REQ-FN-025             | `/xapi/about` polling                      |
| Timeouts        | REQ-NF-018             | 10s query, 5s health check                 |
| Security        | REQ-FN-023, REQ-NF-019 | Secrets in env vars, no PII logging        |
| Observability   | REQ-FN-020, 021        | Structured logging, Prometheus metrics     |

### 12.7 Validated Findings (HASKI Production LRS)

**Test Date**: November 10, 2025  
**LRS Instance**: `https://ke.lrs.haski.app/xapi`  
**Version Support**: `1.0.0`, `1.0.1`, `1.0.2`, `1.0.3`

#### Validated Behaviors:

✅ **Authentication**: HTTP Basic Auth works as documented  
✅ **Pagination**: Uses `from` parameter (not `more`) in pagination URLs  
✅ **Consistent-Through Header**: Present on all responses (`X-Experience-API-Consistent-Through`)  
✅ **Agent Filtering**: Works with both `mbox` and `account` identification  
✅ **Activity Filtering**: Works as expected with full activity IRIs  
✅ **Time Filtering**: `since` parameter correctly filters by stored timestamp (exclusive)  
✅ **Statement Structure**: Includes `authority`, `context`, `contextActivities` in real data

#### Real-World Patterns:

1. **Actor Identification**: Production data primarily uses `account` (homePage + name), not `mbox`

   ```json
   { "account": { "homePage": "https://ke.moodle.haski.app", "name": "1" } }
   ```

2. **Context Structure**: Rich context with platform, language, extensions, and contextActivities:

   ```json
   {
     "platform": "Moodle",
     "language": "en",
     "extensions": {
       "https://wiki.haski.app/": {
         "domain": "https://ke.moodle.haski.app",
         "domain_version": "4.2 (Build: 20230424)",
         "github": "https://github.com/HASKI-RAK",
         "event_function": "\\src\\transformer\\events\\core\\course_viewed"
       }
     },
     "contextActivities": {
       "parent": [{...}],
       "grouping": [{...}]
     }
   }
   ```

3. **Timestamp Precision**: `stored` has nanosecond precision (9 decimal places):  
   `"2025-11-10T15:48:56.085000000Z"`

4. **Pagination Tokens**: Cursor values in `from` parameter:  
   `019a6e4e-60b5-84bc-9273-f039582b1b04` (UUID-like format)

5. **Language Tags**: Use simple codes (`"en"`, `"de"`) not always full locale (`"en-US"`)

6. **Verb IRIs**: Custom verbs use HASKI wiki namespace:  
   `https://wiki.haski.app/variables/xapi.clicked`

7. **Activity Types**: Mix of standard and custom:
   - Standard: `http://id.tincanapi.com/activitytype/lms/course`
   - Custom: `https://wiki.haski.app/functions/pages.App`

#### LAAC Implementation Notes:

- **Account-Based Queries**: Prioritize `account` identification over `mbox` for filtering
- **Context Parsing**: Extract `platform` from context to identify source system (Moodle vs Frontend)
- **Extension Data**: Parse `context.extensions` for domain metadata and version info
- **Pagination**: Follow `from` parameter in `more` URLs, not `more` parameter itself
- **Instance Identification**: Use `context.extensions.domain` or actor `account.homePage` for multi-instance filtering

### 12.8 Troubleshooting

#### Issue: 401 Unauthorized

**Causes**:

- Invalid API key/secret
- Incorrect Base64 encoding
- Expired credentials

**Solution**:

```bash
# Verify credentials
echo -n 'apiKey:apiSecret' | base64

# Test authentication
curl -v https://lrs.example.org/xapi/about \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3'
```

#### Issue: Empty statement array despite data

**Causes**:

- `since` timestamp too recent (exclusive)
- Incorrect `agent` JSON encoding
- Instance has no matching data

**Solution**:

```bash
# Check agent encoding
node -e "console.log(encodeURIComponent(JSON.stringify({mbox:'mailto:test@example.org'})))"

# Try broader query
curl -G https://lrs.example.org/xapi/statements \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'limit=10'
```

#### Issue: Circuit breaker OPEN

**Causes**:

- LRS instance unhealthy
- Network issues
- Repeated timeouts

**Solution**:

1. Check LRS health: `GET /xapi/about`
2. Review circuit breaker metrics
3. Wait for circuit breaker timeout (30s)
4. Investigate root cause (logs, network)

#### Issue: Slow query performance

**Causes**:

- Large result set without pagination
- Missing cache
- Multiple instances timing out

**Solution**:

1. Reduce `limit` parameter
2. Use `since` for incremental queries
3. Check cache hit ratio metrics
4. Enable connection pooling
5. Review instance health status

---

## Appendix A: Quick Reference Card

```bash
# Authentication
-u 'apiKey:apiSecret'
-H 'X-Experience-API-Version: 1.0.3'

# POST statement
curl -X POST https://lrs.example.org/xapi/statements \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  -H 'Content-Type: application/json' \
  -d '{"actor":{...},"verb":{...},"object":{...}}'

# GET statements (recent)
curl -G https://lrs.example.org/xapi/statements \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'since=2025-11-01T00:00:00Z' \
  --data-urlencode 'limit=50'

# GET by activity
curl -G https://lrs.example.org/xapi/statements \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'activity=https://example.org/courses/cs101'

# GET by agent
curl -G https://lrs.example.org/xapi/statements \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3' \
  --data-urlencode 'agent={"mbox":"mailto:learner@example.org"}'

# Health check
curl https://lrs.example.org/xapi/about \
  -u 'apiKey:apiSecret' \
  -H 'X-Experience-API-Version: 1.0.3'
```

---

## Sources & Further Reading

- **[Yet Analytics lrsql Documentation](https://yetanalytics.github.io/lrsql/)** — Official lrsql docs
- **[xAPI Specification (IEEE)](https://xapi.ieee-saopen.org/standard/)** — xAPI 2.0 Base Standard
- **[ADL xAPI Specification](https://github.com/adlnet/xAPI-Spec)** — xAPI 1.0.3 legacy spec
- **[LAAC Architecture](../architecture/ARCHITECTURE.md)** — LAAC system architecture
- **[LAAC Requirements](../SRS.md)** — Software requirements specification
- **[Metrics Specification](../Metrics-Specification.md)** — Formal metric definitions

---

**Maintainer**: LAAC Architecture Team  
**Last Updated**: 2025-11-10  
**Review Cadence**: Quarterly or on LRS integration changes
