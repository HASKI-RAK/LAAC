---
id: REQ-FN-017
title: Multi-Instance Support and Cross-Instance Analytics
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-012
owner: TODO
version: 0.2
---

## Description

The system shall support querying multiple university LRS instances (each with independent endpoints per REQ-FN-002), extract the source instance identifier from xAPI statement context, and provide both per-instance filtered analytics and global cross-instance aggregated analytics. The `instanceId` from LRS configuration (REQ-FN-002) shall be the primary identifier for all instance-scoped operations.

## Rationale

HASKI serves multiple universities with independent LRS deployments. Analytics must be available both at individual university level and aggregated across all instances for comparative insights.

## Acceptance Criteria

- **LRS Instance Configuration**: Leverages multi-LRS configuration from REQ-FN-002:
  - Each configured LRS has `instanceId`, `name`, `endpoint`, `auth` (from REQ-FN-002)
  - The `instanceId` from LRS configuration is used as the source identifier for all statements retrieved from that LRS
  - Example: Statements from LRS configured with `{"id":"hs-ke",...}` are tagged with `instanceId="hs-ke"`
- **Statement-to-Instance Mapping**: Primary strategy uses LRS source:
  - All statements retrieved from a specific LRS endpoint are tagged with that LRS's `instanceId`
  - This ensures 1:1 mapping between LRS configuration and statement source
- **Fallback Instance Extraction** (validation/verification only): System MAY validate `instanceId` against statement context for consistency:
  1. Primary: `context.extensions["https://wiki.haski.app/"].domain` → extract instance identifier
  2. Secondary: `context.contextActivities.parent[].definition.name.en` (e.g., "HS-KE")
  3. Tertiary: `context.platform` if configured with instance mapping
  - If validation detects mismatch between LRS `instanceId` and statement context, log warning but trust LRS configuration
- **Instance Tagging**: Each processed xAPI statement SHALL include `instanceId` field:
  - Set from LRS configuration during data ingestion
  - Immutable once set (no runtime modification)
  - Propagated to all derived analytics and cached results
- **Storage Schema**: Cache and database SHALL include `instanceId` field:
  - Cache keys: `cache:{metricId}:{instanceId}:{scope}:{filters}:{version}`
  - Database records: `instanceId` column indexed for fast filtering
- **API Filtering**: Analytics endpoints support `instanceId` query parameter:
  - `GET /api/v1/metrics/{id}/results?instanceId=hs-ke` → returns analytics for HS Kempten only
  - `GET /api/v1/metrics/{id}/results` (no param) → returns global aggregated analytics across all instances
  - `GET /api/v1/metrics/{id}/results?instanceId=*` → explicit wildcard for all instances
  - `GET /api/v1/metrics/{id}/results?instanceId=hs-ke,hs-rv` → aggregated analytics for specified instances
- **Instance Metadata Endpoint**: `GET /api/v1/instances` returns configured LRS instances:
  ```json
  {
    "instances": [
      {
        "id": "hs-ke",
        "name": "Hochschule Kempten",
        "status": "healthy",
        "lastSync": "2025-11-10T10:30:00Z"
      },
      {
        "id": "hs-rv",
        "name": "Hochschule Ravensburg-Weingarten",
        "status": "degraded",
        "lastSync": "2025-11-10T10:28:15Z"
      }
    ]
  }
  ```
- **Identity Scoping**: Student/course identifiers scoped to instance:
  - Same student ID from different instances treated as distinct entities
  - No cross-instance identity resolution (privacy requirement)
- **Partial Results**: If LRS for specific instance unavailable:
  - Return partial results with metadata: `{"results": [...], "metadata": {"includedInstances": ["hs-ke"], "excludedInstances": ["hs-rv"]}}`
  - HTTP 200 with warning header: `X-Partial-Results: hs-rv unavailable`
- **Documentation**: API docs specify:
  - `instanceId` extraction strategy (LRS source as primary)
  - Example queries for single, multiple, and all-instance scenarios
  - Context field validation (optional consistency check)

## Verification

- **Configuration Tests**:
  - Unit tests verify instance tagging from LRS configuration
  - Tests confirm statements from LRS endpoint X receive `instanceId=X`
  - Tests verify instance metadata endpoint returns configured instances
- **Instance Isolation Tests**:
  - E2E tests with mock data from multiple LRS instances verify:
    - Query `?instanceId=hs-ke` returns only hs-ke data
    - Query without `instanceId` returns aggregated data from all instances
    - Query `?instanceId=hs-ke,hs-rv` returns correct aggregation
  - Tests verify identity isolation: student ID "12345" from hs-ke != "12345" from hs-rv
- **Context Validation Tests** (optional consistency check):
  - Unit tests verify statement context parsing with production-like structures
  - Tests log warning when LRS `instanceId` doesn't match statement context (but trust LRS config)
- **Partial Results Tests**:
  - Integration tests simulate one LRS unavailable
  - Verify partial results returned with correct metadata
  - Verify HTTP 200 with `X-Partial-Results` header
- **Concurrent Query Tests**:
  - Tests verify parallel queries to multiple LRS instances
  - Verify results correctly tagged and aggregated

## Dependencies

- REQ-FN-002 (xAPI LRS integration) — extended to support multiple endpoints
- REQ-FN-004 (analytics computation) — extended to support instance filtering

## Assumptions / Constraints

- Each university has its own xAPI-compliant LRS with independent actor/activity namespaces.
- Instance identifier is consistently present in xAPI statements from each university.
- No student identity resolution across instances (students are scoped to their instance).
- Configuration is provided via environment variables; no runtime instance registration API.

## API/Interface Impact

- Adds `instanceId` query parameter to all analytics endpoints.
- Adds `/api/v1/instances` endpoint for instance metadata.
- API responses include `instanceId` (or `instanceIds` array for aggregated results) in metadata.

## Observability

- Logs include `instanceId` for all LRS queries and analytics computations.
- Metrics track per-instance query volumes, latencies, and error rates.
- Health checks monitor availability of each configured LRS endpoint.

## Risks / Open Questions

- Need to define behavior if instance identifier is missing from statements (reject, use default, log warning?).
- Clarify aggregation semantics for metrics that don't naturally aggregate (e.g., "last three elements" across instances).

## References

- Stakeholder Need(s): [SG-4-012](../strs-needs/SG-4-012.md)
- Example xAPI context structure provided in requirement discussion

## Change History

- v0.2 — Clarified LRS-based instance tagging as primary strategy (references REQ-FN-002)
- v0.1 — Initial draft
