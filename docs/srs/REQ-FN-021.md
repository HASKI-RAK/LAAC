---
id: REQ-FN-021
title: Observability Telemetry Hooks
type: Functional
status: Revised
priority: Medium
stakeholder_trace: SG-4-009
owner: TODO
version: 0.1
---

## Description

The system shall expose service telemetry for key SLIs (request rate, error rate, latency percentiles, cache hit ratio) via structured log events emitted by `MetricsRegistryService` and related shims.

## Rationale

Provides quantitative insights into system health without introducing a public metrics endpoint. Operators can forward JSON logs to their preferred monitoring stack (e.g., Grafana Loki, Splunk, ELK) and derive alerts/dashboards there.

## Acceptance Criteria

- `MetricsRegistryService` and `AuthMetricsService` emit log events prefixed with `Telemetry event:` when `METRICS_DEBUG=true`
- Events cover HTTP requests/duration/errors, cache hit/miss/ops, metric computations, LRS query duration/errors, circuit breaker transitions, graceful degradation, and auth failures
- Telemetry payloads include labels for `method`, `endpoint`, `metricId`, `instanceId`, and `service` where applicable
- README/Observability docs explain how to enable `METRICS_DEBUG` and consume the resulting logs
- No unauthenticated HTTP endpoint exposes metrics data

## Verification

- Unit tests validate that telemetry classes log events when `METRICS_DEBUG=true`
- Manual or automated tests assert that enabling the flag produces JSON log entries with expected shape
- Documentation review confirms instructions for enabling/disabling telemetry

## Dependencies

- REQ-FN-006 (caching) for cache telemetry events
- REQ-FN-002 (LRS integration) for LRS-related telemetry

## Assumptions / Constraints

- Operators rely on centralized logging; no external metrics collector dependency is mandated
- Telemetry logs must not contain PII

## API/Interface Impact

- No public HTTP endpoint; behavior controlled via environment variable `METRICS_DEBUG`

## Observability

- Structured logs with correlation IDs remain the primary artifact

## Risks / Open Questions

- Need guidance for customers requesting alternate export formats in the future (possible follow-up ADR)

## References

- Stakeholder Need(s): [SG-4-009](../strs-needs/SG-4-009.md)

## Change History

- v0.2 — Revised requirement to log-based telemetry (2025‑11‑17)
- v0.1 — Initial draft
