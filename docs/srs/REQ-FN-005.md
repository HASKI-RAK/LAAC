---
id: REQ-FN-005
title: Results Retrieval, Aggregation, and Export
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-003
owner: TODO
version: 0.1
---

## Description
The system shall expose API endpoints to retrieve analytics results for single or multiple metrics in one request, and support export-friendly formats (JSON; CSV where applicable) for downstream consumption.

## Rationale
Consumers need efficient retrieval and export of computed analytics for dashboards and reporting.

## Acceptance Criteria
- Endpoint to fetch a single metric result and an endpoint to fetch a batch of metric results by IDs in one call.
- Optional response format selection via `Accept` header or `format` query parameter; JSON is default, CSV supported when the payload is tabular.
- Pagination and limits are provided for list-like results to prevent excessively large responses.
- Results include consistent metadata to aid traceability:
  - `metricId`, `generatedAt`, `filters` (as received), `correlationId`
  - Multi-instance metadata per REQ-FN-017: `includedInstances[]`, `excludedInstances[]`, `aggregated: boolean`
- Instance scoping is supported consistently with REQ-FN-017:
  - `instanceId` query parameter MAY be one of:
    - a single instance (e.g., `instanceId=hs-ke`)
    - a comma-separated list (e.g., `instanceId=hs-ke,hs-rv`)
    - a wildcard for all (`instanceId=*`) or omitted (treated as all)
  - When multiple instances are requested or implied, the service aggregates results according to metric semantics

## Verification
- Contract/E2E tests for single and batch retrieval covering JSON and CSV modes for at least one tabular metric.
- Unit tests for format adapters ensuring consistent headers and data alignment.

## Dependencies
- REQ-FN-001, REQ-FN-003, and REQ-FN-004.

## Assumptions / Constraints
- CSV export applies to metrics whose result is a list/table; scalar metrics return single-row CSV or remain JSON only.

## API/Interface Impact
- Endpoints:
  - GET /metrics/{id}/results
  - POST /metrics/results: { ids: string[], commonFilters: ... }
  - Both endpoints accept `instanceId` as defined above and return metadata with `includedInstances` and `excludedInstances`.
- Result Shape (JSON):
  - Standard response object named `MetricResult`:
    ```json
    {
      "metricId": "course-completion",
      "value": 0.82,
      "unit": "ratio",
      "generatedAt": "2025-11-12T10:30:00Z",
      "metadata": {
        "filters": { "courseId": "course-123", "start": "2025-01-01" },
        "includedInstances": ["hs-ke", "hs-rv"],
        "excludedInstances": [],
        "aggregated": true
      }
    }
    ```
- CSV format applies only when `value` is a list/table. Scalar results remain JSON-only or render as single-row CSV if explicitly requested.

## Observability
- Request summaries include number of metrics requested, total compute time, and cache hit rates (see caching requirement).

## Risks / Open Questions
- CSV formatting specifics (delimiter/locale) — default to RFC 4180 with UTF-8.

## References
- Stakeholder Need(s): [SG-4-003](../strs-needs/SG-4-003.md)

## Change History
- v0.1 — Initial draft
