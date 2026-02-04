````markdown
---
id: REQ-FN-032
title: Compute Analytics from xAPI LRS per CSV v3 Metric
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-003
owner: theupsider
version: 0.1
---

## Description

The system shall compute analytics results for every metric specified in `docs/resources/LAAC_Learning_Analytics_Requirements.v3.csv` (authoritative v3 baseline) using data retrieved from the configured xAPI LRS. For each metric, the system shall implement the required xAPI queries and aggregations to produce deterministic outputs aligned with the v3 CSV schema and naming.

## Rationale

Delivers the core value of the service against the updated CSV v3 catalog while preserving traceability and backward compatibility strategy. The v3 catalog introduces clearer hierarchical naming, standardized output fields, and a new user-level cross-course metric.

## Acceptance Criteria

- For every v3 CSV metric (current list: `courses-scores`, `courses-max-scores`, `courses-time-spent`, `user-last-elements`, `course-topics-scores`, `course-topics-max-scores`, `course-topics-time-spent`, `course-last-elements`, `topic-elements-best-attempts`, `topic-elements-max-scores`, `topic-elements-time-spent`, `topic-last-elements`), a corresponding computation is implemented and reachable through the service API.
- Computations operate over xAPI data only (see REQ-NF-001) and support filtering by the inputs listed in the v3 CSV (`userId`, `courseId`, `topicId`, and optional `since`/`until`), with validation and explicit erroring when required inputs are missing.
- If a metric requires `userId`, the LRS query **must** filter by actor (xAPI `agent`) so results are scoped per user (no cross-user aggregation).
- If a metric requires a notion of "best attempt" or a max score, the selection criteria are defined consistently with the metrics specification (v3) and documented in code comments (REQ-FN-019).
- Missing data or gaps in xAPI statements result in well-defined empty/zero outputs rather than failures, with explanatory metadata.
- All computations return a normalized `MetricResult` object as their API surface (see API/Interface Impact) to ensure consistency across metrics and providers.

### Global Aggregation Rules (from CSV v3)

Per the CSV v3 specification:

- **Score aggregation** MUST consider only the highest-scoring attempt per learning element.
- **Time aggregation** MUST sum the durations of all attempts.
- **All time values** MUST be returned in seconds.
- **All calculations** MUST consider only entities the user is authorized to access.

### CSV Verification Checkpoint (v3)

**MANDATORY for all implementations of this requirement:**

Before implementation begins:

- [ ] Generate traceability table mapping each v3 CSV row to a provider ID (use the CSV `ID` slug exactly)
- [ ] Wait for human approval of the mapping before writing code
- [ ] Provider IDs must match CSV `ID` values systematically
- [ ] Output schema must align with the CSV `Output` column and metric description
- [ ] No derived/computed metrics beyond CSV specification unless explicitly documented as separate requirements

During implementation:

- [ ] Provider naming follows systematic pattern: CSV `ID` → provider file (e.g., `courses-scores.provider.ts`)
- [ ] Each provider includes JSDoc comment: "Implements CSV v3 metric: <ID> — <Description>"
- [ ] Test data validates CSV-described data points exactly as written

Before marking story complete:

- [ ] AI/Developer confirms: "This provider implements CSV v3 metric `<ID>`: <Description>"
- [ ] Verification: If calculating percentages, rates, or averages not in CSV → STOP and create separate requirement ID

**Red Flag Check:** Derived metrics require explicit specification. The v3 CSV defines raw data aggregations; any additional analytics must be captured as new metrics/requirements.

## Verification

- Unit tests with seeded/mock xAPI statements validate the computations for representative metrics across dashboard levels.
- E2E tests call the API endpoints for several metrics and verify expected values based on the mock dataset.

## Dependencies

- xAPI integration (REQ-FN-002).
- Catalog/discovery (REQ-FN-003).
- API versioning/deprecation (REQ-FN-016) to expose v3 while maintaining v2 compatibility plans.

## Assumptions / Constraints

- The v3 CSV is the authoritative catalog for this requirement; v2 remains available for legacy clients under REQ-FN-031 (Deprecated).
- Time range filters default to inclusive [since, until). `since`/`until` are optional unless required by the CSV row.

## API/Interface Impact

- Endpoint pattern: GET /metrics/{id}/results with query params for `userId`, `courseId`, `topicId`, `since`, `until` as applicable per metric. Instance scoping via `instanceId` per REQ-FN-017. For `userId` metrics, map `userId` to the xAPI `agent` filter (account-based actor) in LRS queries.
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
````

## Observability

- Each computation logs duration and key filter dimensions; counters for success/failure per metric are exported.

## Risks / Open Questions

- Migration plan for clients consuming v2 provider IDs (see migration guide in `docs/api-migrations/2026-02-metrics-csv-v3.md`).
- Alignment of output shapes with front-end expectations; may require a beta period with dual publishing.

## References

- Stakeholder Need(s): [SG-4-003](../strs-needs/SG-4-003.md)
- CSV v3: [LAAC_Learning_Analytics_Requirements.v3.csv](../resources/LAAC_Learning_Analytics_Requirements.v3.csv)
- CSV v2 (legacy, for reference): [LAAC_Learning_Analytics_Requirements.v2.csv](../resources/LAAC_Learning_Analytics_Requirements.v2.csv)
- Migration Guide: [2026-02-metrics-csv-v3.md](../api-migrations/2026-02-metrics-csv-v3.md)

## Change History

- v0.1 — Initial draft for CSV v3 baseline; supersedes REQ-FN-031

```

```
