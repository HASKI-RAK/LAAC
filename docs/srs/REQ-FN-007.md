---
id: REQ-FN-007
title: Cache Invalidation and Refresh
type: Functional
status: Draft
priority: Medium
stakeholder_trace: SG-4-004
owner: TODO
version: 0.1
---

## Description
The system shall invalidate cached analytics results when the underlying LRS data changes or when a time-to-live (TTL) expires, ensuring clients receive up-to-date results while benefiting from caching.

## Rationale
Prevents stale analytics from being served after relevant LRS data updates.

## Acceptance Criteria
- Cache entries have a configurable TTL (default and per-metric overrides); expired entries are not served.
- If the LRS exposes data version signals (e.g., xAPI statement timestamps, ETags, or a versioning API), the cache key or validation logic incorporates these to detect changes.
- An administrative or internal endpoint allows manual cache invalidation (e.g., POST /admin/cache/invalidate with optional metric/scope filters).
- Invalidation strategies are documented and configurable: TTL-only, data-version-aware, or hybrid.

## Verification
- Unit tests verify TTL expiry logic.
- E2E tests simulate LRS data change (or timestamp update) and confirm subsequent requests bypass stale cache.
- Tests for manual invalidation endpoint confirm targeted and global invalidation work as expected.

## Dependencies
- REQ-FN-006 (caching).
- LRS integration (REQ-FN-002) if data versioning is used.

## Assumptions / Constraints
- If LRS does not provide versioning, TTL-based expiry is the fallback.
- TTL values are environment-configurable with sensible defaults (e.g., 5–15 minutes for volatile metrics, longer for static ones).

## API/Interface Impact
- Admin endpoint: POST /admin/cache/invalidate with optional filters.
- Cache metadata in responses may include `expiresAt` or `dataVersion`.

## Observability
- Metrics track invalidation events (TTL expiry, manual, data version change).
- Logs record invalidation reasons and scope.

## Risks / Open Questions
- Detecting LRS data changes without polling may require webhook or event-based integration; interim relies on TTL.

## References
- Stakeholder Need(s): [SG-4-004](../strs-needs/SG-4-004.md)

## Change History
- v0.1 — Initial draft

