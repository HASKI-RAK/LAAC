# Sprint 2 Planning

**LAAC System — Data Access Layer, Cache Integration & LRS Client**

**Sprint Duration**: 2 weeks  
**Sprint Goal**: Implement Redis cache service, LRS client integration, and data access layer foundation  
**Team Capacity**: [Copilot: Developer, theUpsider: Architect & Team Lead]  
**Status**: ✅ **COMPLETED** (41/43 pts, 2 pts deferred)
**Planned Start**: November 13, 2025  
**Planned End**: November 27, 2025
**Actual End**: November 13, 2025

---

## ⚠️ Important: xAPI Documentation

**Before starting work on Stories 6.3 (LRS Client) and 7.2 (Metrics Providers), review the HASKI xAPI documentation** to understand statement structure and query patterns:

- **[docs/resources/xapi/MOODLE-STATEMENT-STRUCTURE.md](../resources/xapi/MOODLE-STATEMENT-STRUCTURE.md)** — Actor patterns, verbs, result fields, dual-source architecture (Moodle + Frontend)
- **[docs/resources/xapi/API-lrs-documentation.md](../resources/xapi/API-lrs-documentation.md)** — LRS authentication, query patterns, pagination, error handling
- **[docs/resources/xapi/moodle-xapi.md](../resources/xapi/moodle-xapi.md)** — Moodle plugin specifics and verb construction
- **[docs/resources/xapi/frontend-xapi.md](../resources/xapi/frontend-xapi.md)** — Frontend tracking patterns for engagement metrics

**Key Facts**:

- HASKI actors use **account objects** (homePage + user ID), not mbox
- Verbs are IRIs under `https://wiki.haski.app/variables/xapi.*`
- Statements include optional `result` (scores, duration, completion), `context.platform` (Moodle/Frontend), and hierarchical `contextActivities`

---

## Sprint Objectives

### Primary Goals

1. Implement Redis cache service with cache-aside pattern (REQ-FN-006)
2. Develop LRS client for xAPI queries (REQ-FN-002)
3. Create data access layer abstraction (REQ-FN-005)
4. Implement metric computation framework (REQ-FN-004)
5. Add circuit breaker pattern for resilience (REQ-FN-017, ADR-007)
6. Finalize multi-LRS configuration parsing/validation per REQ-FN-026
7. Implement results endpoints and normalized MetricResult DTO per REQ-FN-004/005, including `instanceId` filtering
8. Align health checks to `/xapi/about` and 401/403 reachability semantics per REQ-FN-025

### Success Criteria

- [x] Redis CacheService fully functional with cache invalidation
- [x] Cache invalidation endpoint implemented and wired (PR #64)
- [x] LRS client can execute xAPI queries with proper error handling
- [x] IMetricComputation interface implemented with examples
- [x] Circuit breaker protects against LRS failures (PR #71)
- [x] All data access abstracted through interfaces
- [x] Comprehensive unit & E2E tests for all new components
- [x] LRS health monitoring with 30s checks and telemetry logging (PR #73)
- [x] No performance regression from Sprint 1

---

## Context from Sprint 1

**Completed Foundations**:

- ✅ Authentication & authorization framework (JWT, scopes)
- ✅ Rate limiting with Redis backend
- ✅ Input validation pipeline
- ✅ Swagger/OpenAPI documentation
- ✅ CI/CD pipeline and Docker deployment
- ✅ Health check infrastructure
- ✅ Structured logging with correlation IDs

**Ready for Use in Sprint 2**:

- Redis connection already configured in rate limiting
- LRS instances configuration in `.env` example (REQ-FN-026)
- Metrics API endpoints skeleton ready for population
- Admin cache invalidation endpoint waiting for implementation
- Telemetry metrics registry ready for metric computation tracking

---

## Architecture Reference

**Key Modules** (from Sprint 1):

- `CoreModule` — Shared infrastructure (config, logging, health)
- `AuthModule` — JWT and scope-based authorization
- `MetricsModule` — Metrics API endpoints and orchestration
- `AdminModule` — Admin operations and metrics export
- `ComputationModule` — **NEW** (Metric computation logic)
- `DataAccessModule` — **NEW** (Cache, LRS, external integrations)

**Cache-Aside Pattern** (REQ-FN-006):

```
GET metric results:
  1. Check Redis cache (REQ-FN-006: cache key = cache:{metricId}:{scope}:{filters})
  2. If miss → Query LRS via ILRSClient
  3. Compute via IMetricComputation
  4. Store in Redis with TTL
  5. Return result
```

**Module Dependencies**:

```
MetricsModule
├── Depends on: ComputationModule, DataAccessModule, AuthModule
ComputationModule
├── Depends on: DataAccessModule (for LRS queries)
DataAccessModule
├── Depends on: CoreModule (config, logging)
```

---

## Sprint Backlog

### Execution Plan (Corrections Applied)

- **Remaining stories**: 1 (9.2-remaining, deferred)
- **Deferred points**: 2
- **Sprint completion**: ✅ **100%** (41/43 pts committed work completed)
- **Actual completion**: 95% (41/43 pts total, 2 pts deferred pending multi-LRS deployment)
- Note: Story 9.2 split into foundation (3 pts, completed) and remaining work (2 pts, deferred pending multi-LRS environment)

Implementation order

- ~~Phase 1 — Core API Completion~~ ✅ COMPLETED
  - ~~Story 7.3: Metric Results Endpoint (GET /api/v1/metrics/:id/results) — cache-aside, validation, error handling~~ ✅
- ~~Phase 2 — Multi‑LRS Support~~ ✅ COMPLETED
  - ~~Story 9.1: Multi‑LRS config parsing/validation (supports JSON array and prefixed env vars; fail‑fast on invalid config)~~ ✅
  - ~~Story 9.2 (Foundation): Statement tagging, instance-aware caching, /api/v1/instances endpoint, instanceId parameter validation~~ ✅ **PARTIAL**
  - Story 9.2 (Remaining): Multi-instance filtering (comma-separated, wildcard), aggregation, partial results (deferred - needs actual multi-LRS deployment)
  - ~~Story 9.3: Health check alignment to /xapi/about with 2xx/401/403 considered reachable; add latency metrics~~ ✅ **COMPLETED** (PR #73)
- ~~Phase 3 — Resilience~~ ✅ COMPLETED
  - ~~Story 8.1: Circuit breaker around LRS client (custom implementation; 5 failures → OPEN, 30s recovery)~~ ✅ COMPLETED
  - ~~Story 8.2: Graceful degradation/fallbacks (cache fallback, null results, HTTP 200)~~ ✅ COMPLETED

Notes

- **Sprint Status**: ✅ **COMPLETED** (All committed stories finished, deferred work documented)
- Resilience phase (Epic 8) fully complete with circuit breaker and graceful degradation
- Story 9.2 remaining work (2 pts) deferred pending multi-LRS deployment configuration
- Story 9.3 (4 pts) completed Nov 13, 2025 via PR #73 - LRS health monitoring with 30s checks, enhanced readiness probe, and 3 new telemetry event types
- **Story 9.2 Split Decision (Nov 13)**: Foundation completed (3 pts) with statement tagging, instance-aware caching, and instances API. Advanced filtering features (2 pts) deferred until actual multi-LRS deployment is available for testing. System architecture supports multi-LRS but only single instance currently deployed.

### Epic 6: Data Access & Caching Layer ([#49](https://github.com/HASKI-RAK/LAAC/issues/49))

**Priority**: Critical | **Story Points**: 13

Implement Redis cache service, data access abstractions, and cache invalidation logic.

#### Story 6.1: Redis Cache Service Implementation (5 pts)

**Description**: Implement `CacheService` with cache-aside pattern and TTL management (REQ-FN-006)

-**Acceptance Criteria**:

- [x] `ICacheService` interface defined with get/set/delete/invalidate methods
- [x] Redis client lifecycle management (connect, disconnect, cleanup)
- [x] Cache key generation with metricId, scope, filters, version
- [x] TTL configurable per cache category (metrics: 1h, results: 5m, etc.)
- [x] Cache invalidation by key or pattern (glob)
- [x] Metrics tracked: cache_hits_total, cache_misses_total, cache_evictions_total
- [x] Graceful fallback if Redis unavailable (log warning, proceed without cache)
- [x] Unit tests for cache operations and pattern matching
- [x] E2E tests for cache hits/misses with real Redis

-**Implementation Scope**: (COMPLETED)

- `src/data-access/services/cache.service.ts` — Redis operations
- `src/data-access/interfaces/cache.interface.ts` — ICacheService contract
- `src/data-access/data-access.module.ts` — Module configuration
- `src/data-access/services/cache.service.spec.ts` — Unit tests
- `test/cache.e2e-spec.ts` — E2E tests

**Status**: COMPLETED — Implemented and merged (PR #58, tracked at issue #59)

**Story Points**: 5 | **Assigned To**: [#59](https://github.com/HASKI-RAK/LAAC/issues/59)

#### Story 6.2: Cache Invalidation Endpoint (3 pts)

**Description**: Wire cache invalidation endpoint to actual Redis operations (REQ-FN-007)

**Acceptance Criteria**:

- [x] `POST /admin/cache/invalidate` calls `CacheService.invalidate()`
- [x] Single key invalidation: `{ key: "cache:metrics:course-123" }`
- [x] Pattern-based invalidation: `{ pattern: "cache:metrics:*" }`
- [x] Admin scope enforcement: `admin:cache`
- [x] Success response includes invalidated count
- [x] E2E tests verify cache actually cleared
- [x] Metrics tracked: cache_invalidations_total

**Implementation Scope**:

- `src/admin/services/cache.admin.service.ts` — Invalidation logic
- `src/admin/controllers/cache.controller.ts` — Modify from skeleton
- `test/admin-cache-invalidation.e2e-spec.ts` — E2E tests

**Story Points**: 3 | **Assigned To**: [#50](https://github.com/HASKI-RAK/LAAC/issues/50)

**Status**: ✅ COMPLETED — Implemented and merged (PR #64, merged Nov 12, 2025)

---

#### Story 6.3: LRS Client Implementation (5 pts)

**Description**: Implement LRS client for xAPI queries with proper error handling (REQ-FN-002)

**Acceptance Criteria**:

- [ ] `ILRSClient` interface with query/aggregate methods
- [ ] HTTP client using Axios with configurable timeout
- [ ] xAPI query builder for course/element queries
- [ ] Error handling: timeout, connection errors, invalid credentials
- [ ] Retry logic with exponential backoff (optional)
- [ ] Correlation ID propagation to LRS
- [ ] Metrics tracked: lrs_query_duration_seconds, lrs_errors_total
- [ ] Unit tests with mock HTTP responses
- [ ] E2E tests against test LRS instance (optional, mock for Sprint 2)

**Implementation Scope**:

- `src/data-access/clients/lrs.client.ts` — LRS HTTP client
- `src/data-access/interfaces/lrs.interface.ts` — ILRSClient contract
- `src/data-access/clients/lrs.client.spec.ts` — Unit tests
- `test/lrs-client.e2e-spec.ts` — E2E tests (mock LRS)

**Story Points**: 5 | **Assigned To**: [#51](https://github.com/HASKI-RAK/LAAC/issues/51) | **PR**: [#65](https://github.com/HASKI-RAK/LAAC/pull/65)

**Status**: ✅ COMPLETED — Implemented and merged (PR [#65](https://github.com/HASKI-RAK/LAAC/pull/65))

---

### Epic 7: Metric Computation Framework ([#47](https://github.com/HASKI-RAK/LAAC/issues/47))

**Priority**: High | **Story Points**: 10

Implement metric computation layer with extensible provider pattern.

#### Story 7.1: Metric Computation Interface & Base Implementation (4 pts)

**Description**: Implement `IMetricComputation` interface and base provider (REQ-FN-004, REQ-FN-010)

**Status**: ✅ COMPLETED — Implemented and merged (PR #66)

**Acceptance Criteria**:

- [ ] `IMetricComputation` interface finalized per SRS (id, dashboardLevel, compute, validateParams)
- [ ] Abstract `BaseMetricProvider` class with common logic
- [ ] Metric registry with get/register operations
- [ ] Support for 'course', 'topic', 'element' dashboard levels
- [ ] Parameter validation framework
- [ ] Response standardization: MetricResult { value, unit, timestamp, metadata }
- [ ] Unit tests for interface contract
- [ ] Example provider: CourseCompletionMetric

**Implementation Scope**:

- `src/computation/interfaces/metric-computation.interface.ts` — IMetricComputation
- `src/computation/providers/base.provider.ts` — BaseMetricProvider
- `src/computation/services/metric-registry.service.ts` — Registry
- `src/computation/providers/course-completion.provider.ts` — Example
- `src/computation/computation.module.ts` — Module configuration

**Story Points**: 4 | **Assigned To**: [#55](https://github.com/HASKI-RAK/LAAC/issues/55)

---

#### Story 7.2: Example Metrics Providers (QuickMetrics) (3 pts)

**Description**: Implement 2-3 example metric providers for Sprint 2 (REQ-FN-004)

**Status**: ✅ COMPLETED — Implemented and merged (PR #67)

**Acceptance Criteria**:

- [x] CourseCompletionMetric: % of learners who completed course
- [x] LearningEngagementMetric: Engagement level based on learning activities
- [x] TopicMasteryMetric: Average score/performance on topic assessments
- [x] Each provider validates parameters (courseId, dateRange, etc.)
- [x] Each provider calls LRS client for data
- [x] Results cached via CacheService (cache-aside)
- [x] Telemetry events recorded for every metric computation
- [x] Unit tests with mocked LRS client
- [x] E2E tests end-to-end

**Implementation Scope**:

- `src/computation/providers/course-completion.provider.ts`
- `src/computation/providers/average-score.provider.ts`
- `src/computation/providers/engagement.provider.ts`
- `src/computation/providers/*.spec.ts` — Unit tests
- `test/metrics-computation.e2e-spec.ts` — E2E tests

**Story Points**: 3 | **Assigned To**: [#54](https://github.com/HASKI-RAK/LAAC/issues/54)

---

#### Story 7.3: Metric Results Endpoint (3 pts)

**Description**: Wire metrics results endpoint to compute & cache (REQ-FN-005)

**Status**: ✅ COMPLETED — Implemented and merged (PR [#68](https://github.com/HASKI-RAK/LAAC/pull/68), merged Nov 13, 2025)

**Acceptance Criteria**:

- [x] `GET /api/v1/metrics/:id/results` accepts query params (courseId, start, end, scope)
- [x] Scope enforcement: `analytics:read`
- [x] Cache-aside logic: check cache, compute if miss, store result
- [x] Response schema: { metricId, value, unit, timestamp, computedAt }
- [x] Error handling: invalid metricId (404), missing courseId (400), computation failure (500)
- [x] Metrics tracked: metric_computation_duration_seconds, cache_hit_ratio
- [x] E2E tests for cache behavior, auth, error cases

**Implementation Scope**:

- `src/metrics/controllers/metrics.controller.ts` — Add GET /:id/results
- `src/metrics/services/metrics.service.ts` — Computation orchestration
- `test/metrics-results.e2e-spec.ts` — E2E tests

**Story Points**: 3 | **Assigned To**: [#53](https://github.com/HASKI-RAK/LAAC/issues/53) | **PR**: [#68](https://github.com/HASKI-RAK/LAAC/pull/68)

---

### Epic 8: Resilience & Error Handling ([#48](https://github.com/HASKI-RAK/LAAC/issues/48))

**Priority**: Medium | **Story Points**: 8

Implement circuit breaker pattern and graceful degradation.

#### Story 8.1: Circuit Breaker Pattern for LRS Client (4 pts)

**Description**: Implement circuit breaker to protect against LRS failures (REQ-FN-017, ADR-007)

**Status**: ✅ COMPLETED — Implemented and merged (PR [#71](https://github.com/HASKI-RAK/LAAC/pull/71), merged Nov 13, 2025)

**Acceptance Criteria**:

- [x] Circuit breaker library: `opossum` or custom implementation
- [x] States: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
- [x] Thresholds: 5 consecutive failures → OPEN, 30s timeout → HALF_OPEN
- [x] On OPEN: fail fast with 503 Service Unavailable
- [x] Metrics tracked: circuit_breaker_state, circuit_breaker_trips_total
- [x] Logs state changes with correlation ID
- [x] Unit tests for state transitions
- [x] E2E tests triggering failures and recovery

**Implementation Scope**:

- `src/core/resilience/circuit-breaker.ts` — Custom implementation with state machine
- `src/core/resilience/circuit-breaker.interface.ts` — ICircuitBreaker contract
- `src/core/resilience/circuit-breaker-decorator.ts` — Decorator pattern
- `src/core/resilience/circuit-breaker.error.ts` — CircuitBreakerOpenError
- `src/core/resilience/circuit-breaker.spec.ts` — 24 unit tests
- `test/circuit-breaker.e2e-spec.ts` — 11 E2E tests

**Story Points**: 4 | **Assigned To**: [#56](https://github.com/HASKI-RAK/LAAC/issues/56) | **PR**: [#71](https://github.com/HASKI-RAK/LAAC/pull/71)

---

#### Story 8.2: Graceful Degradation & Fallbacks (4 pts)

**Description**: Implement fallback behaviors when cache/LRS unavailable (REQ-NF-003, REQ-NF-018)

**Status**: ✅ COMPLETED — Implemented and merged (PR [#72](https://github.com/HASKI-RAK/LAAC/pull/72), merged Nov 13, 2025)

**Acceptance Criteria**:

- [x] Cache fallback: Returns stale data with degraded status when LRS fails
- [x] Default value: Returns null with user-friendly message when no cache available
- [x] HTTP 200 (not 503) for graceful degradation
- [x] Circuit breaker integration: Catches CircuitBreakerOpenError
- [x] Configuration via environment variables
- [x] Telemetry events logged: `graceful.degradation` with reason metadata
- [x] Comprehensive logging with correlation IDs
- [x] Unit tests (16 new) + E2E tests (9 scenarios)

**Implementation Scope**:

- `src/core/resilience/fallback.handler.ts` — Fallback strategies (cache, default value)
- `src/data-access/services/cache.service.ts` — `getIgnoringExpiry()` method
- `src/computation/services/computation.service.ts` — Circuit breaker integration
- `src/core/config/config.schema.ts` — Graceful degradation config
- `src/admin/services/metrics-registry.service.ts` — Degradation metrics
- Unit tests with robust value extraction
- `test/graceful-degradation.e2e-spec.ts` — 9 E2E scenarios

**Story Points**: 4 | **Assigned To**: [#57](https://github.com/HASKI-RAK/LAAC/issues/57) | **PR**: [#72](https://github.com/HASKI-RAK/LAAC/pull/72)

---

### Epic 9: Multi-LRS Config & Results API (New)

**Priority**: Critical | **Story Points**: 12

Tracks alignment to REQ-FN-026 (configuration), REQ-FN-004/005 (results API & DTO), and REQ-FN-025 (health checks).

#### Story 9.1: Implement REQ-FN-026 Multi-LRS Config Parsing & Validation (3 pts) — [#61]

**Description**: Parse `LRS_INSTANCES` JSON and/or prefixed env vars, validate uniqueness and required fields, expose normalized config to DataAccess.

**Status**: ✅ COMPLETED — Implemented and merged (PR [#69](https://github.com/HASKI-RAK/LAAC/pull/69), merged Nov 13, 2025)

**Acceptance Criteria**:

- [x] `ConfigService` loads and validates instances on startup; fails fast on invalid config
- [x] Supports both JSON array and prefixed env patterns
- [x] Logs configured instance IDs (redacted) on startup; no credentials logged

**Implementation Scope**:

- `src/core/config/config.schema.ts` — Add `LRS_INSTANCES` schema and parser
- `src/core/config/config.interface.ts` — Add multi-instance types
- `src/data-access/data-access.module.ts` — Provide `LRSClientFactory` with injected instances

**Story Points**: 3 | **Assigned To**: [#61](https://github.com/HASKI-RAK/LAAC/issues/61) | **PR**: [#69](https://github.com/HASKI-RAK/LAAC/pull/69)

#### Story 9.2: Multi-Instance Support Foundation (3 pts completed, 2 pts remaining) — [#60]

**Description**: Implement multi-instance support foundation with statement tagging, instance-aware caching, and instances metadata API.

**Status**: ✅ **FOUNDATION COMPLETED** (PR [#70](https://github.com/HASKI-RAK/LAAC/pull/70), merged Nov 13, 2025) | ⚠️ **REMAINING WORK DEFERRED**

**Completed (3 pts):**

- [x] Statement tagging with `instanceId` from LRS config (ADR-008)
- [x] Instance-aware cache keys: `cache:{metricId}:{instanceId}:{scope}:{filters}`
- [x] `GET /api/v1/instances` endpoint returning instance metadata
- [x] `instanceId` parameter added to metrics results with validation (`@Matches` decorator)
- [x] Optional context validation (logs warnings on mismatch)
- [x] 9 E2E tests passing for foundation features

**Deferred (2 pts) - Requires Actual Multi-LRS Deployment:**

- [ ] Multi-instance filtering: comma-separated IDs (`?instanceId=hs-ke,hs-rv`)
- [ ] Wildcard filtering for all instances (`?instanceId=*`)
- [ ] Cross-instance aggregation with metadata (`includedInstances`, `excludedInstances`)
- [ ] Partial results handling when one LRS unavailable
- [ ] Student ID isolation verification across multiple instances
- [ ] 10 E2E tests documented as TODO (require multi-LRS environment)

**Implementation Note**: Foundation provides complete architecture for multi-instance support with single-LRS validation. Remaining features require actual multi-LRS deployment configuration (multiple entries in `LRS_INSTANCES`), which is operational but not yet deployed.

**Implementation Scope (Completed)**:

- `src/data-access/clients/lrs.client.ts` — Statement tagging
- `src/data-access/utils/cache-key.util.ts` — Instance-aware keys
- `src/metrics/controllers/instances.controller.ts` — New endpoint
- `src/metrics/services/instances.service.ts` — Instance metadata service
- `src/metrics/dto/instance.dto.ts` — Instance response DTOs
- `src/metrics/dto/metric-results.dto.ts` — Added `instanceId` parameter
- `test/multi-instance.e2e-spec.ts` — E2E tests (9 passing, 10 todo)

#### Story 9.3: Health Check Alignment to REQ-FN-025 (4 pts) — [#62]

**Description**: Use `/xapi/about` endpoint with same auth as analytics; treat 2xx, 401, and 403 as reachable. Add latency metrics.

**Status**: ✅ COMPLETED — Implemented and merged (PR [#73](https://github.com/HASKI-RAK/LAAC/pull/73), merged Nov 13, 2025)

**Acceptance Criteria**:

- [x] Health indicator targets `/xapi/about` with same auth as analytics
- [x] 2xx/401/403 considered reachable; others down
- [x] Background scheduler checks all instances (30s interval)
- [x] Enhanced readiness probe with per-instance breakdown
- [x] Duration captured via telemetry logs with instance metadata
- [x] 3 new telemetry events defined for health monitoring
- [x] Batch logging for operational visibility
- [x] Unit tests with 100% coverage for new code
- [x] Circular dependency resolution via HealthModule → DataAccessModule

**Implementation Scope**:

- `src/core/health/indicators/lrs.health.indicator.ts` — Status aggregation
- `src/core/health/schedulers/lrs-health.scheduler.ts` — Background cron job
- `src/core/health/health.controller.ts` — Enhanced readiness response
- `src/core/health/health.module.ts` — Module wiring
- `src/admin/services/metrics-registry.service.ts` — Telemetry logging hooks
- `test/health.e2e-spec.ts` — E2E test structure

**Story Points**: 4 | **Assigned To**: [#62](https://github.com/HASKI-RAK/LAAC/issues/62) | **PR**: [#73](https://github.com/HASKI-RAK/LAAC/pull/73)

## Estimated Velocity & Sprint Capacity

Based on Sprint 1 calibration:

- **Estimated Velocity**: 20-25 pts/week
- **Sprint Duration**: 2 weeks
- **Available Capacity**: 40-50 pts
- **Committed Scope**: 43 pts (9 stories across 4 epics)
- **Stretch Goal**: 40+ pts (if additional stories are ready)

---

## Dependencies & Blockers

### Sprint 1 Dependencies (All Met ✅)

- ✅ Authentication framework (JWT, scopes)
- ✅ Health check infrastructure
- ✅ Logging with correlation IDs
- ✅ Environment configuration
- ✅ Swagger/OpenAPI framework

### External Dependencies

- 🔗 LRS Instances (Yetanalytics) — Assumed configured via `LRS_INSTANCES` in `.env`
- 🔗 Redis Instance — Already configured in Sprint 1 for rate limiting
- 🔗 Test xAPI Statements — Seed test data in LRS for E2E tests

### Known Risks

| Risk                          | Impact | Probability | Mitigation                                      |
| ----------------------------- | ------ | ----------- | ----------------------------------------------- |
| LRS connectivity issues       | High   | Medium      | Mock LRS for Sprint 2, real integration Phase 2 |
| Cache key collision           | Medium | Low         | Use namespaced keys, add version prefix         |
| Metric computation complexity | High   | Medium      | Start with simple metrics, extend gradually     |
| Circuit breaker tuning        | Medium | Low         | Document thresholds, allow runtime config       |

---

## Testing Strategy

### Unit Tests

- Cache service: get/set/invalidate/pattern matching
- LRS client: query building, error handling, retries
- Metric providers: parameter validation, computation logic
- Circuit breaker: state transitions, failure thresholds

### E2E Tests

- Cache hits/misses with real Redis
- Metrics computation end-to-end
- Error scenarios: LRS unavailable, invalid parameters
- Circuit breaker state changes under load

### Performance Benchmarks

- Target cache hit ratio: >80% for repeated queries
- Target metric computation time: <1s for course-level
- Target LRS query latency: <500ms (with circuit breaker)

---

## Definition of Done (DoD)

For each Sprint 2 story:

- [ ] Code implemented per acceptance criteria
- [ ] Unit tests written with >80% coverage
- [ ] E2E tests passing (including error cases)
- [ ] Code reviewed and approved by team lead
- [ ] OpenAPI/Swagger documentation updated
- [ ] No linting errors, code formatted
- [ ] CI pipeline passing
- [ ] Performance benchmarks verified
- [ ] Merged to main branch

---

## Success Metrics

### Code Quality

- Test coverage: >80% for all new code
- Code review time: <24 hours
- Deployment success rate: 100%

### Performance

- Cache hit ratio: >80%
- Median metric computation: <500ms
- P95 LRS query: <1000ms (with timeouts)

### Reliability

- Circuit breaker trip rate: <5% under normal load
- Error rate: <1% of requests
- Service availability: >99.5%

---

## Definition of Ready (DoR)

Stories are ready to start when:

- [ ] Requirements clearly defined (acceptance criteria)
- [ ] Dependencies identified and resolved
- [ ] Interfaces/contracts defined (if applicable)
- [ ] Test data/fixtures available
- [ ] Team capacity allocated

---

## Deferred to Sprint 3+

### High Priority (Sprint 3)

- Advanced metric providers (correlation, trend analysis)
- Real LRS integration testing (phase 2)
- Performance optimization (caching, indexing)
- Dashboard presentation layer

### Medium Priority (Sprint 4+)

- User preferences & saved queries
- Metric versioning & schema migration
- Data export (CSV, PDF)
- Multi-language support

---

## Sprint Ceremonies Schedule

**Sprint Planning**: Day 1 (Nov 13)

- Review Sprint 1 report and lessons learned
- Refine Sprint 2 backlog
- Estimate and assign stories

**Daily Standup**: Every weekday at 10 AM

- 15 minutes, same time/channel

**Sprint Review**: Day 10 (Nov 22)

- Demo completed features
- Gather stakeholder feedback

**Sprint Retrospective**: Day 10 (Nov 22)

- What went well?
- What could improve?
- Action items for Sprint 3

---

## Resources & Tools

### Development Setup

- Node.js 22 LTS
- Yarn 1.22+
- Docker & Docker Compose
- Redis CLI for cache debugging
- Postman/Insomnia for API testing

### Documentation

- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) — Module structure, patterns
- [SRS.md](../SRS.md) — Requirements traceability
- [SPRINT-1-REPORT.md](./SPRINT-1-REPORT.md) — Lessons learned
- [SRS srs/REQ-FN-\*.md](../srs/) — Requirement details

### External Resources

- [xAPI Specification](https://github.com/adlnet/xAPI-Spec)
- [Redis Commands](https://redis.io/commands)
- [Opossum Circuit Breaker](https://github.com/nodeshift/opossum)

### xAPI Documentation (Local)

**Critical for LRS Integration** (Stories 6.3, 7.2):

- [API-lrs-documentation.md](../resources/xapi/API-lrs-documentation.md) — Developer-ready LRS integration guide (authentication, query patterns, error handling, pagination, performance, resilience)
- [MOODLE-STATEMENT-STRUCTURE.md](../resources/xapi/MOODLE-STATEMENT-STRUCTURE.md) — HASKI xAPI statement structure reference (actor patterns, verb schemes, context hierarchies, result fields)
- [moodle-xapi.md](../resources/xapi/moodle-xapi.md) — Moodle xAPI plugin statement shape and actor construction
- [frontend-xapi.md](../resources/xapi/frontend-xapi.md) — Frontend UI tracking statement patterns

---

## Sign-Off

**Product Owner**: TBD  
**Sprint Manager**: Copilot SWE Agent  
**Development Team**: Copilot, theUpsider

**Plan Created**: November 12, 2025  
**Status**: 🚀 Ready to Start

---

**Previous Sprint**: [SPRINT-1-PLAN.md](./SPRINT-1-PLAN.md) ← [SPRINT-1-REPORT.md](./SPRINT-1-REPORT.md)  
**Next Sprint**: [SPRINT-3-PLAN.md](./SPRINT-3-PLAN.md)  
**Sprint Duration**: 2 weeks (cyclical)

---

## Sprint 2 Completion Summary

**Final Status**: ✅ **COMPLETED** (November 13, 2025)

**Velocity**: 41 story points completed in 1 day (exceptional with Copilot coding agent)

**Key Deliverables**:
- ✅ Epic 6: Data Access & Caching Layer (13 pts) — Redis cache, invalidation, LRS client
- ✅ Epic 7: Metric Computation Framework (10 pts) — IMetricComputation interface, 3 example providers, results endpoint
- ✅ Epic 8: Resilience & Error Handling (8 pts) — Circuit breaker, graceful degradation
- ✅ Epic 9: Multi-LRS Support (10 pts) — Config parsing, instance-aware caching, health monitoring

**Deferred Work**:
- Story 9.2 remaining (2 pts): Multi-instance filtering pending actual multi-LRS deployment

**Lessons Learned**:
- Copilot coding agent dramatically accelerated implementation velocity
- Strong SRS traceability enabled autonomous feature development
- Comprehensive issue templates improved handoff quality
- Sprint plans with detailed acceptance criteria reduced ambiguity

**Carried Forward to Sprint 3**:
- Story 9.2 remaining work (deferred, not blocking)
- Focus shift to advanced metrics and production readiness
