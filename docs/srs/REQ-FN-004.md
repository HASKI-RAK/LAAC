---
id: REQ-FN-004
title: Compute Analytics from xAPI LRS per CSV Metric
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-003
owner: TODO
version: 0.1
---

## Description
The system shall compute analytics results for every metric specified in `docs/resources/LAAC_Learning_Analytics_Requirements.csv` (used as the authoritative reference) using data retrieved from the configured xAPI LRS. For each metric, the system shall implement the required xAPI queries and aggregations to produce deterministic outputs.

## Rationale
Delivers the core value of the service: turning LRS statements into actionable analytics aligned with the CSV catalog.

## Acceptance Criteria
- For every CSV metric, a corresponding computation is implemented and reachable through the service API.
- Computations operate over xAPI data only (see REQ-NF-001) and support filtering by time range and, where applicable, by course, topic, learning element, and student.
- If a metric requires a notion of "best attempt", the selection criteria are defined and documented consistently across metrics.
- Missing data or gaps in xAPI statements result in well-defined empty/zero outputs rather than failures, with explanatory metadata.
- All computations return a normalized `MetricResult` object as their API surface (see API/Interface Impact) to ensure consistency across metrics and providers.

## Verification
- Unit tests with seeded/mock xAPI statements validate the computations for representative metrics across the three dashboard levels (course, topic, element).
- E2E tests call the API endpoints for several metrics and verify expected values based on the mock dataset.

## Dependencies
- xAPI integration (REQ-FN-002).
- Catalog/discovery (REQ-FN-003).

## Assumptions / Constraints
- The CSV does not prescribe exact formulas; the initial definitions follow common-sense interpretations documented in code and API docs.
- Time range filters default to inclusive [start, end].

## API/Interface Impact
- Endpoint pattern: GET /metrics/{id}/results with query params for `actorId`, `courseId`, `topicId`, `elementId`, `start`, `end` as applicable per metric. Instance scoping via `instanceId` per REQ-FN-017.
- Response shape: normalized `MetricResult` object:
  ```json
  {
    "metricId": "<metric-identifier>",
    "value": <scalar|object|array>,
    "unit": "<unit-if-applicable>",
    "generatedAt": "<ISO timestamp>",
    "metadata": {
      "filters": { /* echo validated filters */ },
      "includedInstances": [ /* per REQ-FN-017 when cross-instance */ ],
      "excludedInstances": [ /* per REQ-FN-017 */ ],
      "aggregated": <boolean>
    }
  }
  ```

## Observability
- Each computation logs duration and key filter dimensions; counters for success/failure per metric are exported.

## Risks / Open Questions
- Formal definition of "best attempt" may evolve; tracked as a versioned interpretation in docs.

## References
- Stakeholder Need(s): [SG-4-003](../strs-needs/SG-4-003.md)
- CSV: [LAAC_Learning_Analytics_Requirements.csv](../resources/LAAC_Learning_Analytics_Requirements.csv)

## Change History
- v0.1 — Initial draft
