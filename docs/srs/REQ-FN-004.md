---
id: REQ-FN-004
title: Compute Analytics from xAPI LRS per CSV Metric
type: Functional
status: Deprecated
priority: High
stakeholder_trace: SG-4-003
owner: theupsider
version: 0.3
---

**DEPRECATED**: Superseded by REQ-FN-031 (CSV v2 baseline). This requirement is retained for legacy clients tied to `docs/resources/LAAC_Learning_Analytics_Requirements.csv` (v1).

---

## Description

The system shall compute analytics results for every metric specified in `docs/resources/LAAC_Learning_Analytics_Requirements.csv` (authoritative v1 baseline) using data retrieved from the configured xAPI LRS. For each metric, the system shall implement the required xAPI queries and aggregations to produce deterministic outputs for legacy consumers.

## Rationale

Delivers the core value of the service: turning LRS statements into learning analytics aligned with the CSV catalog.

## Acceptance Criteria

- For every CSV metric, a corresponding computation is implemented and reachable through the service API.
- Computations operate over xAPI data only (see REQ-NF-001) and support filtering by time range and, where applicable, by course, topic, learning element, and student.
- If a metric requires `userId`, the LRS query **must** filter by actor (xAPI `agent`) so results are scoped per user (no cross-user aggregation).
- If a metric requires a notion of "best attempt", the selection criteria are defined and documented consistently across metrics.
- Missing data or gaps in xAPI statements result in well-defined empty/zero outputs rather than failures, with explanatory metadata.
- All computations return a normalized `MetricResult` object as their API surface (see API/Interface Impact) to ensure consistency across metrics and providers.

### CSV Verification Checkpoint

**MANDATORY for all implementations of this requirement:**

Before implementation begins:

- [ ] Generate traceability table mapping each CSV row to a provider ID (CO-XXX, TO-XXX, EO-XXX format)
- [ ] Wait for human approval of the mapping before writing code
- [ ] Provider IDs must match CSV line items systematically
- [ ] Output schema must match CSV "Metric Description" column exactly as written
- [ ] No derived/computed metrics (percentages, averages, scores) beyond CSV specification unless explicitly documented as separate metrics

During implementation:

- [ ] Provider naming follows systematic pattern: CSV row → provider file (e.g., CO-001 → `course-total-score.provider.ts`)
- [ ] Each provider includes JSDoc comment: "Implements CSV row X: [exact metric description from CSV]"
- [ ] Test data validates CSV-described data points exactly as written (no interpretation or abstraction)

Before marking story complete:

- [ ] AI/Developer confirms: "This provider implements CSV row X, Dashboard Level: [level], Metric Description: [exact CSV text]"
- [ ] Verification: If calculating percentages, rates, or averages not in CSV → STOP and create separate requirement ID

**Red Flag Check:** Derived metrics require explicit specification. The CSV defines raw data aggregations (totals, counts, lists). If your implementation computes analytics beyond simple aggregation, verify this is intentional and documented.

## Verification

- Unit tests with seeded/mock xAPI statements validate the computations for representative metrics across the three dashboard levels (course, topic, element).
- E2E tests call the API endpoints for several metrics and verify expected values based on the mock dataset.

## Dependencies

- xAPI integration (REQ-FN-002).
- Catalog/discovery (REQ-FN-003).

## Assumptions / Constraints

- The CSV does not prescribe exact formulas; the initial definitions follow common-sense interpretations documented in code and API docs.
- Time range filters default to inclusive [start, end].
- New metrics and updated semantics must target REQ-FN-031; this requirement receives only compatibility fixes.

## API/Interface Impact

- Endpoint pattern: GET /metrics/{id}/results with query params for `actorId`, `courseId`, `topicId`, `elementId`, `start`, `end` as applicable per metric. Instance scoping via `instanceId` per REQ-FN-017. For `userId` metrics, map `userId` to the xAPI `agent` filter (account-based actor) in LRS queries.
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
- [Structure of xAPI Statements in LRS](../docs/resources/xapi/XAPI-STATEMENT-STRUCTURE.md.md)

## Change History

- v0.3 — Deprecated; superseded by REQ-FN-031 (CSV v2 baseline)
- v0.1 — Initial draft
- v0.2 — Added Structure doc reference
