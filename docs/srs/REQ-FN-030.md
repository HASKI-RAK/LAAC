---
id: REQ-FN-030
title: Incremental Metrics Cache Refresh
type: Functional
status: Proposed
priority: High
stakeholder_trace: SG-4-004
owner: TODO
version: 1
---

## Description

The system shall incrementally refresh cached metric results by fetching only new xAPI statements since the last processed statement for the same metric parameters, updating the cached aggregation, and returning the updated result to the client.

## Rationale

Full re-fetch and recomputation after cache expiry causes excessive latency for deep pagination. Incremental refresh reduces LRS load and keeps results up to date with low response time.

## Acceptance Criteria

- On a cache miss for a given metric and parameter set, the system performs a full LRS fetch, computes the metric, and stores both the result and a cursor that identifies the latest processed statement.
- On a cache hit, the system queries the LRS for statements newer than the stored cursor and updates the cached aggregation without full recomputation.
- If no new statements are returned, the system responds using the cached aggregation without modifying it.
- If the cache entry is explicitly invalidated, the next request performs a full fetch and resets the cursor.

## Verification

- Unit tests: add coverage for cache cursor persistence and incremental aggregation updates in computation orchestration services.
- E2E tests: verify incremental refresh with staged LRS statements in test scenarios under test/ (e.g., metrics-results and cache flows).
- Performance checks: confirm no deep pagination on cache hits and acceptable latency under REQ-NF-017.

## Dependencies

- REQ-FN-002, REQ-FN-006, REQ-FN-007
- REQ-NF-006, REQ-NF-007, REQ-NF-017

## Assumptions / Constraints

- The LRS supports querying statements with a "since" parameter using xAPI semantics.
- The cursor is based on a stable ordering (timestamp and/or statement ID) to prevent missed or duplicated statements.

## API/Interface Impact (if applicable)

- No external API changes required; internal cache value must include cursor metadata.

## Observability (if applicable)

- Log incremental refresh decisions (full fetch vs incremental) without PII.
- Emit metrics for incremental fetch count and statements processed per refresh.

## Risks / Open Questions

- Late-arriving statements with older timestamps may be missed without a safety window.
- Decide whether to use timestamp-only or a composite cursor (timestamp + statement ID).

## References

- Stakeholder Need(s): docs/strs-needs/SG-4-004.md
- xAPI statement query semantics

## Change History

- v0.1 — Initial draft
