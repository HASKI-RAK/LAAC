---
id: REQ-FN-003
title: Analytics Metrics Catalog and Discovery
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-003
owner: TODO
version: 0.1
---

## Description
The system shall provide a metrics catalog exposing a discoverable list of analytics available to clients. The catalog is maintained as a service artifact (e.g., code constants, configuration, or manifest file) and references `docs/resources/LAAC_Learning_Analytics_Requirements.csv` as the authoritative specification. Each metric shall have a stable identifier, human-readable title, dashboard level, and a short description.

## Rationale
Clients need to discover which analytics are implemented and how to reference them at runtime; the CSV serves as the authoritative reference specification that the implemented catalog must fully cover.

## Acceptance Criteria
- Catalog includes one entry for each CSV-specified metric with fields: `id`, `dashboardLevel`, `description` and optional `params`.
- Identifiers are stable across service restarts; collisions are prevented by design or validation.
- An API endpoint exists to list metrics and retrieve details for a metric by `id`.
- Documentation or verification tooling confirms all CSV-specified metrics are present in the catalog.

## Verification
- Unit tests for catalog structure and collision prevention.
- Contract/E2E tests for catalog endpoints (list and detail) verifying presence of all specified metrics.
- Documentation review or automated check confirms CSV and catalog are in sync.

## Dependencies
- Traceability verification (see REQ-NF-003).
- Client-facing API surface (see REQ-FN-001).

## Assumptions / Constraints
- The CSV columns are: `Dashboard Level`, `Metric Description`, `Source`.
- `Source` is informational for now and may be omitted in the API.
- Catalog is maintained as code/config, not dynamically parsed from CSV at runtime.

## API/Interface Impact
- Endpoints:
  - GET /metrics — returns the catalog list.
  - GET /metrics/{id} — returns details for a specific metric.

## Observability
- Log the total number of metrics registered at startup.

## Risks / Open Questions
- Maintaining CSV-to-catalog sync is manual or semi-automated; tracked under REQ-NF-003.

## References
- Stakeholder Need(s): [SG-4-003](../strs-needs/SG-4-003.md)
- CSV: [LAAC_Learning_Analytics_Requirements.csv](../resources/LAAC_Learning_Analytics_Requirements.csv)

## Change History
- v0.1 — Initial draft

