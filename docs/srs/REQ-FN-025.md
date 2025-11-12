---
id: REQ-FN-025
title: LRS Instance Health Monitoring
type: Functional
status: Draft
priority: Medium
stakeholder_trace: SG-4-009, SG-4-012
owner: TODO
version: 0.1
---

## Description

The system shall continuously monitor the health and availability of all configured LRS instances, exposing per-instance health status via health check endpoints and operational metrics. Health monitoring enables proactive alerting, graceful degradation, and operational visibility into multi-LRS deployments.

## Rationale

Multi-LRS architecture (REQ-FN-002, REQ-FN-017) requires visibility into each instance's availability to support partial results, circuit breaker decisions, and operational troubleshooting.

## Acceptance Criteria

- **Health Check Endpoint**: `GET /health/readiness` includes per-instance LRS status:
  ```json
  {
    "status": "healthy",
    "timestamp": "2025-11-10T10:30:00Z",
    "components": {
      "lrs": {
        "status": "degraded",
        "instances": {
          "hs-ke": {
            "status": "healthy",
            "latency": 45,
            "lastCheck": "2025-11-10T10:29:55Z"
          },
          "hs-rv": {
            "status": "unhealthy",
            "error": "Connection timeout",
            "lastCheck": "2025-11-10T10:29:58Z"
          }
        }
      },
      "redis": { "status": "healthy" },
      "database": { "status": "healthy" }
    }
  }
  ```

  - Overall LRS status: `healthy` (all up), `degraded` (some down), `unhealthy` (all down)
  - Per-instance status: `healthy`, `unhealthy`, `unknown` (not yet checked)
- **Liveness Probe**: `GET /health/liveness` checks application process health (independent of LRS):
  - Returns 200 if application can handle requests (even if LRS unavailable)
  - Used by orchestrator (Kubernetes, Docker Compose) for restart decisions
- **LRS Health Checks**: Periodic health verification for each LRS instance:
  - Lightweight query to LRS `/xapi/about` or similar endpoint (per xAPI spec)
  - Configurable check interval (default: 30s)
  - Timeout per check (default: 5s, from REQ-FN-002)
  - Records last successful check timestamp and latency
  - Authentication: use the SAME authentication as analytics queries (per instance)
  - Status semantics: HTTP 2xx, 401, and 403 SHALL be considered "reachable" (authentication error but endpoint up)
- **Circuit Breaker Integration**: Health status drives circuit breaker state (ADR-007):
  - After N consecutive failures (default: 3), mark instance `unhealthy` and open circuit
  - Circuit half-open after recovery timeout (default: 60s), retry single request
  - Circuit closes after M successful requests (default: 2)
  - Circuit state exposed in health endpoint metadata
- **Prometheus Metrics**: Export per-instance health metrics:
  - `lrs_health_status{instance_id}` — gauge: 1=healthy, 0=unhealthy
  - `lrs_health_check_duration_seconds{instance_id}` — histogram of check latency
  - `lrs_health_check_failures_total{instance_id}` — counter of failed checks
  - `lrs_circuit_breaker_state{instance_id}` — gauge: 0=closed, 1=open, 2=half-open
- **Admin API**: Optional admin endpoint for manual health checks:
  - `POST /admin/health/lrs/{instanceId}/check` — trigger immediate health check for instance
  - `POST /admin/health/lrs/check-all` — trigger health check for all instances
  - Requires admin scope (REQ-FN-023)
- **Logging**: Health check results logged with structured data:
  - Successful checks at DEBUG level (avoid log spam)
  - Failed checks at WARN level with error details
  - Instance transitions (healthy→unhealthy, circuit open/close) at INFO level
  - Log includes: `instanceId`, `status`, `latency`, `errorMessage`, `correlationId`

## Verification

- **Health Endpoint Tests**:
  - Unit tests verify health check JSON structure and status aggregation logic
  - Integration tests with mock LRS (healthy, unhealthy, slow) verify status reporting
  - Tests verify overall status calculation: all healthy → `healthy`, some down → `degraded`, all down → `unhealthy`
- **Circuit Breaker Tests**:
  - Simulate N consecutive failures, verify circuit opens and instance marked `unhealthy`
  - Verify circuit half-open after timeout, closes after successful recovery
  - Verify metrics reflect circuit state changes
- **Operational Tests**:
  - E2E test: bring down one mock LRS, verify health endpoint reports degraded within 60s
  - E2E test: restore LRS, verify health recovers within 120s
  - Load test: verify health checks don't impact query performance
- **Metrics Validation**:
  - Scrape Prometheus endpoint, verify all expected metrics present for each configured instance
  - Verify metric values match health endpoint status

## Dependencies

- REQ-FN-002 (Multi-LRS integration) — defines LRS instances to monitor
- REQ-FN-017 (Multi-instance support) — uses health status for partial results
- REQ-FN-021 (Metrics export) — exposes health metrics for monitoring systems
- REQ-NF-016 (Observability baseline) — defines health check requirements
- REQ-NF-018 (Graceful degradation) — uses health status for fallback decisions
- ADR-007 (Circuit breaker pattern) — health checks drive circuit breaker state

## Assumptions / Constraints

- LRS exposes lightweight health check endpoint (e.g., `/xapi/about`) per xAPI spec
- Health check frequency is configurable but defaults to 30s (balance visibility vs. load)
- Circuit breaker configuration is global or per-instance (TBD based on operational needs)

## API/Interface Impact

- `/health/liveness` — liveness probe for orchestrator
- `/health/readiness` — readiness probe with per-instance LRS status
- `/admin/health/lrs/{instanceId}/check` — admin-only manual health check
- Prometheus `/metrics` — includes `lrs_health_*` and `lrs_circuit_breaker_*` metrics

## Observability

- **Logging**: Structured logs for all health check events (success, failure, transitions)
- **Metrics**: Per-instance health and circuit breaker metrics exported to Prometheus
- **Alerting Guidance** (for operations team):
  - Alert: `lrs_health_status == 0` for > 5 minutes → LRS instance down
  - Alert: `lrs_circuit_breaker_state == 1` → Circuit open, investigate LRS
  - Alert: `lrs_health_check_failures_total` increasing rapidly → Intermittent failures

## Risks / Open Questions

- **Q**: Should health checks use same credentials as analytics queries?
  - **A**: Yes, reuse LRS authentication from REQ-FN-002 (health checks must authenticate)
- **Q**: What if health check endpoint is itself slow/failing?
  - **A**: Timeout per REQ-FN-002 (default 5s), circuit breaker prevents cascading failures
- **Q**: Should circuit breaker state be shared across LAAC instances (via Redis)?
  - **A**: Phase 1: Per-instance (local circuit breaker). Phase 2+: Shared state via Redis for consistent behavior

## References

- Stakeholder Need(s): [SG-4-009](../strs-needs/SG-4-009.md), [SG-4-012](../strs-needs/SG-4-012.md)
- xAPI Specification: [https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#about-resource](https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Communication.md#about-resource)
- Circuit Breaker Pattern: Martin Fowler's [CircuitBreaker](https://martinfowler.com/bliki/CircuitBreaker.html)
- Kubernetes Health Checks: [https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

## Change History

- v0.1 — Initial draft
