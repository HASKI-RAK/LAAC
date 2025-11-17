# Requirements Traceability Matrix

**LAAC System — Requirements to Architecture Mapping**

_Ensures all SRS requirements are addressed by architectural components_

---

## Purpose

This document maps each requirement from `docs/SRS.md` to the architectural components, modules, and design decisions defined in `docs/architecture/ARCHITECTURE.md`. It serves as a verification tool to ensure:

- All requirements have architectural realization
- No architectural components exist without requirement justification
- Design decisions are traceable to requirements

---

## Implementation Status Legend

The traceability matrix includes implementation status for each requirement:

- **✅ Complete**: Fully implemented and tested with passing tests
- **🟡 In Progress**: Partially implemented, some components exist but incomplete
- **❌ Not Started**: No implementation yet, planned for future development
- **🔵 Deferred**: Planned for future phase or contingent on external factors

**Update Cadence**: Weekly during active development sprints; quarterly during maintenance phases.  
**Last Updated**: 2025-11-10

---

## Functional Requirements Traceability

| Requirement ID | Title                                               | Implementation Status   | Architecture Mapping                                 | Components                                                       | ADR/Section               |
| -------------- | --------------------------------------------------- | ----------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- | ------------------------- |
| **REQ-FN-001** | Client-Facing Intermediary API                      | 🟡 In Progress          | MetricsModule, MetricsController, API Gateway Layer  | `MetricsController`, `AuthGuard`, `ValidationPipe`               | ADR-004, Section 4.2      |
| **REQ-FN-002** | xAPI LRS Integration                                | ❌ Not Started          | DataAccessModule, LRSClient                          | `LRSClient`, HTTP client with xAPI query support                 | Section 4.2, 8.2          |
| **REQ-FN-003** | Analytics Metrics Catalog and Discovery             | 🟡 In Progress          | MetricsModule, MetricsRegistry                       | `MetricsRegistry`, `GET /metrics` endpoint                       | Section 4.2, 4.3          |
| **REQ-FN-004** | Compute Analytics from xAPI LRS per CSV Metric      | 🟡 In Progress          | ComputationModule, MetricProviders                   | `IMetricComputation`, CSV-compliant providers (CO-001 to CO-005) | ADR-002, Section 4.2      |
| **REQ-FN-005** | Results Retrieval, Aggregation, and Export          | ❌ Not Started          | MetricsModule, MetricsService                        | `MetricsService.getResults()`, `GET /metrics/:id/results`        | Section 4.3               |
| **REQ-FN-006** | Analytics Results Caching                           | ❌ Not Started          | DataAccessModule, CacheService                       | `CacheService` (Redis), cache-aside pattern                      | ADR-003, Section 8.1      |
| **REQ-FN-007** | Cache Invalidation and Refresh                      | ❌ Not Started          | AdminModule, CacheController                         | `CacheController`, `POST /admin/cache/invalidate`                | Section 4.2               |
| **REQ-FN-008** | OpenAPI Specification Generation and Exposure       | ❌ Not Started          | NestJS Swagger integration                           | `@nestjs/swagger` decorators, auto-generated spec                | ADR-004, Section 10.1     |
| **REQ-FN-009** | Interactive API Documentation UI                    | ❌ Not Started          | Swagger UI integration                               | Swagger UI served at `/api/docs`                                 | ADR-004                   |
| **REQ-FN-010** | Metric Extension Architecture and Interfaces        | ❌ Not Started          | ComputationModule, IMetricComputation interface      | `IMetricComputation`, plugin-based registration                  | ADR-002, Section 11.1     |
| **REQ-FN-011** | Metric Contribution Guide and Templates             | 🔵 Deferred             | Documentation + code templates                       | Template files, contribution guide (future)                      | Section 11.2              |
| **REQ-FN-012** | Container Image Build and Registry                  | ❌ Not Started          | Dockerfile, CI/CD pipeline                           | GitHub Actions workflow, Docker build                            | Section 5.2               |
| **REQ-FN-013** | Docker Compose Configurations (Dev and Prod)        | ✅ Complete             | Deployment manifests                                 | `docker-compose.dev.yml`, `docker-compose.prod.yml`              | Section 5.1, 5.4          |
| **REQ-FN-014** | Secrets and Configuration Management                | ❌ Not Started          | CoreModule, ConfigService                            | `ConfigService`, environment variables, Docker secrets           | Section 4.2, 5.3          |
| **REQ-FN-015** | CI/CD Pipeline with GitHub Actions                  | ❌ Not Started          | GitHub Actions workflows                             | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`       | Section 7.2               |
| **REQ-FN-016** | API Versioning and Deprecation Policy               | ❌ Not Started          | API design, versioning strategy                      | URL-based versioning (`/v1/metrics`), deprecation headers        | Section 11.3              |
| **REQ-FN-017** | Multi-Instance Support and Cross-Instance Analytics | 🟡 Partially Complete   | MetricsModule, DataAccessModule, InstancesController | Statement tagging, instance-aware cache keys, instances endpoint | Section 5.4, 6.2, ADR-008 |
| **REQ-FN-018** | Architecture Documentation with PlantUML Diagrams   | ✅ Complete             | This document and PlantUML diagrams                  | `components.puml`, `deployment.puml`, `ARCHITECTURE.md`          | Section 1-17              |
| **REQ-FN-019** | SOLID and CUPID Principles Guidance                 | ✅ Complete             | Design patterns, module structure                    | Module boundaries, dependency injection, interfaces              | Section 12.1, 12.2        |
| **REQ-FN-020** | Structured Logging with Correlation IDs             | ✅ Complete             | CoreModule, LoggerService                            | `LoggerService` (Winston), correlation ID middleware             | ADR-006, Section 10.1     |
| **REQ-FN-021** | Metrics Export and Monitoring Endpoints             | ⚪ Deferred (log-based) | AdminModule, TelemetryHooks                          | `MetricsRegistryService` log events (`METRICS_DEBUG=true`)       | Section 10.2              |
| **REQ-FN-022** | Performance Testing and SLO Validation              | 🔵 Deferred             | Testing strategy, observability                      | Load tests (k6/Artillery), SLO dashboards                        | Section 7.2, 10.2         |
| **REQ-FN-023** | Authentication and Authorization Framework          | ✅ Complete             | AuthModule, JWT strategy                             | `JwtAuthGuard`, `ScopesGuard`, JWT validation                    | ADR-005, Section 9.1, 9.2 |
| **REQ-FN-024** | Input Validation and Rate Limiting                  | 🟡 In Progress          | API Gateway Layer                                    | `ValidationPipe` (class-validator), `RateLimitGuard`             | Section 4.2, 9.3, 9.4     |

---

## Non-Functional Requirements Traceability

| Requirement ID | Title                                               | Implementation Status | Architecture Mapping              | Components                                                      | ADR/Section                       |
| -------------- | --------------------------------------------------- | --------------------- | --------------------------------- | --------------------------------------------------------------- | --------------------------------- |
| **REQ-NF-001** | Core Data Source Scope (xAPI LRS)                   | ❌ Not Started        | Constraint, LRSClient             | `LRSClient` only queries xAPI endpoints                         | Section 2.3, 8.2                  |
| **REQ-NF-002** | Standalone Deployability                            | ✅ Complete           | CoreModule, HealthController      | Health endpoints (liveness/readiness), Docker Compose           | Section 5.1, 5.2, 10.3            |
| **REQ-NF-003** | Metrics Traceability and Coverage Verification      | 🔵 Deferred           | Validation tooling (future)       | CI checks for CSV-to-implementation sync                        | Section 4.2 (REQ-FN-003 note)     |
| **REQ-NF-004** | Determinism, Idempotency, and Result Consistency    | ❌ Not Started        | Computation logic design          | Stateless computation functions, pure logic                     | Section 6.1, 12.2                 |
| **REQ-NF-005** | Analytics Endpoint Performance (CSV Metrics)        | ❌ Not Started        | Caching, optimization             | `CacheService`, async processing, Redis                         | ADR-003, Section 6.1              |
| **REQ-NF-006** | Cache Performance and Hit Ratio Targets             | ❌ Not Started        | Cache strategy, monitoring        | Redis with TTL, hit ratio metrics                               | Section 8.1, 10.2                 |
| **REQ-NF-007** | Cache Consistency and Correctness                   | ❌ Not Started        | Cache invalidation, TTL           | Explicit invalidation API, TTL expiration                       | ADR-003, Section 4.3              |
| **REQ-NF-008** | API Documentation Completeness and Accuracy         | ❌ Not Started        | OpenAPI generation                | Swagger decorators, auto-generated docs                         | ADR-004, Section 10.1             |
| **REQ-NF-009** | Metric Development Velocity and Lead Time           | ❌ Not Started        | Extension architecture            | Plugin interface, clear onboarding                              | ADR-002, Section 11.1             |
| **REQ-NF-010** | Metric Isolation and Testability                    | ❌ Not Started        | Module design, DI                 | Each metric is isolated, mockable via DI                        | Section 7.2, 12.1                 |
| **REQ-NF-011** | Deployment Automation and Reliability               | ❌ Not Started        | CI/CD, Docker Compose             | GitHub Actions, health checks, rollback                         | Section 5.1, 7.2                  |
| **REQ-NF-012** | Deployment Rollback and Recovery                    | ❌ Not Started        | Versioned images, blue-green      | Tagged Docker images, Traefik rolling updates                   | Section 5.1 (Deployment Strategy) |
| **REQ-NF-013** | Multi-Instance Data Isolation and Consistency       | ❌ Not Started        | Shared cache, cache key design    | Redis shared cache with namespaced keys                         | Section 8.1, 5.4                  |
| **REQ-NF-014** | Architecture Documentation Currency and Maintenance | ✅ Complete           | This document, review process     | Quarterly architecture reviews, PlantUML updates                | Section 17                        |
| **REQ-NF-015** | Developer Onboarding and Architecture Comprehension | ✅ Complete           | Documentation structure, diagrams | `ARCHITECTURE.md`, PlantUML diagrams, code comments             | Section 1.3, 7.1                  |
| **REQ-NF-016** | Observability Baseline and Alert Guidance           | 🟡 In Progress        | Logging, metrics, health checks   | `LoggerService`, `MetricsExporter`, health endpoints            | Section 10.1, 10.2, 10.3          |
| **REQ-NF-017** | Analytics Endpoint Latency SLO (Detailed)           | ❌ Not Started        | Performance design, caching       | Cache-first strategy, async processing, SLO monitoring          | Section 2.2, 10.2                 |
| **REQ-NF-018** | Graceful Degradation and Timeout Handling           | 🔵 Deferred           | Error handling, circuit breaker   | Timeout configs, fallback responses, 503 on LRS failure         | Section 6.3, 13                   |
| **REQ-NF-019** | Security Baseline and Secure Defaults               | 🟡 In Progress        | Security architecture             | TLS termination (Traefik), secrets management, input validation | Section 9.1-9.4, ADR-005          |
| **REQ-NF-020** | Security Testing and Compliance Validation          | ❌ Not Started        | CI security checks, test strategy | Secret scanning, vulnerability scans, authz tests               | Section 7.2, 9.4                  |

---

## CSV Metrics to Implementation Mapping

**Epic 14**: CSV-Compliant Metrics Implementation (REQ-FN-004)

This section tracks the mapping of CSV-specified metrics to their provider implementations.

### Course Overview Metrics (CO-001 to CO-005)

| CSV Row | Dashboard Level | Metric Description                                                                       | Provider ID               | Provider File                         | Implementation Status | Tests      |
| ------- | --------------- | ---------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------- | --------------------- | ---------- |
| CO-001  | Course overview | Total score earned by a student on learning elements in each course                      | `course-total-score`      | `course-total-score.provider.ts`      | ✅ Complete           | Unit + E2E |
| CO-002  | Course overview | Possible total score for all learning elements in each course                            | `course-max-score`        | `course-max-score.provider.ts`        | ✅ Complete           | Unit + E2E |
| CO-003  | Course overview | Total time spent by a student in each course in a given time period                      | `course-time-spent`       | `course-time-spent.provider.ts`       | ✅ Complete           | Unit + E2E |
| CO-004  | Course overview | Last three learning elements of any course completed by a student                        | `course-last-elements`    | `course-last-elements.provider.ts`    | ✅ Complete           | Unit + E2E |
| CO-005  | Course overview | Completion date of the last three learning elements of any course completed by a student | `course-completion-dates` | `course-completion-dates.provider.ts` | ✅ Complete           | Unit + E2E |

### Topic Overview Metrics (TO-001 to TO-005)

| CSV Row | Dashboard Level | Metric Description                                                                       | Provider ID              | Provider File | Implementation Status | Tests |
| ------- | --------------- | ---------------------------------------------------------------------------------------- | ------------------------ | ------------- | --------------------- | ----- |
| TO-001  | Topic overview  | Total score earned by a student on learning elements in each topic                       | `topic-total-score`      | TBD           | ❌ Not Started        | -     |
| TO-002  | Topic overview  | Possible total score for all learning elements in each topic                             | `topic-max-score`        | TBD           | ❌ Not Started        | -     |
| TO-003  | Topic overview  | Total time spent by a student in each topic in a given time period                       | `topic-time-spent`       | TBD           | ❌ Not Started        | -     |
| TO-004  | Topic overview  | Last three learning elements of any topic in a course completed by a student             | `topic-last-elements`    | TBD           | ❌ Not Started        | -     |
| TO-005  | Topic overview  | Completion date of the last three learning elements of any course completed by a student | `topic-completion-dates` | TBD           | ❌ Not Started        | -     |

### Learning Element Overview Metrics (EO-001 to EO-006)

| CSV Row | Dashboard Level           | Metric Description                                                                    | Provider ID                  | Provider File | Implementation Status | Tests |
| ------- | ------------------------- | ------------------------------------------------------------------------------------- | ---------------------------- | ------------- | --------------------- | ----- |
| EO-001  | Learning element overview | Current completion status of the best attempt by a student for each learning element  | `element-completion-status`  | TBD           | ❌ Not Started        | -     |
| EO-002  | Learning element overview | Date of the best attempt of a student for each learning element                       | `element-best-attempt-date`  | TBD           | ❌ Not Started        | -     |
| EO-003  | Learning element overview | Score for the best attempt of a student at each learning element                      | `element-best-attempt-score` | TBD           | ❌ Not Started        | -     |
| EO-004  | Learning element overview | Total time spent by a student on each learning element in a given time period         | `element-time-spent`         | TBD           | ❌ Not Started        | -     |
| EO-005  | Learning element overview | Last three learning elements of a topic completed by a student                        | `element-last-elements`      | TBD           | ❌ Not Started        | -     |
| EO-006  | Learning element overview | Completion date of the last three learning elements of a topic completed by a student | `element-completion-dates`   | TBD           | ❌ Not Started        | -     |

### Implementation Notes

- **Story 14.1 (CO-001 to CO-005)**: Completed in Issue #87, Sprint 4
- **Story 14.2 (TO-001 to TO-005)**: Planned for Issue #TBD
- **Story 14.3 (EO-001 to EO-006)**: Planned for Issue #TBD

### CSV Verification Checkpoint (REQ-FN-004)

- ✅ Pre-Implementation: CSV-to-provider mapping table generated
- ✅ Pre-Implementation: Systematic naming convention defined (CO-XXX, TO-XXX, EO-XXX)
- ✅ During Implementation: Each provider file named per mapping
- ✅ During Implementation: JSDoc includes CSV row reference
- ✅ During Implementation: Output schema matches CSV description literally
- ✅ During Implementation: Test data validates raw aggregations
- 🟡 Completion Verification: 5 of 16 metrics implemented (31%)

---

## Stakeholder Needs Traceability

| Stakeholder Need                                | Requirements Covered                                       | Architecture Components                                           |
| ----------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| **SG-4-003** (Developers: Analytics Metrics)    | REQ-FN-003, REQ-FN-004, REQ-FN-005, REQ-NF-003, REQ-NF-004 | MetricsModule, ComputationModule, LRSClient                       |
| **SG-4-004** (Developers: Results Caching)      | REQ-FN-006, REQ-FN-007, REQ-NF-005, REQ-NF-006, REQ-NF-007 | CacheService, Redis, cache-aside pattern                          |
| **SG-4-005** (Developers: API Specification)    | REQ-FN-001, REQ-FN-008, REQ-FN-009, REQ-NF-008             | Swagger integration, MetricsController                            |
| **SG-4-006** (Developers: Extensibility)        | REQ-FN-010, REQ-FN-011, REQ-NF-009, REQ-NF-010             | IMetricComputation interface, plugin architecture                 |
| **SG-4-007** (DevOps: Deployment Automation)    | REQ-FN-012, REQ-FN-013, REQ-FN-015, REQ-NF-011, REQ-NF-012 | Docker Compose, GitHub Actions, Traefik                           |
| **SG-4-008** (DevOps: Configuration Management) | REQ-FN-014                                                 | ConfigService, environment variables, Docker secrets              |
| **SG-4-009** (API Consumers: Versioning)        | REQ-FN-016                                                 | API versioning strategy, deprecation headers                      |
| **SG-4-010** (DevOps: Multi-Instance Support)   | REQ-FN-017, REQ-NF-013                                     | Shared Redis, load balancing via Traefik                          |
| **SG-4-011** (Architecture Team: Documentation) | REQ-FN-018, REQ-NF-014, REQ-NF-015                         | ARCHITECTURE.md, PlantUML diagrams, traceability.md               |
| **SG-4-012** (Developers: Design Principles)    | REQ-FN-019                                                 | SOLID/CUPID patterns, module boundaries, DI                       |
| **SG-1-001** (Operators: Observability)         | REQ-FN-020, REQ-FN-021, REQ-NF-016                         | LoggerService, MetricsExporter, health checks                     |
| **SG-1-002** (Performance Testing)              | REQ-FN-022, REQ-NF-017, REQ-NF-018                         | Caching, SLO monitoring, timeout handling                         |
| **SG-5-001** (Security Baseline)                | REQ-FN-023, REQ-FN-024, REQ-NF-019, REQ-NF-020             | AuthModule, security guards, input validation, CI security checks |

---

## Architectural Decision Records (ADRs) to Requirements

| ADR         | Decision                                | Primary Requirements                                       |
| ----------- | --------------------------------------- | ---------------------------------------------------------- |
| **ADR-001** | NestJS Modular Monolith                 | REQ-FN-019, REQ-NF-010, REQ-NF-015                         |
| **ADR-002** | Plugin-Based Metric Architecture        | REQ-FN-010, REQ-NF-009, REQ-NF-010                         |
| **ADR-003** | Cache-Aside Pattern with Redis          | REQ-FN-006, REQ-FN-007, REQ-NF-005, REQ-NF-006, REQ-NF-007 |
| **ADR-004** | API-First with OpenAPI/Swagger          | REQ-FN-001, REQ-FN-008, REQ-FN-009, REQ-NF-008             |
| **ADR-005** | JWT-Based Authentication                | REQ-FN-023, REQ-NF-019                                     |
| **ADR-006** | Structured Logging with Correlation IDs | REQ-FN-020, REQ-NF-016                                     |
| **ADR-007** | Circuit Breaker for LRS Client (Future) | REQ-NF-018                                                 |

---

## Component Coverage Analysis

### Coverage Summary

- **Total Requirements**: 44 (24 functional + 20 non-functional)
- **Mapped to Architecture**: 44 (100%)
- **Unmapped Requirements**: 0
- **Orphan Components**: 0

### Component-to-Requirement Mapping

| Component             | Requirements Addressed                               | Coverage       |
| --------------------- | ---------------------------------------------------- | -------------- |
| **MetricsModule**     | REQ-FN-001, 003, 004, 005                            | 4 requirements |
| **ComputationModule** | REQ-FN-004, 010, 011, REQ-NF-009, 010                | 5 requirements |
| **DataAccessModule**  | REQ-FN-002, 006, 007, REQ-NF-005, 006, 007           | 6 requirements |
| **AuthModule**        | REQ-FN-023, 024, REQ-NF-019, 020                     | 4 requirements |
| **CoreModule**        | REQ-FN-014, 020, REQ-NF-016                          | 3 requirements |
| **AdminModule**       | REQ-FN-007, 021                                      | 2 requirements |
| **Deployment**        | REQ-FN-012, 013, 015, 017, REQ-NF-002, 011, 012, 013 | 8 requirements |
| **Documentation**     | REQ-FN-018, 019, REQ-NF-014, 015                     | 4 requirements |
| **API Design**        | REQ-FN-001, 008, 009, 016, REQ-NF-008                | 5 requirements |
| **Observability**     | REQ-FN-020, 021, 022, REQ-NF-016, 017, 018           | 6 requirements |
| **Security**          | REQ-FN-023, 024, REQ-NF-019, 020                     | 4 requirements |

---

## Verification Checklist

### For Each Requirement

- ✅ Mapped to at least one architectural component
- ✅ Component exists in `components.puml` or `deployment.puml`
- ✅ Component responsibilities documented in `ARCHITECTURE.md`
- ✅ Referenced in at least one ADR or design section

### For Each Component

- ✅ Justification by at least one requirement
- ✅ Clearly defined responsibilities and interfaces
- ✅ Traceable to stakeholder needs via requirements

---

## Maintenance Process

### When to Update

- **New Requirement**: Add row to traceability matrix, update component mapping
- **Requirement Change**: Review affected components, update ADRs if needed
- **New Component**: Document justification via requirements, add to diagrams
- **Architecture Refactoring**: Update traceability matrix, regenerate diagrams

### Review Cadence

- **Quarterly**: Review traceability matrix for completeness
- **Per Sprint**: Validate new features map to requirements
- **Pre-Release**: Full traceability audit

---

## Unresolved Gaps (For Future Work)

| Gap            | Status         | Description                      | Action Required                               |
| -------------- | -------------- | -------------------------------- | --------------------------------------------- |
| **REQ-FN-011** | 🔵 Deferred    | Metric contribution guide        | Create `docs/CONTRIBUTING.md` with templates  |
| **REQ-NF-003** | 🔵 Deferred    | CSV-to-implementation validation | Implement CI check script                     |
| **REQ-FN-022** | 🔵 Deferred    | Performance testing setup        | Add k6/Artillery scripts, SLO dashboards      |
| **REQ-NF-018** | 🔵 Deferred    | Circuit breaker pattern          | Implement circuit breaker for LRS client      |
| **REQ-FN-001** | 🟡 In Progress | Client-facing API                | Complete controller endpoints with validation |
| **REQ-FN-003** | 🟡 In Progress | Metrics catalog                  | Implement registry and discovery endpoints    |
| **REQ-FN-021** | ⚪ Deferred    | Log-based telemetry hooks        | Monitor logs or add new exporter if needed    |

---

## Approval & Maintenance

| Version | Date       | Author            | Changes                                     |
| ------- | ---------- | ----------------- | ------------------------------------------- |
| 0.1     | 2025-10-20 | Architecture Team | Initial traceability matrix                 |
| 0.2     | 2025-11-10 | Architecture Team | Added implementation status tracking column |

**Next Review**: 2026-01-20 (Quarterly)  
**Maintained By**: Architecture Team  
**Tooling**: Manual updates; consider automation for CSV sync validation
