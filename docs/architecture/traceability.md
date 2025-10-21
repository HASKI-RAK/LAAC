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

## Functional Requirements Traceability

| Requirement ID | Title                                               | Architecture Mapping                                | Components                                                        | ADR/Section           |
| -------------- | --------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- | --------------------- |
| **REQ-FN-001** | Client-Facing Intermediary API                      | MetricsModule, MetricsController, API Gateway Layer | `MetricsController`, `AuthGuard`, `ValidationPipe`                | ADR-004, Section 4.2  |
| **REQ-FN-002** | xAPI LRS Integration                                | DataAccessModule, LRSClient                         | `LRSClient`, HTTP client with xAPI query support                  | Section 4.2, 8.2      |
| **REQ-FN-003** | Analytics Metrics Catalog and Discovery             | MetricsModule, MetricsRegistry                      | `MetricsRegistry`, `GET /metrics` endpoint                        | Section 4.2, 4.3      |
| **REQ-FN-004** | Compute Analytics from xAPI LRS per CSV Metric      | ComputationModule, MetricProviders                  | `IMetricComputation`, `QuickMetricProvider`, `ComputationFactory` | ADR-002, Section 4.2  |
| **REQ-FN-005** | Results Retrieval, Aggregation, and Export          | MetricsModule, MetricsService                       | `MetricsService.getResults()`, `GET /metrics/:id/results`         | Section 4.3           |
| **REQ-FN-006** | Analytics Results Caching                           | DataAccessModule, CacheService                      | `CacheService` (Redis), cache-aside pattern                       | ADR-003, Section 8.1  |
| **REQ-FN-007** | Cache Invalidation and Refresh                      | AdminModule, CacheController                        | `CacheController`, `POST /admin/cache/invalidate`                 | Section 4.2           |
| **REQ-FN-008** | OpenAPI Specification Generation and Exposure       | NestJS Swagger integration                          | `@nestjs/swagger` decorators, auto-generated spec                 | ADR-004, Section 10.1 |
| **REQ-FN-009** | Interactive API Documentation UI                    | Swagger UI integration                              | Swagger UI served at `/api/docs`                                  | ADR-004               |
| **REQ-FN-010** | Metric Extension Architecture and Interfaces        | ComputationModule, IMetricComputation interface     | `IMetricComputation`, plugin-based registration                   | ADR-002, Section 11.1 |
| **REQ-FN-011** | Metric Contribution Guide and Templates             | Documentation + code templates                      | Template files, contribution guide (future)                       | Section 11.2          |
| **REQ-FN-012** | Container Image Build and Registry                  | Dockerfile, CI/CD pipeline                          | GitHub Actions workflow, Docker build                             | Section 5.2           |
| **REQ-FN-013** | Docker Compose Configurations (Dev and Prod)        | Deployment manifests                                | `docker-compose.dev.yml`, `docker-compose.prod.yml`               | Section 5.1, 5.4      |
| **REQ-FN-014** | Secrets and Configuration Management                | CoreModule, ConfigService                           | `ConfigService`, environment variables, Docker secrets            | Section 4.2, 5.3      |
| **REQ-FN-015** | CI/CD Pipeline with GitHub Actions                  | GitHub Actions workflows                            | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`        | Section 7.2           |
| **REQ-FN-016** | API Versioning and Deprecation Policy               | API design, versioning strategy                     | URL-based versioning (`/v1/metrics`), deprecation headers         | Section 11.3          |
| **REQ-FN-017** | Multi-Instance Support and Cross-Instance Analytics | Deployment architecture, shared Redis               | Multiple LAAC containers, shared Redis cache                      | Section 5.4, 6.2      |
| **REQ-FN-018** | Architecture Documentation with PlantUML Diagrams   | This document and PlantUML diagrams                 | `components.puml`, `deployment.puml`, `ARCHITECTURE.md`           | Section 1-17          |
| **REQ-FN-019** | SOLID and CUPID Principles Guidance                 | Design patterns, module structure                   | Module boundaries, dependency injection, interfaces               | Section 12.1, 12.2    |
| **REQ-FN-020** | Structured Logging with Correlation IDs             | CoreModule, LoggerService                           | `LoggerService` (Winston), correlation ID middleware              | ADR-006, Section 10.1 |

| **REQ-FN-020** | Structured Logging with Correlation IDs | CoreModule (IMPLEMENTED) | `LoggerService` (Winston) — implemented at `src/core/logger/logger.service.ts`; `CorrelationIdMiddleware` — implemented at `src/core/middleware/correlation-id.middleware.ts` | ADR-006, Section 10.1 |
| **REQ-FN-021** | Metrics Export and Monitoring Endpoints | AdminModule, MetricsExporter | `MetricsExporter`, `GET /metrics` (Prometheus format) | Section 10.2 |
| **REQ-FN-022** | Performance Testing and SLO Validation | Testing strategy, observability | Load tests (k6/Artillery), SLO dashboards | Section 7.2, 10.2 |
| **REQ-FN-023** | Authentication and Authorization Framework | AuthModule, JWT strategy | `JwtAuthGuard`, `ScopesGuard`, JWT validation | ADR-005, Section 9.1, 9.2 |
| **REQ-FN-024** | Input Validation and Rate Limiting | API Gateway Layer | `ValidationPipe` (class-validator), `RateLimitGuard` | Section 4.2, 9.3, 9.4 |

---

## Non-Functional Requirements Traceability

| Requirement ID | Title                                               | Architecture Mapping              | Components                                                      | ADR/Section                       |
| -------------- | --------------------------------------------------- | --------------------------------- | --------------------------------------------------------------- | --------------------------------- |
| **REQ-NF-001** | Core Data Source Scope (xAPI LRS)                   | Constraint, LRSClient             | `LRSClient` only queries xAPI endpoints                         | Section 2.3, 8.2                  |
| **REQ-NF-002** | Standalone Deployability                            | CoreModule (IMPLEMENTED) | `HealthController` with liveness and readiness endpoints — implemented at `src/core/health/health.controller.ts`; `RedisHealthIndicator` and `LrsHealthIndicator` — implemented at `src/core/health/indicators/`; Docker Compose with all dependencies | Section 5.1, 5.2, 10.3                  |
| **REQ-NF-003** | Metrics Traceability and Coverage Verification      | Validation tooling (future)       | CI checks for CSV-to-implementation sync                        | Section 4.2 (REQ-FN-003 note)     |
| **REQ-NF-004** | Determinism, Idempotency, and Result Consistency    | Computation logic design          | Stateless computation functions, pure logic                     | Section 6.1, 12.2                 |
| **REQ-NF-005** | Analytics Endpoint Performance (CSV Metrics)        | Caching, optimization             | `CacheService`, async processing, Redis                         | ADR-003, Section 6.1              |
| **REQ-NF-006** | Cache Performance and Hit Ratio Targets             | Cache strategy, monitoring        | Redis with TTL, hit ratio metrics                               | Section 8.1, 10.2                 |
| **REQ-NF-007** | Cache Consistency and Correctness                   | Cache invalidation, TTL           | Explicit invalidation API, TTL expiration                       | ADR-003, Section 4.3              |
| **REQ-NF-008** | API Documentation Completeness and Accuracy         | OpenAPI generation                | Swagger decorators, auto-generated docs                         | ADR-004, Section 10.1             |
| **REQ-NF-009** | Metric Development Velocity and Lead Time           | Extension architecture            | Plugin interface, clear onboarding                              | ADR-002, Section 11.1             |
| **REQ-NF-010** | Metric Isolation and Testability                    | Module design, DI                 | Each metric is isolated, mockable via DI                        | Section 7.2, 12.1                 |
| **REQ-NF-011** | Deployment Automation and Reliability               | CI/CD, Docker Compose             | GitHub Actions, health checks, rollback                         | Section 5.1, 7.2                  |
| **REQ-NF-012** | Deployment Rollback and Recovery                    | Versioned images, blue-green      | Tagged Docker images, Traefik rolling updates                   | Section 5.1 (Deployment Strategy) |
| **REQ-NF-013** | Multi-Instance Data Isolation and Consistency       | Shared cache, cache key design    | Redis shared cache with namespaced keys                         | Section 8.1, 5.4                  |
| **REQ-NF-014** | Architecture Documentation Currency and Maintenance | This document, review process     | Quarterly architecture reviews, PlantUML updates                | Section 17                        |
| **REQ-NF-015** | Developer Onboarding and Architecture Comprehension | Documentation structure, diagrams | `ARCHITECTURE.md`, PlantUML diagrams, code comments             | Section 1.3, 7.1                  |
| **REQ-NF-016** | Observability Baseline and Alert Guidance           | Logging, metrics, health checks   | `LoggerService`, `MetricsExporter`, health endpoints            | Section 10.1, 10.2, 10.3          |
| **REQ-NF-017** | Analytics Endpoint Latency SLO (Detailed)           | Performance design, caching       | Cache-first strategy, async processing, SLO monitoring          | Section 2.2, 10.2                 |
| **REQ-NF-018** | Graceful Degradation and Timeout Handling           | Error handling, circuit breaker   | Timeout configs, fallback responses, 503 on LRS failure         | Section 6.3, 13                   |
| **REQ-NF-019** | Security Baseline and Secure Defaults               | Security architecture             | TLS termination (Traefik), secrets management, input validation | Section 9.1-9.4, ADR-005          |
| **REQ-NF-020** | Security Testing and Compliance Validation          | CI security checks, test strategy | Secret scanning, vulnerability scans, authz tests               | Section 7.2, 9.4                  |

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

| Gap            | Description                      | Action Required                              |
| -------------- | -------------------------------- | -------------------------------------------- |
| **REQ-FN-011** | Metric contribution guide        | Create `docs/CONTRIBUTING.md` with templates |
| **REQ-NF-003** | CSV-to-implementation validation | Implement CI check script                    |
| **REQ-FN-022** | Performance testing setup        | Add k6/Artillery scripts, SLO dashboards     |
| **REQ-NF-018** | Circuit breaker pattern          | Implement circuit breaker for LRS client     |

---

## Approval & Maintenance

| Version | Date       | Author            | Changes                     |
| ------- | ---------- | ----------------- | --------------------------- |
| 0.1     | 2025-10-20 | Architecture Team | Initial traceability matrix |

**Next Review**: 2026-01-20 (Quarterly)  
**Maintained By**: Architecture Team  
**Tooling**: Manual updates; consider automation for CSV sync validation
