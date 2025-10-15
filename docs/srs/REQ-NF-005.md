---
id: REQ-NF-005
title: Analytics Endpoint Performance (CSV Metrics)
type: Non-Functional
status: Draft
priority: High
stakeholder_trace: SG-4-003, SG-4-010
owner: TODO
version: 0.1
---

## Description
Analytics endpoints serving CSV-defined metrics shall meet a performance SLO suitable for interactive dashboards.

## Rationale
Ensures timely responses when retrieving analytics based on the CSV-defined catalog.

## Acceptance Criteria
- P50 ≤ 300 ms, P95 ≤ 1000 ms for GET /metrics/{id}/results under nominal dataset sizes and typical filters, measured server-side.
- Batch endpoint P95 ≤ 2000 ms for up to 5 metrics in one request.
- Performance is measured in CI or pre-production environments with representative datasets or mocks.

## Verification
- Automated performance tests or benchmarks are executed in CI with thresholds enforcing the SLO.

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
- v0.1 — Initial draft

