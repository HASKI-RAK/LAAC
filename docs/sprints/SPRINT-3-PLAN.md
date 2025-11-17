# Sprint 3 Planning

**LAAC System — MVP Analytics Pipeline (REQ-FN-004)**

**Sprint Duration**: 2 weeks  
**Sprint Goal**: Ship an end-to-end analytics pipeline that queries the Yetanalytics LRS, computes the metrics in the CSV, and serves them through the API results endpoint.  
**Team Capacity**: [Copilot: Developer, theUpsider: Architect & Team Lead]  
**Status**: 🔄 Reprioritized for MVP  
**Planned Start**: November 14, 2025  
**Planned End**: November 15, 2025

---

## Sprint Context

### Why the Reprioritization?

We need to expose a minimal but fully functional learning analytics pipeline to stakeholders. The previous plan focused on advanced metrics, scaffolding, and performance prep; the new goal is to satisfy REQ-FN-004 (Compute Analytics) end-to-end so that a single learner/course/topic/element flow is live against the LRS.

### Implementation Snapshot (Nov 17, 2025)

- ✅ **LRS integration (REQ-FN-002)** — `src/data-access/clients/lrs.client.ts` implements pagination, retries, circuit breaker metrics, and is covered by `lrs.client.spec.ts`.
- ✅ **Cache-aside + resilience (REQ-FN-005/006/017)** — `src/metrics/services/computation.service.ts` orchestrates cache lookup, provider loading, LRS querying, fallback; Redis service lives in `src/data-access/services/cache.service.ts`.
- ✅ **Metrics results endpoint (REQ-FN-005 & REQ-FN-023/024)** — `src/metrics/controllers/metrics.controller.ts` plus `test/metrics-results.e2e-spec.ts` prove the pipeline can be exercised via `/api/v1/metrics/:id/results`.
- ✅ **Sample metric providers (REQ-FN-004/010)** — `course-completion`, `learning-engagement`, `topic-mastery` already compute against xAPI statements.
- ⚠️ **Catalog + metadata still stubbed (REQ-FN-003)** — `MetricsService.getCatalog()` returns an empty list, so clients cannot discover the metrics that already exist.
- ⚠️ **CSV coverage incomplete (REQ-FN-004)** — only 3/15 CSV metrics exist; no topic/element recency metrics or per-element best attempt calculations.
- ⚠️ **LRS filters ignore course/topic/element IDs** — `ComputationService.buildLRSFilters()` passes only time filters, so every request fetches broad datasets.
- ⚠️ **Docs and onboarding still describe the future state instead of the MVP**.

---

## Sprint Objectives

1. Publish the actual catalog of available metrics and wire it to the providers already in code.
2. Implement the CSV metrics required for MVP (CO/TO/EO tables) so that each dashboard level has actionable analytics.
   2.1 Verify the CSV metrics against docker-compose Yetanalytics LRS with seeded data in e2e tests.
3. Ensure each metric request issues the correct LRS query (course/topic/element scoped) and that we have seeded fixtures plus e2e tests to validate the pipeline.
4. Update docs and API descriptions so integrators can call the MVP endpoints immediately after the sprint.

---

## Success Criteria

- `/api/v1/metrics` returns at least the 15 CSV metrics with metadata (`requiredParams`, `dashboardLevel`, `outputType`).
- `/api/v1/metrics/:id/results` produces deterministic results for sample data covering course, topic, and learning-element scopes with cache hits on repeated calls.
- LRS queries include course/topic/element filters derived from request DTOs; warm-cache requests stay under P95 1s in dev measurements.
- E2E suite seeds representative xAPI statements and validates the full flow for each dashboard level.
- README + docs point to the MVP flow, environment variables, and REQ-FN-004 traceability.

---

## Sprint Backlog (Reprioritized)

### Epic 10: Pipeline Hardening & Catalog (REQ-FN-003, REQ-FN-004, REQ-FN-005) — **11 pts**

#### Story 10.1: Metrics Catalog & Provider Registry (4 pts)

Expose every registered provider (existing + new) through the catalog and details endpoints.

**Acceptance Criteria**

- `GET /api/v1/metrics` lists all metrics with `id`, `dashboardLevel`, description, `requiredParams`, and `outputType`.
- `GET /api/v1/metrics/:id` returns provider metadata and example payload.
- Catalog reflects provider status dynamically (no duplicated config files).

**Implementation Scope**

- `src/metrics/services/metrics.service.ts` — replace stub with registry built from providers exported in `src/computation/providers/index.ts`.
- `src/metrics/dto` — extend DTOs to include `requiredParams`, `outputType`, and version info.
- `src/metrics/controllers/metrics.controller.ts` — update OpenAPI decorators.
- `test/metrics.e2e-spec.ts` — add catalog assertions.

#### Story 10.2: Parameter-Aware LRS Queries (4 pts)

Inject course/topic/element filters into xAPI requests to minimize data fetch.

**Acceptance Criteria**

- Requests with `courseId` translate into `activity` filter; `topicId` maps to context extensions; `elementId` maps to specific activities per CSV definition.
- Unit tests cover the mapping logic.
- E2E verifies `LRSClient.queryStatements` receives filters reflecting request params.

**Implementation Scope**

- `src/metrics/dto/metric-results.dto.ts` — ensure validation for IDs aligns with filters.
- `src/metrics/services/computation.service.ts` — enhance `buildLRSFilters`.
- `src/data-access/clients/lrs-query.builder.ts` — helpers for topic/element context filters.
- `test/metrics-results.e2e-spec.ts` — extend spies to assert filter payloads.

#### Story 10.3: MVP Seed Data & Smoke Tests (3 pts)

Provide deterministic fixtures that hit the full pipeline.

**Acceptance Criteria**

- New fixture set covers course/topic/element metrics.
- `yarn test:e2e` seeds fixtures before running metrics tests.
- Scripts documented so devs can replay locally.

**Implementation Scope**

- `test/fixtures/xapi/` — add JSON fixtures per dashboard level.
- `test/setup-e2e.ts` & `scripts/seed-test-lrs.js` — load fixtures into in-memory/mock LRS.
- `docs/TESTING.md` — document seeding workflow.

---

### Epic 11: CSV Metric Coverage (REQ-FN-004) — **14 pts**

#### Story 11.1: Course-Level MVP Metrics (CO-001 → CO-005) (5 pts)

Implement total score, possible score, total time, last three elements, and completion timestamps per course.

**Acceptance Criteria**

- Providers compute deterministic values with unit tests referencing REQ-FN-004.
- Metadata clarifies filters (courseId, since/until, userId).
- E2E proves results align with seeded fixtures.

**Implementation Scope**

- `src/computation/providers/course-score.provider.ts`
- `src/computation/providers/course-max-score.provider.ts`
- `src/computation/providers/course-time-spent.provider.ts`
- `src/computation/providers/course-last-elements.provider.ts`
- Corresponding `*.spec.ts` files + additions to `ComputationModule`.

#### Story 11.2: Topic-Level MVP Metrics (TO-001 → TO-005) (5 pts)

Extend topic providers beyond `topic-mastery` to cover score totals, time, recency.

**Implementation Scope**

- `topic-score.provider.ts`, `topic-max-score.provider.ts`, `topic-time-spent.provider.ts`, `topic-last-elements.provider.ts`.
- Update catalog metadata + unit/e2e tests.

#### Story 11.3: Learning-Element MVP Metrics (EO-001 → EO-005) (4 pts)

Deliver best-attempt score/status/time-based metrics.

**Implementation Scope**

- `element-score.provider.ts`, `element-status.provider.ts`, `element-attempts.provider.ts`, `element-time-spent.provider.ts`.
- Shared helper utilities for parsing attempts (`src/computation/utils/attempt-helpers.ts`).
- Tests and catalog updates.

---

### Epic 12: MVP Delivery Readiness (REQ-FN-001, REQ-FN-004, REQ-FN-008/009) — **6 pts**

#### Story 12.1: API Contract & Docs Refresh (3 pts)

**Implementation Scope**

- Update `docs/SRS.md`, `docs/Metrics-Specification.md` traceability tables with implemented metrics.
- Refresh `README.md` + add quickstart for MVP pipeline.
- Re-run Swagger generation to ensure new metadata exposed.

#### Story 12.2: LRS Configuration & Health Paths (3 pts)

**Implementation Scope**

- Document env vars in `.env.example` / `docs/LOCAL-LRS-SETUP.md`.
- Ensure `/health/readiness` verifies Redis + LRS connectivity for MVP.
- Add troubleshooting section for Yetanalytics credentials.

---

## Execution Plan

1. **Week 1 (Days 1-5)** — Finish Epic 10 and seed data so the base pipeline is stable.
2. **Week 1.5 (Days 4-7)** — Build course + topic metrics (Story 11.1 + 11.2) leveraging new fixtures.
3. **Week 2 (Days 8-12)** — Implement learning-element metrics (11.3) and documentation refresh (Epic 12).
4. **Week 2 End (Days 13-14)** — Regression + E2E runs, polish catalog metadata, update docs.

---

## Dependencies & Blockers

- Yetanalytics test LRS credentials must be available (REQ-FN-002); update `.env` with fresh API key.
- Redis must be reachable for cache tests; docker-compose dev profile already in repo.
- Need confirmation on CSV-to-metric ID mapping; will document decisions inside provider comments referencing REQ-FN-004.

---

## Testing Strategy

- **Unit**: Each provider gets deterministic tests with mock statements + REQ-FN-004 references; catalog service unit tests verify metadata.
- **E2E**: `metrics-results`, new `metrics-catalog`, and a dedicated `metrics-mvp.e2e-spec.ts` file cover course/topic/element flows.
- **Performance smoke**: capture manual timing via `yarn test:e2e` + sample load, but full k6 suite deferred.

---

## Definition of Done

- Code + tests merged with >80% coverage for touched code.
- `/api/v1/metrics` and `/api/v1/metrics/:id/results` documented via Swagger with accurate examples.
- Fixtures + docs enable devs to reproduce MVP results locally.
- Traceability tables updated to show REQ-FN-004 progress.
- No lint errors; CI green.

---

## Deferred / Stretch Work

- Developer experience epics (contribution guide, scaffolding, testing utilities) moved to Sprint 4.
- API versioning + deprecation policy (REQ-FN-016) postponed until MVP is adopted.
- Performance testing (REQ-FN-022) and Grafana dashboards remain in backlog.

# Sprint 3 Planning

**LAAC System — Advanced Metrics, Documentation & Production Readiness**

**Sprint Duration**: 2 weeks  
**Sprint Goal**: Implement advanced metric providers, contribution guide, API versioning, and performance testing foundation  
**Team Capacity**: [Copilot: Developer, theUpsider: Architect & Team Lead]  
**Status**: 🚀 Ready to Start  
**Planned Start**: November 14, 2025  
**Planned End**: November 28, 2025

---

## Sprint Context

### Sprint 2 Achievements

Sprint 2 (completed Nov 13, 2025) delivered the **foundational data access and computation infrastructure**:

- ✅ Redis cache service with cache-aside pattern
- ✅ LRS client with xAPI queries and circuit breaker protection
- ✅ Metric computation framework with 3 example providers
- ✅ Graceful degradation and resilience patterns
- ✅ Multi-LRS configuration and health monitoring
- ✅ 41/43 story points completed (95%)

**Deferred from Sprint 2**: Story 9.2 remaining (2 pts) — multi-instance filtering pending actual multi-LRS deployment

### Sprint 3 Focus

Build on the computation foundation to deliver **production-grade metrics and developer experience**:

1. **Advanced Metrics**: Implement Topic and Element-level metrics from CSV specification
2. **Developer Experience**: Contribution guide and metric templates (REQ-FN-011)
3. **API Maturity**: API versioning and deprecation policy (REQ-FN-016)
4. **Quality Assurance**: Performance testing framework (REQ-FN-022)
5. **Issue Cleanup**: Close redundant Sprint 1/2 epic tracking issues

---

## Sprint Objectives

### Primary Goals

1. Implement Topic-level metrics (TO-001 to TO-005 from Metrics Spec)
2. Implement Element-level metrics (EO-001 to EO-005 from Metrics Spec)
3. Create contribution guide for adding new metrics (REQ-FN-011)
4. Implement API versioning with v1 baseline (REQ-FN-016)
5. Establish performance testing framework with k6 (REQ-FN-022)
6. Clean up open issue redundancy

### Success Criteria

- [x] 8-10 new metric providers implemented (Topic + Element levels)
- [x] Contribution guide with templates and examples in place
- [x] API versioned at v1 with deprecation policy documented
- [x] Performance test suite validates SLO targets (P95 < 1s warm, < 2s cold)
- [x] All new metrics covered by unit and E2E tests
- [x] Open issue count reduced by closing redundant epics
- [x] No regressions from Sprint 2

---

## Architecture Reference

### Module Extensions

Sprint 3 builds on existing modules without structural changes:

- `ComputationModule` — Add 8-10 new metric providers
- `MetricsModule` — Add API versioning middleware
- `CoreModule` — No changes
- `DataAccessModule` — No changes (reuse LRS client, cache)

### Metrics Specification Reference

Sprint 3 implements metrics from `docs/Metrics-Specification.md`:

**Topic Overview (TO-\*):**

- TO-001: Total Score Earned by Student in Topic
- TO-002: Possible Total Score for Topic
- TO-003: Total Time Spent by Student in Topic
- TO-004: Last Three Elements Completed in Topic
- TO-005: Completion Dates of Last Three Elements in Topic

**Element Overview (EO-\*):**

- EO-001: Score of Best Attempt for Element
- EO-002: Latest Attempt Status for Element
- EO-003: Number of Attempts for Element
- EO-004: Time Spent on Element
- EO-005: Completion Status for Element

---

## Sprint Backlog

### Epic 10: Advanced Metric Providers ([NEW])

**Priority**: Critical | **Story Points**: 13

Implement Topic and Element-level metrics from the CSV specification.

#### Story 10.1: Topic-Level Metrics (TO-001 to TO-005) (6 pts) — [#TBD]

**Description**: Implement 5 topic-level metrics for Topic Overview dashboard per Metrics Specification.

**Acceptance Criteria**:

- [ ] TO-001: Total score earned by student in topic (sum of best attempts)
- [ ] TO-002: Possible total score for topic (max possible)
- [ ] TO-003: Total time spent by student in topic (duration aggregation)
- [ ] TO-004: Last three elements completed in topic (sorted by completion)
- [ ] TO-005: Completion dates for last three elements in topic
- [ ] All metrics use `topicId` parameter from query context
- [ ] Results cached with topic-specific cache keys
- [ ] Prometheus metrics track computation duration per metric
- [ ] Unit tests with mocked LRS data
- [ ] E2E tests with real xAPI statements

**Implementation Scope**:

- `src/computation/providers/topic-score.provider.ts` — TO-001
- `src/computation/providers/topic-max-score.provider.ts` — TO-002
- `src/computation/providers/topic-time-spent.provider.ts` — TO-003
- `src/computation/providers/topic-last-elements.provider.ts` — TO-004, TO-005
- `src/computation/providers/*.spec.ts` — Unit tests
- `test/metrics-topic.e2e-spec.ts` — E2E tests

**Story Points**: 6

---

#### Story 10.2: Element-Level Metrics (EO-001 to EO-005) (5 pts) — [#TBD]

**Description**: Implement 5 element-level metrics for Element Overview dashboard per Metrics Specification.

**Acceptance Criteria**:

- [ ] EO-001: Score of best attempt for element (highest score, tie-break by recent)
- [ ] EO-002: Latest attempt status (completion boolean from most recent registration)
- [ ] EO-003: Number of attempts for element (count distinct registrations)
- [ ] EO-004: Time spent on element (sum durations across attempts)
- [ ] EO-005: Completion status for element (boolean from best attempt)
- [ ] All metrics use `elementId` parameter from query context
- [ ] Results cached with element-specific cache keys
- [ ] Prometheus metrics track computation duration per metric
- [ ] Unit tests with mocked LRS data
- [ ] E2E tests with real xAPI statements

**Implementation Scope**:

- `src/computation/providers/element-score.provider.ts` — EO-001
- `src/computation/providers/element-status.provider.ts` — EO-002, EO-005
- `src/computation/providers/element-attempts.provider.ts` — EO-003
- `src/computation/providers/element-time-spent.provider.ts` — EO-004
- `src/computation/providers/*.spec.ts` — Unit tests
- `test/metrics-element.e2e-spec.ts` — E2E tests

**Story Points**: 5

---

#### Story 10.3: Metrics Registry Enhancement (2 pts) — [#TBD]

**Description**: Enhance metrics registry to support dashboard-level filtering and metadata enrichment.

**Acceptance Criteria**:

- [ ] Registry supports filtering by `dashboardLevel` query param
- [ ] `GET /api/v1/metrics?level=topic` returns only topic metrics
- [ ] `GET /api/v1/metrics?level=element` returns only element metrics
- [ ] Metadata includes `requiredParams` for each metric (courseId, topicId, elementId)
- [ ] Metadata includes `outputType` (scalar, array, object) per metric
- [ ] Updated OpenAPI annotations for new query parameters
- [ ] Unit tests for filtering logic
- [ ] E2E tests for catalog filtering

**Implementation Scope**:

- `src/metrics/services/metrics-registry.service.ts` — Add filtering
- `src/metrics/controllers/metrics.controller.ts` — Query param handling
- `src/metrics/dto/metric-catalog.dto.ts` — Add metadata fields
- `test/metrics.e2e-spec.ts` — Update tests

**Story Points**: 2

---

### Epic 11: Developer Experience & Contribution ([NEW])

**Priority**: High | **Story Points**: 8

Improve developer onboarding and metric contribution velocity.

#### Story 11.1: Metric Contribution Guide (REQ-FN-011) (3 pts) — [#TBD]

**Description**: Create comprehensive contribution guide for adding new metrics with step-by-step process and examples.

**Acceptance Criteria**:

- [ ] `docs/CONTRIBUTING.md` exists with full contribution workflow
- [ ] Guide covers: implement interface, add tests, register in module, update catalog, annotate OpenAPI
- [ ] Checklist for PR review included in guide
- [ ] Migration path from CSV spec to implementation documented
- [ ] At least one example metric walkthrough (start to finish)
- [ ] Guide references existing metrics as examples
- [ ] Contribution guide linked from README.md
- [ ] Developer setup instructions (local LRS, test data)

**Implementation Scope**:

- `docs/CONTRIBUTING.md` — Main guide
- `docs/METRIC-DEVELOPMENT.md` — Technical deep-dive
- Update `README.md` — Add contribution section
- Add example walkthrough (e.g., implementing CO-006)

**Story Points**: 3

---

#### Story 11.2: Metric Scaffolding Template (3 pts) — [#TBD]

**Description**: Create metric scaffolding template and CLI generator to bootstrap new metrics.

**Acceptance Criteria**:

- [ ] Template files in `templates/metric/` with placeholder implementation
- [ ] Template includes: provider class, interface implementation, unit test stubs, E2E test path
- [ ] CLI generator script: `yarn metric:new <metricId> <level>` scaffolds new metric
- [ ] Generated files include TODOs for customization
- [ ] Generator updates metrics registry automatically
- [ ] Generator adds OpenAPI decorators to controller
- [ ] Documentation in `docs/CONTRIBUTING.md` on using generator
- [ ] Unit tests for generator script

**Implementation Scope**:

- `templates/metric/metric-provider.template.ts` — Provider template
- `templates/metric/metric-provider.spec.template.ts` — Test template
- `scripts/generate-metric.ts` — CLI generator
- `package.json` — Add `metric:new` script
- Update `docs/CONTRIBUTING.md` — Generator usage

**Story Points**: 3

---

#### Story 11.3: Metric Testing Utilities (2 pts) — [#TBD]

**Description**: Create shared testing utilities for metric providers to reduce boilerplate.

**Acceptance Criteria**:

- [ ] Test fixtures for common xAPI statement patterns (completion, score, duration)
- [ ] Mock LRS client builder for provider tests
- [ ] Assertion helpers for metric result validation
- [ ] Test data generator for multi-student, multi-course scenarios
- [ ] Shared E2E test setup for metrics endpoints
- [ ] Documentation in `docs/TESTING.md` for test utilities
- [ ] All existing metric tests refactored to use utilities

**Implementation Scope**:

- `test/fixtures/xapi-statements.ts` — Statement builders
- `test/helpers/metric-test.helpers.ts` — Assertion helpers
- `test/helpers/lrs-client.mock.ts` — Mock LRS client
- Update existing metric tests to use helpers
- Update `docs/TESTING.md` — Test utilities guide

**Story Points**: 2

---

### Epic 12: API Maturity & Versioning ([NEW])

**Priority**: High | **Story Points**: 6

Implement API versioning foundation and deprecation policy.

#### Story 12.1: API Versioning Infrastructure (REQ-FN-016) (4 pts) — [#TBD]

**Description**: Implement URI-based API versioning with v1 baseline and deprecation headers.

**Acceptance Criteria**:

- [ ] All endpoints versioned at `/api/v1/*` (metrics, admin, instances)
- [ ] Legacy `/api/*` routes redirect to `/api/v1/*` with 301
- [ ] Response header `X-API-Version: 1` on all responses
- [ ] Middleware for version detection and routing
- [ ] OpenAPI spec served at `/api/v1/openapi.json`
- [ ] Swagger UI at `/api/v1/docs`
- [ ] Version compatibility matrix in `docs/API-VERSIONING.md`
- [ ] E2E tests for versioned endpoints
- [ ] CI validates versioning consistency

**Implementation Scope**:

- `src/common/middleware/api-version.middleware.ts` — Version headers
- `src/main.ts` — Update global prefix and Swagger config
- `src/metrics/controllers/*.ts` — Update paths to v1
- `src/admin/controllers/*.ts` — Update paths to v1
- `docs/API-VERSIONING.md` — Versioning policy
- `test/api-versioning.e2e-spec.ts` — E2E tests

**Story Points**: 4

---

#### Story 12.2: Deprecation Policy Documentation (2 pts) — [#TBD]

**Description**: Document API deprecation policy with migration guide template.

**Acceptance Criteria**:

- [ ] `docs/API-DEPRECATION-POLICY.md` with deprecation process
- [ ] Policy defines: minimum support period (6 months), sunset headers, migration guides
- [ ] Template for migration guides in `docs/api-migrations/template.md`
- [ ] Deprecation announcement process (release notes, changelog, headers)
- [ ] Example migration guide for hypothetical v1 → v2
- [ ] Policy linked from main README and API docs

**Implementation Scope**:

- `docs/API-DEPRECATION-POLICY.md` — Policy document
- `docs/api-migrations/template.md` — Migration guide template
- `docs/api-migrations/v1-to-v2-example.md` — Example migration
- Update `README.md` — Link to versioning and deprecation

**Story Points**: 2

---

### Epic 13: Performance Testing Foundation ([NEW])

**Priority**: High | **Story Points**: 6

Establish performance testing infrastructure and baseline SLO validation.

#### Story 13.1: k6 Performance Test Suite (REQ-FN-022) (4 pts) — [#TBD]

**Description**: Implement k6-based performance tests validating latency SLOs for metrics endpoints.

**Acceptance Criteria**:

- [ ] k6 test scripts in `test/performance/` directory
- [ ] Tests cover: catalog endpoint, single metric results, batch results
- [ ] Nominal load profile: 20 VUs, 1-2 req/s per VU, 5 min duration
- [ ] Tests report P50, P95, P99 latency, success rate, cache hit ratio
- [ ] Tests validate SLO targets: P95 < 1s (warm), P95 < 2s (cold)
- [ ] Tests export results to JSON for tracking over time
- [ ] Tests can run locally (`yarn test:perf`) and in CI (manual trigger)
- [ ] Test setup includes seeding LRS with representative data
- [ ] Documentation in `docs/PERFORMANCE-TESTING.md`

**Implementation Scope**:

- `test/performance/metrics-catalog.k6.js` — Catalog endpoint test
- `test/performance/metrics-results.k6.js` — Results endpoint test
- `test/performance/setup.js` — Test data seeding
- `package.json` — Add `test:perf` script
- `docs/PERFORMANCE-TESTING.md` — Performance testing guide
- `.github/workflows/performance.yml` — CI workflow (manual trigger)

**Story Points**: 4

---

#### Story 13.2: Performance Monitoring Dashboard (2 pts) — [#TBD]

**Description**: Create performance monitoring dashboard template for visualizing test results over time.

**Acceptance Criteria**:

- [ ] Grafana dashboard JSON in `monitoring/dashboards/performance.json`
- [ ] Dashboard visualizes: latency percentiles, throughput, cache hit ratio, error rate
- [ ] Dashboard includes SLO threshold lines (P95 1s/2s)
- [ ] Dashboard supports filtering by endpoint, test run, date range
- [ ] Documentation in `docs/MONITORING.md` on importing dashboard
- [ ] CI exports test results in Prometheus format for ingestion

**Implementation Scope**:

- `monitoring/dashboards/performance.json` — Grafana dashboard
- `test/performance/export-prometheus.js` — Results exporter
- `docs/MONITORING.md` — Monitoring setup guide
- Update `docker-compose.dev.yml` — Add Grafana service

**Story Points**: 2

---

### Epic 14: Issue Cleanup & Documentation ([NEW])

**Priority**: Medium | **Story Points**: 2

Close redundant open issues and consolidate documentation.

#### Story 14.1: Issue Cleanup (1 pt) — [#TBD]

**Description**: Close redundant epic tracking issues from Sprint 1/2 that are superseded by sprint plans.

**Acceptance Criteria**:

- [ ] Close epic issues #14, #15, #16, #17, #18 (Sprint 1 epics)
- [ ] Close epic issues #47, #48, #49 (Sprint 2 epics)
- [ ] Add closing comment referencing sprint plan and completed stories
- [ ] Update labels: remove `sprint:current` from closed epics
- [ ] Verify no active work references closed issues

**Story Points**: 1

---

#### Story 14.2: Documentation Consolidation (1 pt) — [#TBD]

**Description**: Consolidate and update project documentation for Sprint 3 deliverables.

**Acceptance Criteria**:

- [ ] Update main README with Sprint 3 features
- [ ] Add links to contribution guide, versioning policy, performance testing
- [ ] Update architecture docs with new metric providers
- [ ] Update traceability matrix with Sprint 3 requirements
- [ ] Verify all docs/ links are valid

**Story Points**: 1

---

## Execution Plan

### Phase 1 — Advanced Metrics (Week 1)

**Priority**: Critical | **Story Points**: 13

- Story 10.1: Topic-Level Metrics (6 pts)
- Story 10.2: Element-Level Metrics (5 pts)
- Story 10.3: Metrics Registry Enhancement (2 pts)

**Goal**: Expand metric catalog to support Topic and Element dashboards

---

### Phase 2 — Developer Experience (Week 1-2)

**Priority**: High | **Story Points**: 8

- Story 11.1: Contribution Guide (3 pts)
- Story 11.2: Metric Scaffolding Template (3 pts)
- Story 11.3: Metric Testing Utilities (2 pts)

**Goal**: Enable fast, consistent metric development

---

### Phase 3 — API Maturity (Week 2)

**Priority**: High | **Story Points**: 6

- Story 12.1: API Versioning Infrastructure (4 pts)
- Story 12.2: Deprecation Policy Documentation (2 pts)

**Goal**: Prepare API for production with versioning foundation

---

### Phase 4 — Performance & Cleanup (Week 2)

**Priority**: High | **Story Points**: 8

- Story 13.1: k6 Performance Test Suite (4 pts)
- Story 13.2: Performance Monitoring Dashboard (2 pts)
- Story 14.1: Issue Cleanup (1 pt)
- Story 14.2: Documentation Consolidation (1 pt)

**Goal**: Validate SLOs and clean up project state

---

## Estimated Velocity & Sprint Capacity

Based on Sprint 2 performance:

- **Sprint 2 Velocity**: 41 pts in 1 day (exceptional with Copilot)
- **Sprint 3 Estimated Velocity**: 20-25 pts/week (sustainable pace)
- **Sprint Duration**: 2 weeks
- **Available Capacity**: 40-50 pts
- **Committed Scope**: 35 pts (Phase 1-4)
- **Stretch Goal**: Story 9.2 remaining (2 pts from Sprint 2 deferred work)

---

## Dependencies & Blockers

### Sprint 2 Dependencies (All Met ✅)

- ✅ Computation framework with IMetricComputation interface
- ✅ LRS client with xAPI query support
- ✅ Cache service with cache-aside pattern
- ✅ Metrics registry and results endpoint
- ✅ Multi-LRS configuration and health monitoring

### External Dependencies

- 🔗 xAPI Statements — Representative test data for Topic/Element metrics
- 🔗 k6 Installation — Local and CI environment setup
- 🔗 Grafana Instance — For performance dashboard (optional, Docker Compose)

### Known Risks

| Risk                                      | Impact | Probability | Mitigation                                       |
| ----------------------------------------- | ------ | ----------- | ------------------------------------------------ |
| xAPI statement complexity (Topic/Element) | High   | Medium      | Use Metrics Spec as authoritative reference      |
| k6 test data seeding complexity           | Medium | Medium      | Start with minimal test data, expand iteratively |
| API versioning migration complexity       | Medium | Low         | v1 is baseline, no migrations needed yet         |
| Developer guide comprehensiveness         | Low    | Low         | Iterate based on contributor feedback            |

---

## Testing Strategy

### Unit Tests

- Metric providers: parameter validation, computation logic, edge cases
- Registry filtering: dashboard level, metadata enrichment
- API versioning: middleware logic, header injection
- Test utilities: fixture builders, assertion helpers

### E2E Tests

- Topic metrics: end-to-end with real xAPI statements
- Element metrics: end-to-end with real xAPI statements
- API versioning: versioned endpoint access, redirects
- Performance tests: k6 scripts validating SLOs

### Performance Tests

- Catalog endpoint: P95 < 200ms (lightweight)
- Single metric results: P95 < 1s (warm cache), P95 < 2s (cold cache)
- Batch results: P95 < 3s for 5 metrics
- Cache hit ratio: >80% for repeated queries

---

## Definition of Done (DoD)

For each Sprint 3 story:

- [ ] Code implemented per acceptance criteria
- [ ] Unit tests written with >80% coverage
- [ ] E2E tests passing (including error cases)
- [ ] Performance tests passing (for Phase 4 stories)
- [ ] Code reviewed and approved by team lead
- [ ] OpenAPI/Swagger documentation updated
- [ ] No linting errors, code formatted
- [ ] CI pipeline passing
- [ ] Documentation updated (guides, README)
- [ ] Merged to main branch

---

## Success Metrics

### Code Quality

- Test coverage: >80% for all new code
- Code review time: <24 hours
- Deployment success rate: 100%

### Developer Experience

- Metric development lead time: <2 hours (from template to PR)
- Contribution guide clarity: developer walkthrough successful
- Scaffolding template adoption: 100% of new metrics use template

### Performance

- P95 latency: ≤1s (warm cache), ≤2s (cold cache)
- Cache hit ratio: >80%
- Performance test pass rate: 100%

### API Maturity

- API version consistency: 100% endpoints at v1
- Deprecation policy documented: 100%
- Versioning E2E tests: 100% passing

---

## Deferred to Sprint 4+

### High Priority (Sprint 4)

- Batch analytics endpoints (multiple metrics in one request)
- Student activity timeline metrics
- Comparative analytics (student vs cohort)
- Real LRS integration testing (multi-instance)

### Medium Priority (Sprint 5+)

- Advanced caching strategies (cache warming, prefetch)
- Metric computation parallelization
- Data export (CSV, PDF)
- User preferences & saved queries

### Low Priority (Backlog)

- Story 9.2 remaining: Multi-instance filtering (pending actual multi-LRS deployment)
- Metric versioning & schema migration
- Multi-language support

---

## Sprint Ceremonies Schedule

**Sprint Planning**: Day 1 (Nov 14)

- Review Sprint 2 retrospective
- Refine Sprint 3 backlog
- Estimate and assign stories

**Daily Standup**: Every weekday at 10 AM

- 15 minutes, same time/channel
- Focus: progress, blockers, next steps

**Sprint Review**: Day 14 (Nov 28)

- Demo completed features
- Gather stakeholder feedback
- Review performance test results

**Sprint Retrospective**: Day 14 (Nov 28)

- What went well?
- What could improve?
- Action items for Sprint 4

---

## Resources & Tools

### Development Setup

- Node.js 22 LTS
- Yarn 1.22+
- Docker & Docker Compose
- k6 (performance testing): https://k6.io/docs/get-started/installation/
- Grafana (optional): for performance dashboards

### Documentation

- [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) — Module structure, patterns
- [SRS.md](../SRS.md) — Requirements traceability
- [Metrics-Specification.md](../Metrics-Specification.md) — Formal metric definitions
- [SPRINT-2-PLAN.md](./SPRINT-2-PLAN.md) — Previous sprint reference

### External Resources

- [xAPI Specification](https://github.com/adlnet/xAPI-Spec)
- [k6 Documentation](https://k6.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [Semantic Versioning](https://semver.org/)

---

## Sign-Off

**Product Owner**: TBD  
**Sprint Manager**: Copilot Sprint Agent  
**Development Team**: Copilot, theUpsider

**Plan Created**: November 14, 2025  
**Status**: 🚀 Ready to Start

---

**Previous Sprint**: [SPRINT-2-PLAN.md](./SPRINT-2-PLAN.md)  
**Next Sprint**: SPRINT-4 (TBD)  
**Sprint Duration**: 2 weeks (cyclical)
