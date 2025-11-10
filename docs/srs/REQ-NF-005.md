---
id: REQ-NF-005
title: Analytics Endpoint Performance (CSV Metrics)
type: Non-Functional
status: Deprecated
priority: High
stakeholder_trace: SG-4-003, SG-4-010
owner: TODO
version: 0.2
---

**DEPRECATED**: This requirement has been superseded by REQ-NF-017 (Analytics Endpoint Latency SLO). See REQ-NF-017 for the authoritative performance SLOs. This file is retained for historical reference only.

---

## Description

Analytics endpoints serving CSV-defined metrics shall meet a performance SLO suitable for interactive dashboards under documented load conditions.

## Rationale

Ensures timely responses when retrieving analytics based on the CSV-defined catalog.

## Acceptance Criteria

- P50 ≤ 300 ms, P95 ≤ 1000 ms for GET /api/v1/metrics/{id}/results under nominal load and dataset sizes, measured server-side.
- Batch endpoint P95 ≤ 2000 ms for up to 5 metrics in one request.
- Load profile: Must meet SLO under peak load of 20 concurrent students, with typical load of 1-2 concurrent students.
- Dataset scope: Up to 20 active students × 10 courses × typical xAPI statement volume per student per course.
- Cold cache: First request after cache invalidation may take up to 2000 ms (P95); subsequent requests must meet standard SLO.
- No horizontal scaling required: System meets SLO with vertical scaling only (single instance with adequate CPU/memory).
- Performance is measured in CI or pre-production environments with representative datasets or mocks.

## Verification

- Automated performance tests or benchmarks are executed in CI with thresholds enforcing the SLO.
- Load tests simulate 20 concurrent users with representative query patterns.

## Dependencies

- REQ-FN-004, REQ-FN-005. Caching may be addressed by SG-4-004 derived requirements.

## Assumptions / Constraints

- "Nominal dataset" to be defined and documented; interim use of seeded mock LRS datasets.

## Observability

- Export latency histograms per metric id and overall.

## Risks / Open Questions

- Tuning may require caching and pagination; tracked under SG-4-004.

## References

- Stakeholder Need(s): [SG-4-003](../strs-needs/SG-4-003.md), [SG-4-010](../strs-needs/SG-4-010.md)

## Change History

- v0.2 — Deprecated; superseded by REQ-NF-017
- v0.1 — Initial draft
