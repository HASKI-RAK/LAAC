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
The system shall provide a metrics catalog derived from `docs/resources/LAAC_Learning_Analytics_Requirements.csv`, exposing a discoverable list of analytics available to clients. Each metric shall have a stable identifier, human-readable title, dashboard level, and a short description.

## Rationale
Clients need to discover which analytics are implemented and how to reference them at runtime; the CSV is the authoritative source that must be reflected in the service.

## Acceptance Criteria
- Catalog includes one entry per CSV row with fields: `id`, `dashboardLevel`, `description` and optional `params`.
- Identifiers are generated deterministically (e.g., slug of dashboard level + description) and remain stable across service restarts; collisions are detected and rejected with clear errors.
- An API endpoint exists to list metrics and retrieve details for a metric by `id`.
- All metrics present in the CSV are present in the catalog.

## Verification
- Unit tests for catalog generation from a fixture CSV covering normal rows and collision handling.
- Contract/E2E tests for catalog endpoints (list and detail) verifying presence of all fixture-defined metrics.

## Dependencies
- CSV parsing/validation (see REQ-NF-003).
- Client-facing API surface (see REQ-FN-001).

## Assumptions / Constraints
- The CSV columns are: `Dashboard Level`, `Metric Description`, `Source`.
- `Source` is informational for now and may be omitted in the API.

## API/Interface Impact
- Endpoints:
  - GET /metrics — returns the catalog list.
  - GET /metrics/{id} — returns details for a specific metric.

## Observability
- Log the total number of metrics discovered at startup and any catalog generation errors.

## Risks / Open Questions
- CSV might not contain explicit IDs; deterministic slugs are used. Future CSV version may add explicit IDs and would supersede slugging.

## References
- Stakeholder Need(s): [SG-4-003](../strs-needs/SG-4-003.md)
- CSV: [LAAC_Learning_Analytics_Requirements.csv](../resources/LAAC_Learning_Analytics_Requirements.csv)

## Change History
- v0.1 — Initial draft

