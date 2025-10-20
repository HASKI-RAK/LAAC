# Instructions

## Project Overview

LAAC (Learning Analytics Analyzing Center) is a NestJS-based intermediary system between a Learning Record Store (LRS) and Adaptive Learning Systems (ALS). We use TypeScript, NestJS, and Yarn as the package manager.

### Architecture

- **Framework**: NestJS modular monolith (see `docs/architecture/ARCHITECTURE.md`)
- **Key Modules**: CoreModule, AuthModule, MetricsModule, ComputationModule, DataAccessModule, AdminModule
- **Extension Point**: `IMetricComputation` interface for pluggable metric implementations (bachelor thesis integration)
- **Data Source**: Yetanalytics LRS (xAPI standard)
- **Deployment**: Docker Compose with Traefik, Redis cache, Portainer

## General Guidelines

- Follow **SOLID and CUPID principles** (REQ-FN-019, documented in `docs/architecture/ARCHITECTURE.md` Section 12).
- Do not change code that is not related to the issue you are working on.
- Use **dependency injection** for all services and providers (NestJS pattern).
- Write **pure, stateless functions** for metric computations (determinism requirement REQ-NF-004).
- Ensure all changes align with the requirements specified in `docs/SRS.md`.
- Maintain **traceability** by referencing the relevant REQ-\* ID in code comments, tests, and documentation.

## Workflow Integration

### 1. Requirement-Driven Development

- **`docs/SRS.md`** is the single source of truth for all requirements.
- **`docs/architecture/ARCHITECTURE.md`** defines the architectural realization of requirements.
- **`docs/architecture/traceability.md`** maps requirements to components.
- Ensure all implementation aligns with the SHALL/SHOULD/MAY modality defined in the SRS.

### 2. Traceability

- Reference the relevant **REQ-FN-_ or REQ-NF-_** ID in:
  - Code comments (e.g., `// Implements REQ-FN-003: Metrics catalog`)
  - Test descriptions (e.g., `describe('REQ-FN-003: MetricsRegistry')`)
  - Commit messages (e.g., `feat: implement metrics catalog (REQ-FN-003)`)
- Update `docs/architecture/traceability.md` when adding new components or modifying architecture.

### 3. Module Boundaries

- **MetricsModule**: Client-facing API, catalog, orchestration (REQ-FN-001, 003, 005)
- **ComputationModule**: Metric computation logic, extensible via `IMetricComputation` (REQ-FN-004, 010)
- **DataAccessModule**: Cache (Redis with `ICacheService`) and LRS client (xAPI with `ILRSClient`) (REQ-FN-002, 006, 007)
  - Includes timeout handling, retry logic, and circuit breaker pattern (future, ADR-007)
- **AuthModule**: JWT authentication, scope-based authorization, rate limiting (REQ-FN-023, 024)
- **CoreModule**: Logging (correlation IDs), CorrelationIdMiddleware, configuration, health checks (REQ-FN-020)
- **AdminModule**: Cache invalidation (pattern support), Prometheus metrics export (REQ-FN-007, 021)

### 4. Testing and Validation

- Write **unit tests** in `src/**/*.spec.ts` (co-located with implementation).
- Write **E2E tests** in `test/**/*.e2e-spec.ts`.
- Ensure all tests pass before marking a feature as complete:
  - `yarn run test` — Unit tests
  - `yarn run test:e2e` — End-to-end tests
  - `yarn run test:cov` — Coverage report (target: 80% per REQ-NF-020)
- Validate implementation against **acceptance criteria** in the SRS.
- Reference REQ-\* ID in test descriptions:
  ```typescript
  // REQ-FN-003: Metrics catalog discovery
  describe('MetricsController.getMetricsCatalog', () => {
    it('should return all registered metrics', async () => {
      // Test implementation
    });
  });
  ```

### 5. API Design

- Use **OpenAPI/Swagger decorators** (`@nestjs/swagger`) for all endpoints (REQ-FN-008, 009).
- Apply **DTO validation** with `class-validator` (REQ-FN-024).
- Follow **REST conventions** with API versioning:
  - `GET /api/v1/metrics` — List catalog
  - `GET /api/v1/metrics/:id` — Get metric details
  - `GET /api/v1/metrics/:id/results` — Compute/retrieve results
  - `POST /admin/cache/invalidate` — Cache invalidation (admin scope)
  - `GET /metrics` — Prometheus metrics export (root level, public for scraping)
- Use **authentication guards** (`JwtAuthGuard`) and **authorization guards** (`ScopesGuard`) (REQ-FN-023).
- Note: Prometheus `/metrics` endpoint is separate from catalog and publicly accessible.

### 6. Security

- **Never commit secrets** to the repository (enforced by pre-commit hooks).
- Use **environment variables** or Docker secrets for configuration (REQ-FN-014).
- Apply **input validation** to all DTOs with `class-validator` decorators (REQ-FN-024).
- Implement **rate limiting** for public endpoints (REQ-FN-024).
- Log **security events** (auth failures, authz denials) without PII (REQ-FN-020, REQ-NF-019).

### 7. Observability

- Use **structured logging** with correlation IDs via `LoggerService` (REQ-FN-020):
  ```typescript
  this.logger.log('Metric computed', { metricId, duration, correlationId });
  ```
- Use **CorrelationIdMiddleware** to inject/propagate `X-Correlation-ID` headers for request tracing.
- Export **Prometheus metrics** via `GET /metrics` endpoint (root level, public access) using `@willsoto/nestjs-prometheus` or `prom-client` (REQ-FN-021):
  - `http_request_duration_seconds` (histogram)
  - `cache_hit_ratio` (gauge)
  - `metric_computation_duration_seconds` (histogram, per metricId)
  - `lrs_query_duration_seconds` (histogram)
  - `auth_failures_total` (counter)
  - `rate_limit_rejections_total` (counter)
- Provide **health checks** at `/health/liveness` and `/health/readiness` (REQ-NF-016).

### 8. Extension Architecture (Bachelor Thesis Integration)

- All metrics implement the **`IMetricComputation` interface** (REQ-FN-010):
  ```typescript
  export interface IMetricComputation {
    id: string;
    dashboardLevel: 'course' | 'topic' | 'element';
    description: string;
    version?: string; // Optional: for metric definition evolution
    compute(
      params: MetricParams,
      lrsData: xAPIStatement[],
    ): Promise<MetricResult>;
    validateParams?(params: MetricParams): void; // Optional: validate before computation
  }
  ```
- Metrics must be **deterministic**: same inputs produce same outputs (REQ-NF-004).
- **Phase 1** (Quick Implementation): Register in `QuickMetricProvider`.
- **Phase 2+** (Bachelor Thesis): Register in `ThesisMetricProvider` (swappable).
- Use **NestJS providers** for registration and DI injection.

### 9. Caching Strategy

- Implement **cache-aside pattern** with Redis using `ICacheService` interface (REQ-FN-006):
  1. Check cache for result
  2. On miss: compute, store with TTL, return
  3. On hit: return cached result
- Use **structured cache keys** (REQ-NF-013):
  ```
  cache:{metricId}:{scope}:{filters}:{version}
  Example: cache:course-completion:course:123:v1
  ```
- Support **explicit invalidation** via admin API (REQ-FN-007):
  - Single key invalidation: `invalidate(key)`
  - Pattern-based invalidation: `invalidatePattern(pattern)` for bulk operations
- Redis shared across multiple LAAC instances for horizontal scaling (REQ-FN-017).

### 10. Documentation

- Update `docs/SRS.md` when requirements change.
- Update `docs/architecture/ARCHITECTURE.md` and PlantUML diagrams when architecture changes.
- Update `docs/architecture/traceability.md` when adding/modifying components.
- Use **JSDoc comments** for public APIs and interfaces.
- Document **TODOs** in README.md for missing configuration or features.

### 11. Coding Standards

- **TypeScript**: Strict mode enabled, avoid `any` types.
- **Naming Conventions**:
  - Controllers: `*Controller` (e.g., `MetricsController`)
  - Services: `*Service` (e.g., `MetricsService`)
  - Providers: `*Provider` (e.g., `QuickMetricProvider`)
  - Interfaces: `I*` prefix (e.g., `IMetricComputation`)
  - DTOs: `*Dto` suffix (e.g., `GetMetricResultsDto`)
- **Imports**: Use path aliases from `tsconfig.json` (e.g., `@core/logger`).
- **Formatting**: Use Prettier (configured in project).
- **Linting**: Use ESLint (run `yarn run lint`).

### 12. Deployment

- Use **Docker Compose** configurations (REQ-FN-013):
  - `docker-compose.dev.yml` — Development (single instance, local LRS)
  - `docker-compose.prod.yml` — Production (multi-instance, Traefik, Redis persistence)
- **CI/CD**: GitHub Actions workflows in `.github/workflows/` (REQ-FN-015).
- **Rollback**: Tagged Docker images for version rollback (REQ-NF-012).

## Success Criteria

- ✅ All changes are traceable to a requirement in `docs/SRS.md`.
- ✅ Tests are written and linked to the relevant REQ-\* ID.
- ✅ Test coverage meets 80% target (REQ-NF-020).
- ✅ Documentation is updated:
  - `docs/SRS.md` (if requirements change)
  - `docs/architecture/ARCHITECTURE.md` (if architecture changes)
  - `docs/architecture/traceability.md` (if components added/modified)
- ✅ Code adheres to NestJS conventions and SOLID/CUPID principles.
- ✅ Security controls applied (auth, validation, rate limiting, no secrets committed).
- ✅ Observability instrumented (logging, metrics, health checks).
- ✅ All Yarn scripts succeed:
  - `yarn install`
  - `yarn run start:dev`
  - `yarn run test`
  - `yarn run test:e2e`
  - `yarn run test:cov`

## Commands (Canonical)

```bash
# Setup
yarn install

# Development
yarn run start          # Start development server
yarn run start:dev      # Start with watch mode
yarn run start:debug    # Start with debugger
yarn run start:prod     # Start production build

# Testing
yarn run test           # Unit tests
yarn run test:watch     # Unit tests in watch mode
yarn run test:cov       # Unit tests with coverage
yarn run test:e2e       # End-to-end tests

# Code Quality
yarn run lint           # Run ESLint
yarn run format         # Run Prettier

# Build
yarn run build          # Compile TypeScript to dist/
```

## References

- **Architecture**: `docs/architecture/ARCHITECTURE.md`
- **Architecture Review**: `docs/architecture/ARCHITECTURE-REVIEW.md`
- **Corrections Applied**: `docs/architecture/CORRECTIONS-APPLIED.md`
- **Requirements**: `docs/SRS.md`
- **Stakeholder Needs**: `docs/StRS.md`
- **Traceability**: `docs/architecture/traceability.md`
- **Metrics Specification**: `docs/Metrics-Specification.md`
- **Agent Guidance**: `AGENTS.md`
- **Backend Instructions**: `.github/instructions/backend.instructions.md`
- **TypeScript Instructions**: `.github/instructions/typescript.instructions.md`

---

**Maintainer**: Architecture Team  
**Last Updated**: 2025-10-20  
**Review Cadence**: Quarterly or on major architectural changes
