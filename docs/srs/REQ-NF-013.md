---
id: REQ-NF-013
title: Multi-Instance Data Isolation and Consistency
type: Non-Functional
status: Draft
priority: High
stakeholder_trace: SG-4-012
owner: TODO
version: 0.1
---

## Description
The system shall maintain strict data isolation between university instances, ensuring that analytics queries scoped to one instance never leak data from another instance, while providing consistent aggregation semantics for cross-instance queries.

## Rationale
Each university's data is logically separate; privacy and correctness require that instance filtering is reliably enforced.

## Acceptance Criteria
- Data isolation: When `instanceId` parameter is specified, results contain only data from that instance (no cross-contamination).
- Identity scoping: Student and course identifiers are scoped to their instance; identical IDs from different instances are treated as distinct entities.
- Aggregation correctness: Cross-instance aggregations (no `instanceId` or `instanceId=*`) correctly combine data from all configured instances without double-counting.
- Partial failure handling: If one instance's LRS is unavailable, queries can still return results from available instances with clear metadata indicating partial results.
- Instance tagging: 100% of ingested statements are correctly tagged with their source instance (verified via audit).
- Filtering enforcement: Instance filtering is applied at the storage/query layer, not just presentation, to prevent data leaks.
- Tests:
  - Unit tests verify instance tagging logic with various xAPI context structures.
  - Integration tests with multi-instance mock data verify isolation and aggregation correctness.
  - Security tests attempt to bypass instance filters and verify they fail.

## Verification
- Automated tests create mock data for multiple instances and verify:
  - Single-instance query returns only that instance's data
  - Cross-instance query correctly aggregates
  - No data leakage between instances
- Code review verifies instance filtering is enforced in data access layer, not just application layer.

## Dependencies
- REQ-FN-017 (Multi-instance support)

## Assumptions / Constraints
- Instance identifier is reliably extractable from xAPI statements.
- No student identity resolution across instances (same student ID in different instances treated as different students).

## Observability
- Audit logs track all instance-scoped queries with instanceId and result counts.
- Metrics track per-instance data volumes and query patterns.

## Risks / Open Questions
- Define behavior if instanceId is missing from a statement (reject, default instance, or log warning).

## References
- Stakeholder Need(s): [SG-4-012](../strs-needs/SG-4-012.md)

## Change History
- v0.1 — Initial draft

