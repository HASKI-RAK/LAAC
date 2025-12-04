---
id: REQ-FN-029
title: Learning Element Type Time Allocation
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-003
owner: TODO
version: 0.1
---

## Description
The system shall compute the total and average time spent per learning element type for a specific learner, as defined in CSV row **EO-008** ("Total and average time spent per learning element type"). For each detected element type, the computation aggregates xAPI `result.duration` values, counts distinct learning elements, and exposes a normalized `MetricResult` array.

## Rationale
Adaptive sequencing requires visibility into how long learners spend on each element type. Summaries by type surface pacing issues and feed Concept 2025's proportional averaging logic without exposing raw LRS events to downstream clients.

## Acceptance Criteria
- Metric identifier `element-type-time-spent` is discoverable via `GET /api/v1/metrics` with dashboard level `element` and accurate metadata.
- `GET /api/v1/metrics/element-type-time-spent/results` validates `userId` (required) plus optional `courseId`, `topicId`, `since`, and `until` filters; invalid ranges return HTTP 400.
- Only statements containing ISO 8601 `result.duration` values participate in aggregation; unparsable or zero/negative durations are ignored.
- Element types are derived via the canonical helper that strips HTML tags and maps localized names to HASKI codes (CT, CO, SE, etc.).
- Response entries include: `type`, `totalSeconds`, `elementCount`, and `avgSecondsPerElement` (rounded to whole seconds). Results are sorted descending by `totalSeconds`.
- Metadata lists `totalSeconds`, `typeCount`, and echoes applied filters for auditing.
- Provider executes deterministically without persisting internal state (REQ-NF-004) and honors instance scoping (REQ-FN-017).

## Verification
- **Unit tests**: `src/computation/providers/element-type-time-spent.provider.spec.ts` validate aggregation, averaging, and filtering of malformed statements.
- **E2E tests**: `test/new-metrics.e2e-spec.ts` run the provider with representative statements to confirm catalog exposure and contract compliance.
- **Documentation**: OpenAPI schema updated to describe the metric payload (tracked under REQ-FN-008/009).

## Dependencies
- REQ-FN-003 (catalog exposure)
- REQ-FN-004 (CSV metric compliance)
- REQ-FN-010 (IMetricComputation contract)
- REQ-FN-017 (instance-aware access)
- REQ-NF-004 (stateless computation requirement)

## Assumptions / Constraints
- Durations arrive in ISO 8601 format; parser truncates fractional seconds per `duration-helpers.ts` implementation.
- Unique element counts rely on `statement.object.id`; missing IDs reduce accuracy but do not fail the metric.

## API/Interface Impact
- `GET /api/v1/metrics/element-type-time-spent/results`
  - Required: `userId`
  - Optional: `courseId`, `topicId`, `since`, `until`
  - Response type matches `ElementTypeTimeSpentResult` schema within the OpenAPI spec.

## Observability
- Provider logs `metricId`, `userId`, `totalSeconds`, and `typeCount` when `METRICS_DEBUG=true` to support dashboard validation.

## Risks / Open Questions
- Future requirement may add percentile or distribution insights; those will require new CSV rows.
- Large duration sums may require double precision; currently stored as integers (seconds).

## References
- Stakeholder Need(s): [SG-4-003](../strs-needs/SG-4-003.md)
- CSV Rows: [LAAC_Learning_Analytics_Requirements.csv](../resources/LAAC_Learning_Analytics_Requirements.csv) — EO-008
- Concept 2025 (internal) — "Proportional average" definition for time tracking

## Change History
- v0.1 — Initial draft
