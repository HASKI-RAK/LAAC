---
id: REQ-NF-013
title: Multi-Instance Data Isolation and Consistency
type: Non-Functional
status: Draft
priority: High
stakeholder_trace: SG-4-012
owner: TODO
version: 0.2
---

## Description

The system shall maintain strict data isolation between university LRS instances (per REQ-FN-002, REQ-FN-017), ensuring that analytics queries scoped to one instance never leak data from another instance, while providing consistent aggregation semantics for cross-instance queries. Instance isolation is enforced at the LRS source level during data ingestion.

## Rationale

Each university's data is logically separate; privacy and correctness require that instance filtering is reliably enforced.

## Acceptance Criteria

- **Source-Level Isolation**: Data isolation enforced at ingestion time:
  - All statements from LRS endpoint are tagged with that LRS's `instanceId` (immutable)
  - No runtime re-tagging or `instanceId` modification allowed
  - Statements from different LRS endpoints cannot share `instanceId` (enforced by configuration validation)
- **Query-Level Filtering**: When `instanceId` parameter specified, results contain only data from that instance:
  - Filtering applied at storage/query layer (database WHERE clause, Redis key pattern)
  - No post-query filtering in application layer (prevents accidental leaks)
  - Unit tests verify filtering enforced in data access layer
- **Identity Scoping**: Student and course identifiers scoped to their source LRS instance:
  - Identical actor IDs from different LRS treated as distinct entities
  - Database schema: composite key `(instanceId, actorId)` for uniqueness
  - Analytics never merge actors across instances (privacy requirement)
- **Aggregation Correctness**: Cross-instance aggregations correctly combine data:
  - Queries without `instanceId` or `instanceId=*` aggregate all configured instances
  - Aggregation logic preserves instance boundaries (no double-counting)
  - Metrics that don't aggregate (e.g., "last N elements") return per-instance results with `instanceId` tags
- **Partial Failure Handling**: One LRS unavailable doesn't block others:
  - Queries return results from available instances
  - Metadata field indicates excluded instances: `{"excludedInstances": ["hs-rv"]}`
  - Health check reports per-instance status (healthy/degraded/unavailable)
- **Instance Tagging Audit**: 100% of ingested statements correctly tagged:
  - Database constraint prevents NULL `instanceId` (fail insert if missing)
  - Monitoring alert if any statement without `instanceId` detected
  - Periodic audit query: `SELECT COUNT(*) FROM statements WHERE instanceId IS NULL` (expect 0)
- **Security Tests**: Attempt to bypass instance filters SHALL fail:
  - Test: Query `?instanceId=hs-ke` and verify response contains NO data from other instances
  - Test: Malicious query param `?instanceId=hs-ke' OR '1'='1` returns only hs-ke data (SQL injection protection)
  - Test: Cache key collision attack fails (keys include `instanceId` component)

## Verification

- **Isolation Tests**:
  - Create mock data from 3 LRS instances (hs-ke, hs-rv, hs-test)
  - Verify single-instance query returns only that instance's data (0 leakage)
  - Verify cross-instance query correctly aggregates without double-counting
  - Verify identity isolation: same actor ID in different instances treated as different actors
- **Data Access Layer Review**:
  - Code review confirms filtering in repository/DAO layer (not controller layer)
  - Verify SQL queries include `WHERE instanceId = ?` clause
  - Verify Redis keys include `instanceId` component
- **Security Penetration Tests**:
  - Attempt SQL injection via `instanceId` parameter (should fail safely)
  - Attempt cache key manipulation to access other instances (should fail)
  - Attempt to omit `instanceId` in internal API calls (should use default or fail)
- **Audit and Monitoring**:
  - Database constraint test: attempt to insert statement without `instanceId` (should fail)
  - Periodic audit job verifies 100% tagging coverage
  - Alert fires if any untagged statement detected

## Dependencies

- REQ-FN-017 (Multi-instance support)

## Assumptions / Constraints

- Instance identifier is reliably extractable from xAPI statements.
- No student identity resolution across instances (same student ID in different instances treated as different students).

## Observability

- Audit logs track all instance-scoped queries with instanceId and result counts.
- Metrics track per-instance data volumes and query patterns.

## Risks / Open Questions

- **Q**: What if a statement's context doesn't match its source LRS `instanceId`?
  - **A**: Log warning for visibility, but trust LRS configuration as source of truth (primary strategy per REQ-FN-017)
- **Q**: How to handle LRS reconfiguration (e.g., institution changes `instanceId`)?
  - **A**: Not supported in v1. Requires data migration. Document as operational constraint.
- **Q**: Performance impact of per-instance filtering?
  - **A**: Mitigated by indexed `instanceId` column and cache key partitioning. Monitor query latency metrics.

## References

- Stakeholder Need(s): [SG-4-012](../strs-needs/SG-4-012.md)

## Change History

- v0.2 — Clarified LRS-based isolation enforcement at ingestion time (references REQ-FN-002, REQ-FN-017)
- v0.1 — Initial draft
