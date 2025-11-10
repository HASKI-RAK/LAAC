---
id: REQ-FN-002
title: Multiple xAPI LRS Integration
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-001, SG-4-012
owner: TODO
version: 0.2
---

## Description

The system shall integrate with multiple xAPI-compliant Learning Record Store (LRS) instances, each with independent configuration (endpoint URL, authentication credentials), enabling concurrent queries across different data sources. Each LRS instance is identified by a unique `instanceId` for data isolation and routing.

## Rationale

Fulfills the mediator role by sourcing analytics input from multiple xAPI-capable LRS instances, supporting multi-university deployments where each institution operates its own LRS.

## Acceptance Criteria

- **Multi-LRS Configuration**: The system accepts configuration for multiple LRS instances via environment variables or structured configuration file:
  - Each instance SHALL include: `instanceId` (unique identifier), `name` (human-readable label), `endpoint` (xAPI LRS URL), `auth` (authentication credentials)
  - Configuration formats supported:
    - JSON array: `LRS_INSTANCES='[{"id":"hs-ke","name":"HS Kempten","endpoint":"https://lrs.ke.haski.app","auth":{"username":"user","password":"pass"}},...]'`
    - Individual env vars with instance prefix: `LRS_HS_KE_ENDPOINT`, `LRS_HS_KE_USERNAME`, `LRS_HS_KE_PASSWORD`
  - Minimum one LRS instance required; application SHALL fail startup if no instances configured
- **Authentication Mechanisms**: The system SHALL support the following xAPI authentication methods per LRS instance:
  - HTTP Basic Authentication (username + password) — mandatory baseline authentication
  - The system SHOULD support OAuth 2.0 Bearer tokens (future enhancement)
  - Custom header-based authentication if required by LRS implementation
- **xAPI Query Capabilities**: For each configured LRS instance, the system SHALL:
  - Query statements within specified time ranges (`since`, `until` parameters)
  - Filter statements by actor (student/user identifiers)
  - Filter statements by verb (action types)
  - Filter statements by object/activity (course, content identifiers)
  - Support xAPI Statement API pagination (using `more` link or cursor-based pagination)
  - Respect xAPI version negotiation (prefer 1.0.3, support 1.0.0+)
- **Concurrent LRS Access**: The system SHALL query multiple LRS instances concurrently for cross-instance analytics without blocking:
  - Use non-blocking I/O or async patterns for parallel LRS queries
  - Implement per-instance connection pooling to optimize throughput
  - Aggregate results from multiple instances while preserving `instanceId` tags
- **Error Handling and Resilience**: The system SHALL handle LRS failures gracefully:
  - Map LRS HTTP errors (4xx, 5xx) to standardized internal error types
  - Implement configurable timeout per LRS instance (default: 10s query timeout)
  - Log LRS failures with `instanceId`, error type, and correlation ID
  - For multi-instance queries: return partial results from available instances with metadata indicating unavailable instances
  - Prevent cascading failures using circuit breaker pattern (see ADR-007)
- **LRS Client Interface**: Internal `ILRSClient` interface abstracts xAPI protocol details:
  ```typescript
  interface ILRSClient {
    instanceId: string;
    queryStatements(filters: xAPIQueryFilters): Promise<xAPIStatement[]>;
    getInstanceHealth(): Promise<LRSHealthStatus>;
  }
  ```

## Verification

- **Configuration Tests**:
  - Unit tests verify parsing of multi-LRS configuration from JSON and env vars
  - Validation tests ensure startup fails with clear error when required fields missing
  - Tests verify duplicate `instanceId` detection
- **Integration Tests**:
  - Tests run against multiple mock LRS endpoints (at least 2 instances) covering:
    - Successful authentication with username/password per instance
    - xAPI statement queries with time range, actor, and verb filters
    - Pagination handling for large result sets
    - Concurrent queries to multiple instances
  - Tests verify error handling for each instance:
    - Invalid credentials (401)
    - LRS unavailable (connection timeout, 503)
    - Malformed xAPI responses
  - Tests verify partial result handling when one LRS fails
- **Performance Tests**:
  - Verify concurrent queries complete within SLO targets (REQ-NF-005, 017)
  - Verify connection pooling limits prevent resource exhaustion

## Dependencies

- REQ-FN-001 (Client-facing API) — receives aggregated data from multiple LRS
- REQ-FN-014 (Secrets management) — provides secure credential storage per instance
- REQ-FN-017 (Multi-instance support) — defines instance identification and filtering
- REQ-NF-018 (Graceful degradation) — timeout and circuit breaker requirements

## Assumptions / Constraints

- All LRS instances are xAPI 1.0.x compliant (prefer 1.0.3)
- Each LRS exposes standard Statement API endpoint (`/xapi/statements`)
- No direct database access to LRS backends is assumed
- LRS instances do not share authentication realms (each has independent credentials)
- Statement format follows xAPI specification with extensions documented in `docs/resources/xapi/`

## API/Interface Impact

- Internal `ILRSClient` interface used by DataAccessModule
- No direct exposure to client-facing API (encapsulated in data access layer)
- Configuration impact: requires environment variable or config file schema for multi-LRS setup

## Observability

- **Logging**: All LRS interactions logged with:
  - `instanceId`, `correlationId`, query parameters, response time, status code
  - Authentication failures logged as security events (without credentials)
- **Metrics**: Prometheus metrics exported per instance:
  - `lrs_query_duration_seconds{instance_id}` (histogram)
  - `lrs_query_total{instance_id,status}` (counter)
  - `lrs_auth_failures_total{instance_id}` (counter)
  - `lrs_connection_pool_size{instance_id}` (gauge)
- **Health Checks**: `/health/readiness` includes LRS connectivity status per instance
- **Tracing**: Distributed tracing spans for each LRS query with instance metadata

## Risks / Open Questions

- **Q**: What if an LRS instance has temporary network issues?
  - **A**: Circuit breaker opens after N consecutive failures, returns cached data or partial results; health check marks instance unhealthy
- **Q**: How to handle LRS version incompatibilities?
  - **A**: Log warning if LRS reports unsupported xAPI version; attempt queries but flag as degraded
- **Q**: Should we support dynamic LRS instance registration at runtime?
  - **A**: Phase 1: No, config-driven only. Phase 2+: Consider admin API for runtime registration

## References

- Stakeholder Need(s): [SG-4-001](../strs-needs/SG-4-001.md), [SG-4-012](../strs-needs/SG-4-012.md)
- xAPI Specification: [https://github.com/adlnet/xAPI-Spec](https://github.com/adlnet/xAPI-Spec)
- Yetanalytics LRS Documentation: [https://github.com/yetanalytics/lrsql/blob/main/doc/endpoints.md](https://github.com/yetanalytics/lrsql/blob/main/doc/endpoints.md)
- Frontend xAPI Context Structure: `docs/resources/xapi/frontend-xapi.md`

## Change History

- v0.2 — Extended to support multiple LRS instances with independent configuration and authentication
- v0.1 — Initial draft
