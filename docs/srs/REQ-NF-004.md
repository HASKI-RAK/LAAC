---
id: REQ-NF-004
title: Determinism, Idempotency, and Result Consistency
type: Non-Functional
status: Draft
priority: High
stakeholder_trace: SG-4-003
owner: TODO
version: 0.1
---

## Description
Analytics computations shall be deterministic for the same input dataset and filters, idempotent across repeated calls, and return consistent structures (including units and metadata) across metrics and versions.

## Rationale
Predictable analytics enable correct downstream use and facilitate testing.

## Acceptance Criteria
- Given unchanged LRS inputs and identical filters, repeated computations return identical results.
- API results include a `generatedAt` timestamp and `metricVersion` field for traceability.
- Error and empty-result cases use consistent JSON structures with machine-parseable codes.

## Verification
- Unit tests asserting same-input same-output behavior.
- Contract tests verifying presence of required metadata fields and error shapes.

## Dependencies
- REQ-FN-004 and REQ-FN-005.

## Assumptions / Constraints
- None.

## Observability
- Metrics and logs show compute durations and idempotent request deduplication, if implemented.

## Risks / Open Questions
- None.

## References
- Stakeholder Need(s): [SG-4-003](../strs-needs/SG-4-003.md)

## Change History
- v0.1 — Initial draft

