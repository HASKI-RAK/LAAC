# Sprint 2 Planning

**LAAC System — Data Access Layer, Cache Integration & LRS Client**

**Sprint Duration**: 2 weeks  
**Sprint Goal**: Implement Redis cache service, LRS client integration, and data access layer foundation  
**Team Capacity**: [Copilot: Developer, theUpsider: Architect & Team Lead]  
**Status**: 🚀 Ready to Start  
**Planned Start**: November 13, 2025  
**Planned End**: November 27, 2025

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
- [ ] LRS client can execute xAPI queries with proper error handling
- [ ] IMetricComputation interface implemented with examples
- [ ] Circuit breaker protects against LRS failures
- [ ] All data access abstracted through interfaces
- [ ] Comprehensive unit & E2E tests for all new components
- [ ] No performance regression from Sprint 1

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
- Prometheus metrics registry ready for metric computation tracking

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

- [ ] `POST /admin/cache/invalidate` calls `CacheService.invalidate()`
- [ ] Single key invalidation: `{ key: "cache:metrics:course-123" }`
- [ ] Pattern-based invalidation: `{ pattern: "cache:metrics:*" }`
- [ ] Admin scope enforcement: `admin:cache`
- [ ] Success response includes invalidated count
- [ ] E2E tests verify cache actually cleared
- [ ] Metrics tracked: cache_invalidations_total

**Implementation Scope**:

- `src/admin/services/cache.admin.service.ts` — Invalidation logic
- `src/admin/controllers/cache.controller.ts` — Modify from skeleton
- `test/admin-cache-invalidation.e2e-spec.ts` — E2E tests

**Story Points**: 3 | **Assigned To**: [#50](https://github.com/HASKI-RAK/LAAC/issues/50)

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

**Story Points**: 5 | **Assigned To**: [#51](https://github.com/HASKI-RAK/LAAC/issues/51)

---

### Epic 7: Metric Computation Framework ([#47](https://github.com/HASKI-RAK/LAAC/issues/47))

**Priority**: High | **Story Points**: 10

Implement metric computation layer with extensible provider pattern.

#### Story 7.1: Metric Computation Interface & Base Implementation (4 pts)

**Description**: Implement `IMetricComputation` interface and base provider (REQ-FN-004, REQ-FN-010)

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

**Acceptance Criteria**:

- [ ] CourseCompletionMetric: % of learners who completed course
- [ ] AverageScoreMetric: Average score/grade per course
- [ ] EngagementMetric: Engagement level (simple: based on statement count)
- [ ] Each provider validates parameters (courseId, dateRange, etc.)
- [ ] Each provider calls LRS client for data
- [ ] Results cached via CacheService (cache-aside)
- [ ] Metrics published to Prometheus
- [ ] Unit tests with mocked LRS client
- [ ] E2E tests end-to-end

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

**Acceptance Criteria**:

- [ ] `GET /api/v1/metrics/:id/results` accepts query params (courseId, start, end, scope)
- [ ] Scope enforcement: `analytics:read`
- [ ] Cache-aside logic: check cache, compute if miss, store result
- [ ] Response schema: { metricId, value, unit, timestamp, computedAt }
- [ ] Error handling: invalid metricId (404), missing courseId (400), computation failure (500)
- [ ] Metrics tracked: metric_computation_duration_seconds, cache_hit_ratio
- [ ] E2E tests for cache behavior, auth, error cases

**Implementation Scope**:

- `src/metrics/controllers/metrics.controller.ts` — Add GET /:id/results
- `src/metrics/services/metrics.service.ts` — Computation orchestration
- `test/metrics-results.e2e-spec.ts` — E2E tests

**Story Points**: 3 | **Assigned To**: [#53](https://github.com/HASKI-RAK/LAAC/issues/53)

---

### Epic 8: Resilience & Error Handling ([#48](https://github.com/HASKI-RAK/LAAC/issues/48))

**Priority**: Medium | **Story Points**: 8

Implement circuit breaker pattern and graceful degradation.

#### Story 8.1: Circuit Breaker Pattern for LRS Client (4 pts)

**Description**: Implement circuit breaker to protect against LRS failures (REQ-FN-017, ADR-007)

**Acceptance Criteria**:

- [ ] Circuit breaker library: `opossum` or custom implementation
- [ ] States: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
- [ ] Thresholds: 5 consecutive failures → OPEN, 30s timeout → HALF_OPEN
- [ ] On OPEN: fail fast with 503 Service Unavailable
- [ ] Metrics tracked: circuit_breaker_state, circuit_breaker_trips_total
- [ ] Logs state changes with correlation ID
- [ ] Unit tests for state transitions
- [ ] E2E tests triggering failures and recovery

**Implementation Scope**:

- `src/data-access/clients/lrs-circuit-breaker.service.ts` — Circuit breaker wrapper
- `src/data-access/clients/lrs.client.ts` — Integrate circuit breaker
- `src/data-access/clients/lrs-circuit-breaker.service.spec.ts` — Unit tests
- `test/circuit-breaker.e2e-spec.ts` — E2E tests

**Story Points**: 4 | **Assigned To**: [#56](https://github.com/HASKI-RAK/LAAC/issues/56)

---

#### Story 8.2: Graceful Degradation & Fallbacks (4 pts)

**Description**: Implement fallback behaviors when cache/LRS unavailable (REQ-NF-015)

**Acceptance Criteria**:

- [ ] If Redis unavailable: log warning, compute without caching
- [ ] If LRS unavailable: circuit breaker opens, return 503
- [ ] Health check reports degraded state (readiness vs liveness distinction)
- [ ] Metrics distinguish between transient and persistent failures
- [ ] Observability: all failures logged with context and correlation ID
- [ ] Documentation of fallback behaviors in README/ARCHITECTURE
- [ ] E2E tests simulate failures and verify fallback behavior

**Implementation Scope**:

- `src/core/health/health.service.ts` — Enhanced health checks
- `src/data-access/services/cache.service.ts` — Graceful Redis fallback
- Modify error handling throughout data access layer
- `test/resilience.e2e-spec.ts` — E2E tests

**Story Points**: 4 | **Assigned To**: [#57](https://github.com/HASKI-RAK/LAAC/issues/57)

---

### Epic 9: Multi-LRS Config & Results API (New)

**Priority**: Critical | **Story Points**: 12

Tracks alignment to REQ-FN-026 (configuration), REQ-FN-004/005 (results API & DTO), and REQ-FN-025 (health checks).

#### Story 9.1: Implement REQ-FN-026 Multi-LRS Config Parsing & Validation (3 pts) — [#61]

**Description**: Parse `LRS_INSTANCES` JSON and/or prefixed env vars, validate uniqueness and required fields, expose normalized config to DataAccess.

**Acceptance Criteria**:

- [ ] `ConfigService` loads and validates instances on startup; fails fast on invalid config
- [ ] Supports both JSON array and prefixed env patterns
- [ ] Logs configured instance IDs (redacted) on startup; no credentials logged

**Implementation Scope**:

- `src/core/config/config.schema.ts` — Add `LRS_INSTANCES` schema and parser
- `src/core/config/config.interface.ts` — Add multi-instance types
- `src/data-access/data-access.module.ts` — Provide `LRSClientFactory` with injected instances

#### Story 9.2: Results Endpoints + MetricResult DTO (5 pts) — [#60]

**Description**: Implement `GET /api/v1/metrics/:id/results` and `POST /api/v1/metrics/results` returning normalized `MetricResult`. Add `instanceId` support (single, list, wildcard).

**Acceptance Criteria**:

- [ ] New endpoints documented in Swagger; protected by `analytics:read`
- [ ] `MetricQueryDto` extended with `instanceId`
- [ ] Response includes `generatedAt`, `filters`, `includedInstances`, `excludedInstances`, `aggregated`

**Implementation Scope**:

- `src/metrics/dto/metric-query.dto.ts` — Add `instanceId`
- `src/metrics/dto/metric-result.dto.ts` — New DTO (normalized shape)
- `src/metrics/controllers/metrics.controller.ts` — Add results routes
- `src/metrics/services/metrics.service.ts` — Orchestration stub

#### Story 9.3: Health Check Alignment to REQ-FN-025 (4 pts) — [#62]

**Description**: Use `/xapi/about` endpoint with same auth as analytics; treat 2xx, 401, and 403 as reachable. Add latency metrics.

**Acceptance Criteria**:

- [ ] Health indicator targets `/xapi/about` (configurable fallback)
- [ ] Uses per-instance auth from config
- [ ] 2xx/401/403 considered up; others down
- [ ] Duration recorded in Prometheus with instance label

**Implementation Scope**:

- `src/core/health/indicators/lrs.health.ts` — Update target URL and auth handling
- `src/admin/services/metrics-registry.service.ts` — Add per-instance label for LRS metrics

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
**Next Sprint**: SPRINT-3 (TBD)  
**Sprint Duration**: 2 weeks (cyclical)
