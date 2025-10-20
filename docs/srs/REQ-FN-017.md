
---
id: REQ-FN-017
title: Multi-Instance Support and Cross-Instance Analytics
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-012
owner: TODO
version: 0.1
---

## Description
The system shall support querying multiple university LRS instances, identify the source instance from xAPI statement context, and provide both per-instance filtered analytics and global cross-instance aggregated analytics.

## Rationale
HASKI serves multiple universities with independent LRS deployments. Analytics must be available both at individual university level and aggregated across all instances for comparative insights.

## Acceptance Criteria
- Configuration supports multiple LRS endpoints defined via environment variables or configuration file:
  - Each instance has: `instanceId`, `name`, `lrsUrl`, `lrsAuth` (credentials)
  - Example: `INSTANCES='[{"id":"HS-KE","name":"Hochschule Kempten","lrsUrl":"https://lrs.ke.haski.app","lrsAuth":"..."}]'`
- Instance extraction from xAPI statements uses a configurable strategy with fallback hierarchy:
  1. Primary: `context.extensions["https://wiki.haski.app/"].domain` → extract instance identifier
  2. Secondary: `context.contextActivities.parent[].definition.name.en` (e.g., "HS-KE")
  3. Tertiary: `context.platform` if configured with instance mapping
- Each ingested xAPI statement is tagged with `instanceId` during processing.
- Storage (cache, database) includes `instanceId` field for all analytics records.
- API endpoints support `instanceId` query parameter:
  - `GET /api/v1/metrics/{id}/results?instanceId=HS-KE` → returns analytics for that instance only
  - `GET /api/v1/metrics/{id}/results?instanceId=*` or omit parameter → returns global aggregated analytics across all instances
  - Multiple instances: `?instanceId=HS-KE,HS-RV` → returns aggregated analytics for specified instances
- Instance metadata endpoint: `GET /api/v1/instances` returns list of configured instances with `id`, `name`, and status.
- Instance isolation: Student/course identifiers are scoped to their instance; no cross-instance identity resolution.
- Error handling: If LRS for a specific instance is unavailable, return partial results with metadata indicating which instances are included/excluded.
- Documentation specifies xAPI context fields used for instance identification with examples from production.

## Verification
- Unit tests verify instance extraction from xAPI statements with production-like context structures.
- E2E tests with mock data from multiple instances verify filtering and aggregation:
  - Query by single instance returns only that instance's data
  - Query without instanceId returns aggregated data from all instances
  - Query with multiple instances returns correct aggregation
- Tests verify isolation: student from HS-KE does not appear in HS-RV results.
- Integration tests verify connection to multiple LRS endpoints and concurrent querying.

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
- v0.1 — Initial draft

