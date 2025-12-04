---
id: REQ-FN-028
title: Learning Element Type Click Distribution
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-003
owner: TODO
version: 0.1
---

## Description

The platform shall expose a CSV-compliant metric that reports click activity per learning element type for a given learner. The metric covers:

- **EO-007** — "Average clicks on learning element type (e.g., Self-Assessment-Test (SE))"
- **ST-001** — "Total number of clicks by a student for a learning element type"

It ingests xAPI `clicked/viewed` statements, classifies each learning element into HASKI element-type codes (CT, CO, SE, etc.), sequences the element types according to first access timestamps, and returns both sequence-weighted dimension scores and per-type totals/averages.

## Rationale

Dashboard stakeholders need to understand how learners interact with each element type to adapt sequencing weights defined in Concept 2025. Capturing both total clicks (student perspective) and per-element averages (element overview) in one response prevents redundant queries and keeps the catalog aligned with the CSV specification.

## Acceptance Criteria

- Metric identifier `element-clicks` is registered in the catalog (`GET /api/v1/metrics`).
- `GET /api/v1/metrics/element-clicks/results` accepts `userId` (required) plus optional `courseId`, `topicId`, `elementId`, `since`, and `until` filters with validation errors for invalid ranges.
- Supported verbs include all approved click/open verb IRIs (e.g., `https://wiki.haski.app/answered`, `http://activitystrea.ms/schema/1.0/open`). Statements lacking recognized verbs or type classifications are ignored.
- Commentary (`CT`) and Content Object (`CO`) slots are always sequences 1 and 2 when present; their dimension scores equal the highest other sequence score plus 6 and 3 points respectively (capped at 50).
- Remaining types are sequenced by earliest access timestamp and weighted using the Concept 2025 scale (1.5, 1.5, 1.25, 1.1, then 1.0).
- Response entries include: `type`, `clickCount`, `sequence`, `weight`, `dimensionScore`, `firstAccessAt`, and `avgClicksPerElement` (rounded to two decimals).
- Metadata contains `totalClicks`, `typeCount`, and the applied filters for traceability.
- Metric supports multi-instance scoping and caching policies defined in REQ-FN-017/REQ-FN-006 without storing mutable state inside the provider.

## Verification

- **Unit tests**: `src/computation/providers/element-clicks.provider.spec.ts` cover classification, weighting, CT/CO overrides, and validation errors.
- **E2E tests**: `test/new-metrics.e2e-spec.ts` invokes the provider end-to-end with representative statements, ensuring REQ-FN-003 catalog exposure and REQ-FN-004 contract fidelity.
- **Manual QA** (optional): compare sample outputs to Concept 2025 tables for CT/CO offsets.

## Dependencies

- REQ-FN-003 (metrics catalog exposure)
- REQ-FN-004 (CSV metric compliance)
- REQ-FN-010 (IMetricComputation contract)
- REQ-FN-017 (instance-aware data access)
- REQ-NF-004 (stateless computation requirement)

## Assumptions / Constraints

- Element-type detection relies on German `<h6>` labels and synonyms defined in `element-type-helpers.ts`; additions require updating that mapping.
- Only statements with `verb.id` in the approved click list contribute to totals.
- Upstream LRS timestamps are trusted for ordering; if missing, the provider falls back to the stored timestamp.

## API/Interface Impact

- `GET /api/v1/metrics/element-clicks/results`
  - Required query parameters: `userId`
  - Optional: `courseId`, `topicId`, `elementId`, `since`, `until`
  - Response body is a `MetricResult` array payload documented in the OpenAPI spec under `ElementClicksResult`.

## Observability

- Providers log metric execution duration and filter context at DEBUG when `METRICS_DEBUG=true`.
- Emit structured log fields: `metricId`, `userId`, `courseId`, `topicId`, `typeCount`, `totalClicks`.

## Risks / Open Questions

- Weight table may evolve if Concept 2025 is revised; coordinate changes with Dashboard PMs.
- Additional verbs or localized labels may surface as LRS data expands.

## References

- Stakeholder Need(s): [SG-4-003](../strs-needs/SG-4-003.md)
- CSV Rows: [LAAC_Learning_Analytics_Requirements.csv](../resources/LAAC_Learning_Analytics_Requirements.csv) — EO-007, ST-001
- Concept 2025 (internal) — Click weighting rules for CT/CO vs. dynamic elements

## Change History

- v0.1 — Initial draft
