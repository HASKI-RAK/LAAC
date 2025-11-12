# Sprint 1 Planning

**LAAC System — Foundation & Core Infrastructure**

**Sprint Duration**: 2 weeks  
**Sprint Goal**: Establish foundational architecture, core modules, and basic API structure  
**Team Capacity**: [Copilot: Developer, theUpsider alias fischerd: Architect & Team Lead]  
**Branch**: `sprint-1-planning` → merge to `main` after completion

---

## Sprint Objectives

### Primary Goals

1. ✅ Set up NestJS project structure with all core modules
2. ✅ Implement authentication and authorization framework
3. ✅ Establish logging, configuration, and observability baseline
4. ✅ Create basic API endpoints with OpenAPI documentation
5. ✅ Set up CI/CD pipeline with automated testing

### Success Criteria

- [x] All NestJS modules scaffolded per architecture (Section 4.2) — story #3
- [x] JWT authentication working with scope-based authorization — story #19 (2.1, 2.2)
- [x] Structured logging with correlation IDs operational — story #8
- [ ] Swagger UI accessible with documented endpoints
- [ ] CI pipeline running tests and building Docker image
- [x] Development environment configuration and secrets management implemented — story #10
- [x] Health endpoints implemented (liveness/readiness) — story #12 (readiness reports dependency status)
- [ ] Rate limiting implemented — story #23 (2.3) — NOT STARTED
- [ ] Input validation pipeline configured — story #22 (2.4) — NOT STARTED
- [x] Metrics catalog endpoints implemented — story #25 (3.2) — COMPLETED
- [x] Admin cache invalidation endpoints implemented — story #26 (3.3) — COMPLETED
- [x] Prometheus metrics endpoint implemented — story #27 (3.4) — COMPLETED
- [x] Swagger UI setup and endpoint documentation — story #31 (3.1) — **COMPLETED** (2025-11-11, PR #37 merged)
- [x] Rate limiting guard implementation — story #32 (2.3) — **COMPLETED** (2025-11-11, PR #39 merged)
- [x] Input validation pipeline — story #33 (2.4) — **COMPLETED** (2025-11-11, PR #36 merged)
- [x] GitHub Actions CI/CD pipeline — story #34 (4.1) — **COMPLETED** (2025-11-11, PR #40 merged)
- [x] Docker Compose dev/prod configs — story #35 (4.2) — **COMPLETED** (2025-11-11, PR #38 merged)

Note: Issue #6 (Environment Configuration Setup) was consolidated into #10. #6 has been closed as duplicate to avoid fragmentation.

**Current Sprint Wave Status** (2025-11-12):

- Wave 1 (Completed): 3 skeleton endpoints (Stories 3.2, 3.3, 3.4) — 6 pts ✅ MERGED
- Wave 2 (Completed): 5 stories in 3 parallelization groups — 12 pts ✅ ALL MERGED
  - Group A: Story 3.1 (Swagger setup) — COMPLETED 2025-11-11, PR #37
  - Group B: Stories 2.3 + 2.4 (rate limiting + validation) — COMPLETED 2025-11-11, PRs #39 & #36
  - Group C: Stories 4.1 + 4.2 (CI/CD + Docker) — COMPLETED 2025-11-11, PRs #40 & #38

**Current Sprint Progress**: 18/37 story points completed (49%)

---

## Wave 3 Ready for Implementation (2025-11-12)

- [ ] Unit test setup and examples — story #41 (5.1) — **ASSIGNED TO COPILOT** (2025-11-12)
- [ ] E2E test configuration — story #42 (5.2) — **ASSIGNED TO COPILOT** (2025-11-12)

Wave 3 (Testing Foundation): 3 story points total

- Story 5.1 (Unit Tests): 1 pt
- Story 5.2 (E2E Tests): 2 pts

---

## Architecture Reference

**Key Documents**:

- Architecture: `docs/architecture/ARCHITECTURE.md`
- Traceability: `docs/architecture/traceability.md`
- Requirements: `docs/SRS.md`

**Module Structure** (from Section 7.1):

```
src/
├── core/           # CoreModule - shared infrastructure
├── auth/           # AuthModule - security
├── metrics/        # MetricsModule - business logic
├── computation/    # ComputationModule - extensible layer
├── data-access/    # DataAccessModule - external systems
└── admin/          # AdminModule - operational APIs
```

---

## Sprint Backlog

**Note**: All stories are tracked as GitHub issues for traceability. Links are provided where issues have been created.

### Epic 1: Project Foundation & Setup ([#14](https://github.com/HASKI-RAK/LAAC/issues/14))

**Priority**: Critical | **Story Points**: 8

Related GitHub issues (grouped under Epic #14):

- [#3] Sprint 1 - Story 1.1: NestJS Project Scaffolding
- [#6] Sprint 1 - Story 1.2: Environment Configuration Setup (duplicate of #10)
- [#8] Implement REQ-FN-020: Structured Logging with Correlation IDs
- [#10] Implement REQ-FN-014: Secrets and Configuration Management
- [#12] Implement REQ-NF-002: Health/Readiness Endpoints

#### Story 1.1: NestJS Project Scaffolding ([#3](https://github.com/HASKI-RAK/LAAC/issues/3)) ✅

**Description**: Set up NestJS project with TypeScript, ESLint, Prettier  
**Acceptance Criteria**:

- [ ] NestJS CLI project initialized (already done, verify configuration)
- [ ] All module directories created per architecture (Section 7.1)
- [ ] Barrel exports (`index.ts`) in each module for clean imports
- [ ] TypeScript strict mode enabled
- [ ] ESLint + Prettier configured and working
- [ ] Git pre-commit hooks set up (lint, format, tests)

**Tasks**:

- [ ] Verify existing `package.json` dependencies
- [ ] Create module directory structure
- [ ] Configure `tsconfig.json` for strict mode
- [ ] Set up Husky for pre-commit hooks
- [ ] Create `.editorconfig` for consistent formatting

**Files to Create/Modify**:

- `src/core/index.ts`, `src/auth/index.ts`, etc.
- `.husky/pre-commit`
- `.editorconfig`

**Story Points**: 2 | **Assigned To**: TBD

---

#### Story 1.2: Environment Configuration Setup ([#10](https://github.com/HASKI-RAK/LAAC/issues/10)) ✅

**Description**: Implement `ConfigService` with environment variable loading (REQ-FN-014)  
**Acceptance Criteria**:

- [ ] `.env.example` file documents all required variables
- [ ] `ConfigService` loads variables with validation
- [ ] `.env` files ignored by Git
- [ ] Configuration typed with TypeScript interfaces
- [ ] Startup logs show loaded configuration (non-sensitive)

**Tasks**:

- [ ] Install `@nestjs/config` and `joi` for validation
- [ ] Create `src/core/config/config.service.ts`
- [ ] Create `src/core/config/config.schema.ts` (Joi schema)
- [ ] Create `.env.example` with all variables
- [ ] Update `.gitignore` to exclude `.env*` files

**Environment Variables** (initial set):

```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=1h

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# LRS Connection
LRS_URL=http://localhost:8080
LRS_API_KEY=

# Logging
LOG_LEVEL=debug
```

**Story Points**: 2 | **Assigned To**: TBD

---

#### Story 1.3: Structured Logging with Correlation IDs ([#8](https://github.com/HASKI-RAK/LAAC/issues/8)) ✅

**Description**: Implement `LoggerService` with Winston and correlation ID middleware (REQ-FN-020, ADR-006)  
**Acceptance Criteria**:

- [ ] Winston logger configured with JSON format
- [ ] Correlation ID middleware injects `X-Correlation-ID`
- [ ] Logger integrated into NestJS dependency injection
- [ ] Log levels configurable via environment variable
- [ ] No PII or secrets in logs
- [ ] Test coverage for logger utility functions

**Tasks**:

- [ ] Install `winston`, `nest-winston`, `cls-hooked`
- [ ] Create `src/core/logger/logger.service.ts`
- [ ] Create `src/core/middleware/correlation-id.middleware.ts`
- [ ] Configure global logger in `main.ts`
- [ ] Create logger decorator for controller/service logging
- [ ] Write unit tests for correlation ID propagation

**Story Points**: 3 | **Assigned To**: TBD

---

#### Story 1.4: Health Check Endpoints ([#12](https://github.com/HASKI-RAK/LAAC/issues/12)) ✅

**Description**: Implement liveness and readiness probes (Section 10.3)  
**Acceptance Criteria**:

- [ ] `GET /health/liveness` returns 200 if app is running
- [ ] `GET /health/readiness` returns 200 if Redis and LRS reachable
- [ ] Endpoints are public (no authentication required)
- [ ] Responses include timestamps and service version
- [ ] E2E tests verify health check behavior

**Tasks**:

- [ ] Install `@nestjs/terminus`
- [ ] Create `src/core/health/health.controller.ts`
- [ ] Implement Redis health indicator
- [ ] Implement LRS health indicator (HTTP ping)
- [ ] Write e2e tests for health endpoints

**Story Points**: 1 | **Assigned To**: TBD

---

### Epic 2: Authentication & Authorization ([#15](https://github.com/HASKI-RAK/LAAC/issues/15))

**Priority**: Critical | **Story Points**: 13

**Progress**: 8/13 points complete (Stories 2.1, 2.2 ✅ | Stories 2.3, 2.4 pending)

#### Story 2.1: JWT Authentication Strategy ✅ ([#19](https://github.com/HASKI-RAK/LAAC/issues/19))

**Description**: Implement JWT validation and guard (REQ-FN-023, ADR-005)  
**Status**: COMPLETED (2025-10-21) — Implemented together with Story 2.2  
**Acceptance Criteria**:

- [ ] `JwtAuthGuard` validates JWT tokens
- [ ] JWT secret loaded from environment
- [ ] Expired/invalid tokens return 401 with appropriate error
- [ ] Token payload includes user ID and scopes
- [ ] Global guard applied to all routes except public endpoints
- [ ] Unit tests for JWT strategy

**Tasks**:

- [ ] Install `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`
- [ ] Create `src/auth/strategies/jwt.strategy.ts`
- [ ] Create `src/auth/guards/jwt-auth.guard.ts`
- [ ] Configure JWT module in `AuthModule`
- [ ] Create `src/auth/decorators/public.decorator.ts` for public routes
- [ ] Write unit and integration tests

**JWT Payload Structure**:

```typescript
interface JwtPayload {
  sub: string; // user ID
  email?: string;
  scopes: string[]; // e.g., ['analytics:read', 'admin:cache']
  iat: number;
  exp: number;
}
```

**Story Points**: 5 | **Assigned To**: theUpsider, Copilot | **Completed**: 2025-10-21

---

#### Story 2.2: Scope-Based Authorization Guard ✅ ([#19](https://github.com/HASKI-RAK/LAAC/issues/19))

**Description**: Implement `ScopesGuard` for fine-grained access control (REQ-FN-023)  
**Status**: COMPLETED (2025-10-21) — Implemented together with Story 2.1  
**Acceptance Criteria**:

- [ ] `@RequireScopes()` decorator defines required scopes
- [ ] `ScopesGuard` checks user scopes against required scopes
- [ ] Missing scopes return 403 with explanatory message
- [ ] Admin scopes: `admin:cache`, `admin:config`
- [ ] User scopes: `analytics:read`
- [ ] Unit tests for various scope combinations

**Tasks**:

- [ ] Create `src/auth/guards/scopes.guard.ts`
- [ ] Create `src/auth/decorators/require-scopes.decorator.ts`
- [ ] Create `src/auth/decorators/current-user.decorator.ts`
- [ ] Integrate with JWT strategy to extract scopes
- [ ] Document scope definitions in `docs/security.md` (new file)
- [ ] Write unit tests

**Scope Definitions**:
| Scope | Permissions |
|-------|-------------|
| `analytics:read` | Access metrics catalog and results |
| `admin:cache` | Invalidate cache keys |
| `admin:config` | Modify instance configuration |

**Story Points**: 3 | **Assigned To**: theUpsider, Copilot | **Completed**: 2025-10-21

---

#### Story 2.3: Rate Limiting Guard ([#32](https://github.com/HASKI-RAK/LAAC/issues/32)) ✅

**Description**: Implement request rate limiting per client (REQ-FN-024 Part 1)  
**Status**: COMPLETED 2025-11-11 — PR #39 merged  
**Note**: REQ-FN-024 split into two stories (2.3 rate limiting, 2.4 input validation)  
**Acceptance Criteria**:

- [x] `ThrottlerGuard` with Redis backend enforces configurable limits
- [x] Default: 100 requests per minute per IP
- [x] 429 response includes `Retry-After` header
- [x] Rate limiting configurable via environment variables
- [x] Uses Redis for distributed rate limiting (multi-instance support)
- [x] E2E tests verify rate limiting behavior and headers
- [x] Graceful Redis connection lifecycle management
- [x] Health and metrics endpoints bypass rate limiting

**Tasks** (completed):

- [x] Install `@nestjs/throttler` and `@nest-lab/throttler-storage-redis`
- [x] Create `src/core/services/throttler-redis.service.ts` for Redis lifecycle management
- [x] Create `src/core/guards/custom-throttler.guard.ts` with correlation ID logging
- [x] Configure ThrottlerModule with Redis storage in AppModule
- [x] Apply guard globally via APP_GUARD provider
- [x] Implement Prometheus counter `rate_limit_rejections_total`
- [x] Write comprehensive E2E tests (burst testing, header validation, endpoint bypass)
- [x] Update `.env.example` with rate limit configuration

**Implementation Details**:

- **ThrottlerModule**: Redis-backed storage for distributed rate limiting
- **CustomThrottlerGuard**: Extends base guard with logging and metrics
- **Lifecycle Management**: Proper Redis client cleanup on app shutdown (REQ-NF-016)
- **Endpoint Bypass**: Health and metrics endpoints decorated with @SkipThrottle()

**Story Points**: 3 | **Assigned To**: Copilot | **Completed**: 2025-11-11
**PR**: [#39](https://github.com/HASKI-RAK/LAAC/pull/39) — Redis-backed rate limiting with proper lifecycle management and observability

---

#### Story 2.4: Input Validation Pipeline ([#33](https://github.com/HASKI-RAK/LAAC/issues/33)) ✅

**Description**: Set up DTO validation with class-validator (REQ-FN-024 Part 2)  
**Status**: COMPLETED 2025-11-11 — PR #36 merged  
**Note**: REQ-FN-024 split into two stories (2.3 rate limiting, 2.4 input validation)  
**Acceptance Criteria**:

- [x] Global `ValidationPipe` configured with whitelist and transform
- [x] DTOs use class-validator decorators
- [x] Validation errors return 400 with detailed field-level messages
- [x] Whitelist unknown properties (strip them from requests)
- [x] Type transformation configured (string → number, boolean, Date)
- [x] Example DTOs created and documented
- [x] Security validation prevents injection attacks

**Tasks** (completed):

- [x] Install `class-validator`, `class-transformer`
- [x] Configure global ValidationPipe in `main.ts` with whitelist and transform options
- [x] Create base validation decorators and error filter
- [x] Apply decorators to all existing DTOs
- [x] Create example: `src/metrics/dto/get-metrics-results.dto.ts`
- [x] Write unit tests for DTO validation rules
- [x] Write E2E tests for validation error responses and type transformation
- [x] Implement custom validation filter for consistent error format

**Implementation Details**:

- **ValidationPipe Settings**: `whitelist: true`, `transform: true`, `enableImplicitConversion: true`
- **Error Format**: HTTP 400 with descriptive field-level validation messages
- **Type Transformation**: Automatic casting of query params and request body fields
- **Security**: Unknown properties stripped, injection attempts handled gracefully

**Example DTO** (implemented):

```typescript
export class GetMetricsResultsDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsISO8601()
  start?: string;

  @IsOptional()
  @IsISO8601()
  end?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
```

**Story Points**: 2 | **Assigned To**: Copilot | **Completed**: 2025-11-11
**PR**: [#36](https://github.com/HASKI-RAK/LAAC/pull/36) — Global validation pipeline with comprehensive DTO decoration

---

### Epic 3: Core API Endpoints & Documentation ([#16](https://github.com/HASKI-RAK/LAAC/issues/16))

**Priority**: High | **Story Points**: 8

#### Story 3.1: OpenAPI/Swagger Setup ([#31](https://github.com/HASKI-RAK/LAAC/issues/31)) ✅

**Description**: Configure Swagger with NestJS decorators (REQ-FN-008, REQ-FN-009, ADR-004)  
**Status**: COMPLETED 2025-11-11 — PR #37 merged  
**Acceptance Criteria**:

- [x] Swagger UI accessible at `/api/docs`
- [x] OpenAPI spec generated from code decorators
- [x] Bearer auth (JWT) configured in Swagger
- [x] All endpoints documented with descriptions and examples
- [x] DTO schemas auto-generated
- [x] API versioned as `/api/v1`

**Tasks** (completed):

- [x] Install `@nestjs/swagger`
- [x] Configure SwaggerModule in `main.ts`
- [x] Add `@ApiTags()` to controllers
- [x] Add `@ApiOperation()`, `@ApiResponse()` decorators
- [x] Configure JWT bearer auth in Swagger
- [x] Set global API prefix `/api/v1`

**Story Points**: 2 | **Assigned To**: Copilot | **Completed**: 2025-11-11
**PR**: [#37](https://github.com/HASKI-RAK/LAAC/pull/37) — Swagger configuration and endpoint decoration

---

#### Story 3.2: Metrics Catalog Endpoints (Skeleton) ✅

**Description**: Create basic metrics catalog API (REQ-FN-003)  
**Status**: COMPLETED (2025-11-11) — PR #29 merged with MetricsController, MetricsService, DTOs, and E2E tests

**Acceptance Criteria**:

- [x] `GET /api/v1/metrics` returns empty array (skeleton)
- [x] `GET /api/v1/metrics/:id` returns 404 for now
- [x] Endpoints protected with `@RequireScopes('analytics:read')`
- [x] Swagger documentation complete
- [x] Response DTOs defined
- [x] E2E tests for endpoints

**Tasks** (completed):

- [x] Create `src/metrics/controllers/metrics.controller.ts` — MetricsController with `/api/v1/metrics` routes
- [x] Create `src/metrics/services/metrics.service.ts` — MetricsService with getCatalog() and getMetricById() methods
- [x] Create `src/metrics/dto/metric-catalog-response.dto.ts` — MetricCatalogItemDto and MetricsCatalogResponseDto
- [x] Create `src/metrics/dto/metric-detail-response.dto.ts` — MetricDetailResponseDto (same schema as catalog item)
- [x] Add Swagger decorators — @ApiTags, @ApiOperation, @ApiResponse with schemas
- [x] Write e2e tests — Authorization enforcement and endpoint structure validation

**Response Schema** (implemented):

```typescript
interface MetricCatalogResponse {
  id: string;
  dashboardLevel: 'course' | 'topic' | 'element';
  description: string;
  version?: string;
}
```

**Story Points**: 3 | **Assigned To**: Copilot | **Completed**: 2025-11-11

**PR**: [#29](https://github.com/HASKI-RAK/LAAC/pull/29) — Implementation with authorization guards and OpenAPI integration

---

#### Story 3.3: Admin Endpoints (Skeleton)

**Description**: Create cache and health admin endpoints (REQ-FN-007)  
**Status**: COMPLETED (2025-11-11) — PR #28 merged with CacheController, CacheInvalidateDto, and E2E tests

**Acceptance Criteria**:

- [x] `POST /admin/cache/invalidate` returns 200 (no-op for now)
- [x] Protected with `@RequireScopes('admin:cache')`
- [x] Request body validated with DTO
- [x] Swagger documentation complete
- [x] E2E tests verify authorization

**Tasks** (completed):

- [x] Create `src/admin/controllers/cache.controller.ts` — CacheController for POST /admin/cache/invalidate
- [x] Create `src/admin/dto/cache-invalidate.dto.ts` — CacheInvalidateDto with validation decorators
- [x] Add Swagger decorators — @ApiTags, @ApiOperation, @ApiResponse
- [x] Write e2e tests — Authorization enforcement and validation error handling

**Story Points**: 2 | **Assigned To**: Copilot | **Completed**: 2025-11-11

**PR**: [#28](https://github.com/HASKI-RAK/LAAC/pull/28) — Implementation with DTO validation and scope enforcement

---

#### Story 3.4: Prometheus Metrics Endpoint

**Description**: Set up Prometheus metrics exporter (REQ-FN-021, Section 10.2)  
**Status**: COMPLETED (2025-11-11) — PR #30 merged with MetricsPrometheusController, MetricsRegistryService, and comprehensive metrics

**Acceptance Criteria**:

- [x] `GET /metrics` returns Prometheus format
- [x] Endpoint is public (no authentication)
- [x] Default metrics included (HTTP request duration, etc.)
- [x] Custom metrics: `cache_hit_ratio`, `lrs_query_duration_seconds`
- [x] E2E tests verify metric format

**Tasks** (completed):

- [x] Install `prom-client` library
- [x] Create `src/admin/controllers/metrics-prometheus.controller.ts` — MetricsPrometheusController with @Public() decorator
- [x] Create `src/admin/services/metrics-registry.service.ts` — MetricsRegistryService for typed metric recording
- [x] Configure PrometheusModule in AdminModule
- [x] Register default + custom metrics (cache_hits_total, cache_misses_total, metric_computation_duration_seconds)
- [x] Write e2e tests — Public access verification and format validation

**Metrics Registered** (implemented):

**Default**: Node.js process metrics (CPU, memory, event loop lag)

**Custom Application Metrics**:

- `cache_hits_total{metricId}` — Counter for cache hits
- `cache_misses_total{metricId}` — Counter for cache misses
- `metric_computation_duration_seconds{metricId}` — Histogram (buckets: 0.1-10s)
- `lrs_query_duration_seconds` — Histogram (buckets: 0.1-10s)

**Story Points**: 1 | **Assigned To**: Copilot | **Completed**: 2025-11-11

**PR**: [#30](https://github.com/HASKI-RAK/LAAC/pull/30) — Comprehensive metrics implementation with cardinality warnings and public endpoint

---

### Epic 4: CI/CD & Development Infrastructure ([#17](https://github.com/HASKI-RAK/LAAC/issues/17))

**Priority**: High | **Story Points**: 5

#### Story 4.1: GitHub Actions CI/CD Pipeline ([#34](https://github.com/HASKI-RAK/LAAC/issues/34)) ✅

**Description**: Set up CI/CD pipeline for testing and Docker builds (REQ-FN-015)  
**Status**: COMPLETED 2025-11-11 — PR #40 merged  
**Acceptance Criteria**:

- [x] `.github/workflows/ci-cd.yml` runs on every push/PR
- [x] Pipeline steps: lint → test → build → push → deploy
- [x] Test coverage report generated and uploaded
- [x] Docker image built and tagged
- [x] Pipeline passes with current code
- [x] Badge added to README
- [x] Portainer webhook integration for deployment

**Tasks** (completed):

- [x] Create `.github/workflows/ci-cd.yml` (247 lines)
- [x] Configure Node.js matrix (Node 22 LTS)
- [x] Add steps: install, lint, test, coverage, build
- [x] Add Docker build step with multi-architecture support
- [x] Configure GitHub Container Registry (GHCR)
- [x] Add status badge to README
- [x] Implement Portainer webhook trigger with safe JSON payload
- [x] Apply code review improvements (DRY, webhook validation, error handling)

**Pipeline Stages**:

1. **Test Job**: ESLint, unit tests, E2E tests, coverage, TypeScript compilation
2. **Build-Push Job**: Docker build (linux/amd64, linux/arm64), GHCR push, attestation
3. **Deploy Job**: Portainer webhook trigger with image metadata

**Story Points**: 3 | **Assigned To**: Copilot | **Completed**: 2025-11-11
**PR**: [#40](https://github.com/HASKI-RAK/LAAC/pull/40) — Comprehensive CI/CD pipeline with test gates and safe deployment

---

#### Story 4.2: Docker Compose Dev/Prod Setup ([#35](https://github.com/HASKI-RAK/LAAC/issues/35)) ✅

**Description**: Create Docker Compose configurations for dev and production (REQ-FN-013)  
**Status**: COMPLETED 2025-11-11 — PR #38 merged  
**Acceptance Criteria**:

- [x] `docker-compose.dev.yml` for development with hot reload
- [x] `docker-compose.yml` for production with Traefik integration
- [x] Services: LAAC app, Redis, health checks
- [x] Hot reload enabled for development via bind mounts
- [x] Production environment uses registry images (from CI/CD)
- [x] Traefik labels for reverse proxy integration
- [x] Health checks configured with liveness probes
- [x] Documentation in README for both environments

**Tasks** (completed):

- [x] Create `docker-compose.dev.yml` with hot reload via bind mount
- [x] Create `docker-compose.yml` with Traefik labels and health checks
- [x] Configure Redis service with persistence (RDB in dev, AOF in prod)
- [x] Implement Node.js-based health checks (Alpine compatible)
- [x] Update `.env.example` with Docker and Traefik variables
- [x] Update README with comprehensive setup instructions
- [x] Apply code review improvements (health check compatibility, documentation clarity)

**Compose Features**:

- **Dev Environment**: Build context, bind mounts, port exposure, in-memory Redis option
- **Prod Environment**: Registry image, Traefik reverse proxy labels, auto-restart, health monitoring
- **Networking**: Internal laac_network for service communication, external traefik_web for routing
- **Persistence**: Redis volumes with appropriate strategies (dev: RDB, prod: AOF)

**Story Points**: 2 | **Assigned To**: Copilot | **Completed**: 2025-11-11
**PR**: [#38](https://github.com/HASKI-RAK/LAAC/pull/38) — Complete Docker Compose setup with Traefik integration and health checks

---

### Epic 5: Testing Foundation ([#18](https://github.com/HASKI-RAK/LAAC/issues/18))

**Priority**: Medium | **Story Points**: 3

#### Story 5.1: Unit Test Setup & Examples ([#41](https://github.com/HASKI-RAK/LAAC/issues/41))

**Description**: Ensure Jest configuration and create test examples  
**Status**: Issue created 2025-11-12 — Ready for implementation  
**Acceptance Criteria**:

- [ ] Jest configured with TypeScript support (already done)
- [ ] Test coverage reports working
- [ ] Example unit tests for each module
- [ ] Mocking patterns documented
- [ ] Coverage target: 80% (REQ-NF-020)

**Tasks**:

- [ ] Verify `jest.config.js` settings
- [ ] Create test utilities in `src/common/testing/`
- [ ] Write example tests for LoggerService, ConfigService
- [ ] Document testing patterns in `docs/TESTING.md` (new)

**Story Points**: 1 | **Assigned To**: TBD

---

#### Story 5.2: E2E Test Setup ([#42](https://github.com/HASKI-RAK/LAAC/issues/42))

**Description**: Configure E2E tests with test database/cache  
**Status**: Issue created 2025-11-12 — Ready for implementation  
**Acceptance Criteria**:

- [ ] E2E tests run against real NestJS app
- [ ] Test Redis instance started before tests
- [ ] Authentication mocked or test tokens generated
- [ ] Example E2E test for health endpoints
- [ ] E2E tests run in CI pipeline

**Tasks**:

- [ ] Verify `test/jest-e2e.json` configuration
- [ ] Create test helpers in `test/helpers/`
- [ ] Create mock JWT token generator
- [ ] Write E2E tests for health endpoints
- [ ] Add E2E step to CI pipeline

**Story Points**: 2 | **Assigned To**: TBD

---

## Technical Debt & Future Considerations

### Items Deferred to Sprint 2+

- Redis integration (cache service implementation)
- LRS client implementation with real xAPI queries
- Metric computation logic (QuickMetricProvider)
- Circuit breaker pattern for LRS client (ADR-007)
- Sequence diagrams (BP-1 from architecture review)
- Data model documentation (BP-2)

### Dependencies to Track

- External LRS availability (Yetanalytics)
- Identity provider for JWT issuing (Keycloak/Auth0)
- Redis instance for dev/staging environments

---

## Definition of Done (DoD)

For each story to be considered complete:

- [ ] Code implemented per acceptance criteria
- [ ] Unit tests written with >80% coverage
- [ ] E2E tests written for endpoints
- [ ] Code reviewed and approved
- [ ] Swagger documentation updated
- [ ] No linting errors
- [ ] CI pipeline passes
- [ ] Merged to `sprint-1-planning` branch

---

## Sprint Ceremonies

### Sprint Planning (Day 1)

- Review architecture and requirements
- Estimate story points
- Assign stories to team members
- Commit to sprint goal

### Daily Standups (Daily)

- What did I complete yesterday?
- What will I work on today?
- Any blockers?

### Sprint Review (Day 10)

- Demo completed stories
- Review sprint goal achievement
- Gather stakeholder feedback

### Sprint Retrospective (Day 10)

- What went well?
- What could be improved?
- Action items for next sprint

---

## Risks & Mitigation

| Risk                                           | Impact | Probability | Mitigation                          |
| ---------------------------------------------- | ------ | ----------- | ----------------------------------- |
| JWT strategy unclear without identity provider | High   | Medium      | Use mock JWT tokens for development |
| Redis not available locally                    | Medium | Low         | Use in-memory cache fallback        |
| Team capacity lower than estimated             | High   | Medium      | Prioritize Epic 1 and Epic 2        |
| LRS integration complexity                     | Medium | Medium      | Defer to Sprint 2, use mock for now |

---

## Sprint Metrics

### Velocity Tracking

- Total Story Points: 37
- Estimated Velocity: 20-25 points per sprint (to be calibrated)
- Stretch Goal: Complete all 37 points

### Burndown Chart

Track daily progress in sprint board

### Quality Metrics

- Test Coverage: Target 80%
- Code Review Time: <24 hours
- Bug Count: <5 per sprint

---

## Resources

### Development Setup

- Node.js 22 LTS
- Yarn 1.22+
- Docker & Docker Compose
- IDE: VS Code (recommended with ESLint/Prettier extensions)

### Documentation

- [ARCHITECTURE.md](./architecture/ARCHITECTURE.md)
- [SRS.md](./SRS.md)
- [README.md](../README.md)

### Tools

- GitHub Projects for sprint board
- GitHub Actions for CI/CD
- Swagger UI for API documentation

---

## Sign-Off

**Product Owner**: TBD  
**Scrum Master**: TBD  
**Development Team**: TBD

**Sprint Start Date**: TBD  
**Sprint End Date**: TBD (2 weeks)

---

**Next Sprint Preview**: Sprint 2 will focus on Redis integration, LRS client, and basic metric computation.
