---
id: REQ-FN-006
title: Analytics Results Caching
type: Functional
status: Draft
priority: Medium
stakeholder_trace: SG-4-004
owner: TODO
version: 0.1
---

## Description
The system shall cache computed analytics results so that identical requests (same metric, filters, and LRS data state) are served from cache rather than recomputed, reducing latency and LRS query load.

## Rationale
Improves response times for repeated queries and reduces unnecessary computation when underlying data has not changed.

## Acceptance Criteria
- Cache keys incorporate all parameters influencing results: metric ID, actor/student ID, course/topic/element IDs, time range, and a representation of the relevant LRS data state.
- On cache hit, the cached result is returned without querying the LRS or recomputing.
- Cache entries include metadata: `cachedAt` timestamp, `expiresAt` (if TTL-based), and optionally a `dataVersion` or hash.
- Cache storage is configurable (in-memory, Redis, or similar) via environment configuration.
- API responses include a cache indicator header or metadata field (e.g., `X-Cache: HIT` or `cacheStatus: "hit"`).

## Verification
- Unit tests mock cache storage and verify hit/miss logic for known keys.
- E2E tests issue identical requests and confirm the second is a cache hit (via header/metadata or logs).
- Performance tests demonstrate reduced latency for cache hits vs. fresh computation.

## Dependencies
- REQ-FN-004 (analytics computation).
- REQ-FN-005 (results retrieval).
- Invalidation strategy (see REQ-FN-007).

## Assumptions / Constraints
- Cache keys must be deterministic and collision-free.
- LRS provides signals (timestamps, versions, or ETags) to detect data changes; if unavailable, TTL-based expiry is used.

## API/Interface Impact
- Response headers or metadata indicate cache status.
- Optional query parameter `cache=bypass` to force recomputation for debugging/testing.

## Observability
- Metrics track cache hit/miss rates per metric ID.
- Logs include cache key and status for each request.

## Risks / Open Questions
- Cache key design must balance specificity and reuse; overly specific keys reduce hit rates.

## References
- Stakeholder Need(s): [SG-4-004](../strs-needs/SG-4-004.md)

## Change History
- v0.1 — Initial draft

