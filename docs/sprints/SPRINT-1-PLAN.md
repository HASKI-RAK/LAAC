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

- [ ] All NestJS modules scaffolded per architecture (Section 4.2)
- [ ] JWT authentication working with scope-based authorization
- [ ] Structured logging with correlation IDs operational
- [ ] Swagger UI accessible with documented endpoints
- [ ] CI pipeline running tests and building Docker image
- [ ] Development environment fully documented and reproducible

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

### Epic 1: Project Foundation & Setup

**Priority**: Critical | **Story Points**: 8

#### Story 1.1: NestJS Project Scaffolding

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

#### Story 1.2: Environment Configuration Setup

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

#### Story 1.3: Structured Logging with Correlation IDs

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

#### Story 1.4: Health Check Endpoints

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

### Epic 2: Authentication & Authorization

**Priority**: Critical | **Story Points**: 13

#### Story 2.1: JWT Authentication Strategy

**Description**: Implement JWT validation and guard (REQ-FN-023, ADR-005)  
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

**Story Points**: 5 | **Assigned To**: TBD

---

#### Story 2.2: Scope-Based Authorization Guard

**Description**: Implement `ScopesGuard` for fine-grained access control (REQ-FN-023)  
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

**Story Points**: 3 | **Assigned To**: TBD

---

#### Story 2.3: Rate Limiting Guard

**Description**: Implement request rate limiting per client (REQ-FN-024)  
**Acceptance Criteria**:

- [ ] `RateLimitGuard` enforces configurable limits
- [ ] Default: 100 requests per minute per IP
- [ ] 429 response includes `Retry-After` header
- [ ] Rate limiting configurable via environment
- [ ] Uses Redis for distributed rate limiting (multi-instance support)
- [ ] E2E tests verify rate limiting behavior

**Tasks**:

- [ ] Install `@nestjs/throttler` or custom implementation with Redis
- [ ] Create `src/auth/guards/rate-limit.guard.ts`
- [ ] Configure ThrottlerModule with Redis storage
- [ ] Apply guard globally or per-controller
- [ ] Write e2e tests with request bursts

**Story Points**: 3 | **Assigned To**: TBD

---

#### Story 2.4: Input Validation Pipeline

**Description**: Set up DTO validation with class-validator (REQ-FN-024)  
**Acceptance Criteria**:

- [ ] Global `ValidationPipe` configured
- [ ] DTOs use class-validator decorators
- [ ] Validation errors return 400 with detailed messages
- [ ] Whitelist unknown properties (strip them out)
- [ ] Transform types automatically (e.g., string to Date)
- [ ] Example DTOs created for metrics endpoints

**Tasks**:

- [ ] Install `class-validator`, `class-transformer`
- [ ] Configure global ValidationPipe in `main.ts`
- [ ] Create base DTO classes in `src/common/dto/`
- [ ] Create example: `src/metrics/dto/metric-query.dto.ts`
- [ ] Write unit tests for DTO validation

**Example DTO**:

```typescript
export class MetricQueryDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsISO8601()
  start?: string;

  @IsOptional()
  @IsISO8601()
  end?: string;
}
```

**Story Points**: 2 | **Assigned To**: TBD

---

### Epic 3: Core API Endpoints & Documentation

**Priority**: High | **Story Points**: 8

#### Story 3.1: OpenAPI/Swagger Setup

**Description**: Configure Swagger with NestJS decorators (REQ-FN-008, REQ-FN-009, ADR-004)  
**Acceptance Criteria**:

- [ ] Swagger UI accessible at `/api/docs`
- [ ] OpenAPI spec generated from code decorators
- [ ] Bearer auth (JWT) configured in Swagger
- [ ] All endpoints documented with descriptions and examples
- [ ] DTO schemas auto-generated
- [ ] API versioned as `/api/v1`

**Tasks**:

- [ ] Install `@nestjs/swagger`
- [ ] Configure SwaggerModule in `main.ts`
- [ ] Add `@ApiTags()` to controllers
- [ ] Add `@ApiOperation()`, `@ApiResponse()` decorators
- [ ] Configure JWT bearer auth in Swagger
- [ ] Set global API prefix `/api/v1`

**Story Points**: 2 | **Assigned To**: TBD

---

#### Story 3.2: Metrics Catalog Endpoints (Skeleton)

**Description**: Create basic metrics catalog API (REQ-FN-003)  
**Acceptance Criteria**:

- [ ] `GET /api/v1/metrics` returns empty array (skeleton)
- [ ] `GET /api/v1/metrics/:id` returns 404 for now
- [ ] Endpoints protected with `@RequireScopes('analytics:read')`
- [ ] Swagger documentation complete
- [ ] Response DTOs defined
- [ ] E2E tests for endpoints

**Tasks**:

- [ ] Create `src/metrics/controllers/metrics.controller.ts`
- [ ] Create `src/metrics/services/metrics.service.ts`
- [ ] Create `src/metrics/dto/metric-catalog-response.dto.ts`
- [ ] Create `src/metrics/dto/metric-detail-response.dto.ts`
- [ ] Add Swagger decorators
- [ ] Write e2e tests

**Response Schema**:

```typescript
interface MetricCatalogResponse {
  id: string;
  dashboardLevel: 'course' | 'topic' | 'element';
  description: string;
  version?: string;
}
```

**Story Points**: 3 | **Assigned To**: TBD

---

#### Story 3.3: Admin Endpoints (Skeleton)

**Description**: Create cache and health admin endpoints (REQ-FN-007)  
**Acceptance Criteria**:

- [ ] `POST /admin/cache/invalidate` returns 200 (no-op for now)
- [ ] Protected with `@RequireScopes('admin:cache')`
- [ ] Request body validated with DTO
- [ ] Swagger documentation complete
- [ ] E2E tests verify authorization

**Tasks**:

- [ ] Create `src/admin/controllers/cache.controller.ts`
- [ ] Create `src/admin/dto/cache-invalidate.dto.ts`
- [ ] Add Swagger decorators
- [ ] Write e2e tests

**Story Points**: 2 | **Assigned To**: TBD

---

#### Story 3.4: Prometheus Metrics Endpoint

**Description**: Set up Prometheus metrics exporter (REQ-FN-021, Section 10.2)  
**Acceptance Criteria**:

- [ ] `GET /metrics` returns Prometheus format
- [ ] Endpoint is public (no authentication)
- [ ] Default metrics included (HTTP request duration, etc.)
- [ ] Custom metrics: `cache_hit_ratio`, `lrs_query_duration_seconds`
- [ ] E2E tests verify metric format

**Tasks**:

- [ ] Install `@willsoto/nestjs-prometheus` or `prom-client`
- [ ] Create `src/admin/exporters/metrics.exporter.ts`
- [ ] Configure PrometheusModule
- [ ] Add custom metric definitions
- [ ] Write e2e tests

**Story Points**: 1 | **Assigned To**: TBD

---

### Epic 4: CI/CD & Development Infrastructure

**Priority**: High | **Story Points**: 5

#### Story 4.1: GitHub Actions CI Pipeline

**Description**: Set up CI pipeline for testing and Docker builds (REQ-FN-015)  
**Acceptance Criteria**:

- [ ] `.github/workflows/ci.yml` runs on every push/PR
- [ ] Pipeline steps: lint → test → build
- [ ] Test coverage report generated
- [ ] Docker image built and tagged
- [ ] Pipeline passes with current code
- [ ] Badge added to README

**Tasks**:

- [ ] Create `.github/workflows/ci.yml`
- [ ] Configure Node.js matrix (Node 22)
- [ ] Add steps: install, lint, test, coverage
- [ ] Add Docker build step
- [ ] Configure GitHub Container Registry
- [ ] Add status badge to README

**Pipeline Steps**:

1. Checkout code
2. Setup Node.js 22
3. Install dependencies (`yarn install`)
4. Lint (`yarn lint`)
5. Test (`yarn test:cov`)
6. Build (`yarn build`)
7. Build Docker image
8. Push image to registry (on main branch)

**Story Points**: 3 | **Assigned To**: TBD

---

#### Story 4.2: Docker Compose Dev Environment

**Description**: Create development Docker Compose setup (REQ-FN-013)  
**Acceptance Criteria**:

- [ ] `docker-compose.dev.yml` starts all services
- [ ] Services: LAAC app, Redis, LRS (mock or Yetanalytics)
- [ ] Hot reload enabled for development
- [ ] Environment variables loaded from `.env`
- [ ] Documentation in README for setup
- [ ] Health checks configured

**Tasks**:

- [ ] Create `docker-compose.dev.yml`
- [ ] Create `Dockerfile.dev` with hot reload
- [ ] Configure Redis service
- [ ] Add mock LRS service or Yetanalytics container
- [ ] Update README with setup instructions

**Story Points**: 2 | **Assigned To**: TBD

---

### Epic 5: Testing Foundation

**Priority**: Medium | **Story Points**: 3

#### Story 5.1: Unit Test Setup & Examples

**Description**: Ensure Jest configuration and create test examples  
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

#### Story 5.2: E2E Test Setup

**Description**: Configure E2E tests with test database/cache  
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
