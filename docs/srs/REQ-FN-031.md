---
id: REQ-FN-031
title: Compute Analytics from xAPI LRS per CSV v2 Metric
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-003
owner: theupsider
version: 0.1
---

## Description

The system shall compute analytics results for every metric specified in `docs/resources/LAAC_Learning_Analytics_Requirements.v2.csv` (authoritative v2 baseline) using data retrieved from the configured xAPI LRS. For each metric, the system shall implement the required xAPI queries and aggregations to produce deterministic outputs aligned with the v2 CSV schema and naming.

## Rationale

Delivers the core value of the service against the updated CSV catalog while preserving traceability and backward compatibility strategy.

## Acceptance Criteria

- For every v2 CSV metric (current list: `courses-total-scores`, `courses-max-scores`, `courses-time-spent`, `courses-last-elements`, `topics-total-scores`, `topics-max-scores`, `topics-time-spent`, `topics-last-elements`, `elements-completion-status`, `elements-max-scores`, `elements-time-spent`, `elements-last-elements`), a corresponding computation is implemented and reachable through the service API.
- Computations operate over xAPI data only (see REQ-NF-001) and support filtering by the inputs listed in the v2 CSV (`userId`, `courseId`, `topicId`, and optional `since`/`until`), with validation and explicit erroring when required inputs are missing.
- If a metric requires `userId`, the LRS query **must** filter by actor (xAPI `agent`) so results are scoped per user (no cross-user aggregation).
- If a metric requires a notion of "best attempt" or a max score, the selection criteria are defined consistently with the metrics specification (v2) and documented in code comments (REQ-FN-019).
- Missing data or gaps in xAPI statements result in well-defined empty/zero outputs rather than failures, with explanatory metadata.
- All computations return a normalized `MetricResult` object as their API surface (see API/Interface Impact) to ensure consistency across metrics and providers.

### CSV Verification Checkpoint (v2)

**MANDATORY for all implementations of this requirement:**

Before implementation begins:

- [ ] Generate traceability table mapping each v2 CSV row to a provider ID (use the CSV `Name` slug exactly)
- [ ] Wait for human approval of the mapping before writing code
- [ ] Provider IDs must match CSV `Name` values systematically (no CO/TO/EO prefixes for v2)
- [ ] Output schema must align with the CSV `Output` column and metric description
- [ ] No derived/computed metrics beyond CSV specification unless explicitly documented as separate requirements

During implementation:

- [ ] Provider naming follows systematic pattern: CSV `Name` → provider file (e.g., `courses-total-scores.provider.ts`)
- [ ] Each provider includes JSDoc comment: "Implements CSV v2 metric: <Name> — <Description>"
- [ ] Test data validates CSV-described data points exactly as written

Before marking story complete:

- [ ] AI/Developer confirms: "This provider implements CSV v2 metric `<Name>`: <Description>"
- [ ] Verification: If calculating percentages, rates, or averages not in CSV → STOP and create separate requirement ID

**Red Flag Check:** Derived metrics require explicit specification. The v2 CSV defines raw data aggregations; any additional analytics must be captured as new metrics/requirements.

## Verification

- Unit tests with seeded/mock xAPI statements validate the computations for representative metrics across dashboard levels.
- E2E tests call the API endpoints for several metrics and verify expected values based on the mock dataset.

## Dependencies

- xAPI integration (REQ-FN-002).
- Catalog/discovery (REQ-FN-003).
- API versioning/deprecation (REQ-FN-016) to expose v2 while maintaining v1 compatibility plans.

## Assumptions / Constraints

- The v2 CSV is the authoritative catalog for this requirement; v1 remains available for legacy clients under REQ-FN-004 (Deprecated).
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

## Observability

- Each computation logs duration and key filter dimensions; counters for success/failure per metric are exported.

## Risks / Open Questions

- Migration plan for clients consuming v1 provider IDs (see migration guide in `docs/api-migrations`).
- Alignment of output shapes with front-end expectations; may require a beta period with dual publishing.

## References

- Stakeholder Need(s): [SG-4-003](../strs-needs/SG-4-003.md)
- CSV v2: [LAAC_Learning_Analytics_Requirements.v2.csv](../resources/LAAC_Learning_Analytics_Requirements.v2.csv)
- Legacy CSV v1 (for reference): [LAAC_Learning_Analytics_Requirements.csv](../resources/LAAC_Learning_Analytics_Requirements.csv)

## Change History

- v0.2 — **DEPRECATED** (2026-02-04): Superseded by REQ-FN-032 (CSV v3 baseline)
- v0.1 — Initial draft for CSV v2 baseline; supersedes REQ-FN-004
