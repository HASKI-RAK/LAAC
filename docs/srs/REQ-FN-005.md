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
- Results include consistent metadata (metricId, filters applied, generatedAt timestamp) to aid traceability.

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

## Observability
- Request summaries include number of metrics requested, total compute time, and cache hit rates (see caching requirement).

## Risks / Open Questions
- CSV formatting specifics (delimiter/locale) — default to RFC 4180 with UTF-8.

## References
- Stakeholder Need(s): [SG-4-003](../strs-needs/SG-4-003.md)

## Change History
- v0.1 — Initial draft

