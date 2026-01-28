## Project Overview

NestJS-based intermediary between Learning Record Store (LRS) and Adaptive Learning Systems. Stack: TypeScript, NestJS, Yarn, Docker, Redis, Yetanalytics LRS (xAPI).

## Core Principles

- Follow **SOLID/CUPID** (REQ-FN-019)
- **Traceability**: Reference REQ-\* IDs in code comments, tests, commits
- **Stateless functions** for metric computations (REQ-FN-004)
- **Dependency injection** for all services
- Only modify code related to your issue

## Architecture

### Key Modules

- **MetricsModule**: API, catalog, orchestration, instances endpoint (REQ-FN-001, 003, 005, 017)
  - `MetricsController`: Catalog and results endpoints
  - `InstancesController`: LRS instance metadata (REQ-FN-017)
  - `MetricsService`: Catalog management
  - `ComputationService`: Orchestration and cache-aside pattern
  - `InstancesService`: Instance health and metadata
- **ComputationModule**: Metric logic via `IMetricComputation` (REQ-FN-004, 010)
  - Providers: `CourseCompletionProvider`, `TopicMasteryProvider`, `LearningEngagementProvider`
  - Each provider implements `IMetricComputation` interface
- **DataAccessModule**: Redis (`ICacheService`) + LRS (`ILRSClient`) (REQ-FN-002, 006, 007)
  - `CacheService`: Redis cache implementation
  - `LRSClient`: xAPI statement retrieval with circuit breaker protection
- **AuthModule**: JWT auth, scope authorization (REQ-FN-023)
  - `JwtAuthGuard`: JWT token validation
  - `ScopesGuard`: Scope-based authorization
  - `JwtStrategy`: Passport JWT strategy
  - `@Public()` and `@RequireScopes()` decorators
- **CoreModule**: Logging, config, health checks, resilience (REQ-FN-020, REQ-NF-003, REQ-FN-017)
  - `LoggerService`: Structured logging with correlation IDs
  - `CorrelationIdMiddleware`: Request tracking
  - `CircuitBreaker`: Fault tolerance for external services
  - `FallbackHandler`: Graceful degradation strategies
  - `CustomThrottlerGuard`: Rate limiting (REQ-FN-024)
  - Health: `HealthController`, `RedisHealthIndicator`
- **AdminModule**: Cache invalidation, metrics registry (REQ-FN-007, 021)
  - `CacheController`: Admin cache management
  - `MetricsRegistryService`: System-wide metrics tracking

### IMetricComputation Interface

```typescript
export interface IMetricComputation {
  // Required metadata
  readonly id: string;
  readonly dashboardLevel: 'course' | 'topic' | 'element';
  readonly description: string;

  // Optional metadata
  readonly version?: string;
  readonly title?: string;
  readonly requiredParams?: (keyof MetricParams)[];
  readonly optionalParams?: (keyof MetricParams)[];
  readonly outputType?: 'scalar' | 'object' | 'array';
  readonly example?: MetricExample;

  // Core computation logic
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult>;
  validateParams?(params: MetricParams): void;
}
```

**Implementation Notes:**

- Use `@Injectable()` decorator for dependency injection
- `compute()` must be stateless (REQ-NF-004)
- `title` defaults to title-cased `id` if omitted
- Metadata powers catalog endpoints (REQ-FN-003)

## API Design

- **Versioned REST**: `/api/vX/*`
- **OpenAPI decorators** (`@nestjs/swagger`) on all endpoints (REQ-FN-008, 009)
- **DTO validation** with `class-validator` (REQ-FN-024)
- **Auth guards**: `JwtAuthGuard`, `ScopesGuard` (REQ-FN-023)
- **Rate limiting**: `CustomThrottlerGuard` with Redis backend (REQ-FN-024)

### Key Endpoints

```
GET /api/vX/metrics                   # Catalog (all metrics metadata)
GET /api/vX/metrics/:id               # Metric details with examples
GET /api/vX/metrics/:id/results       # Compute/retrieve results
GET /api/vX/instances                 # LRS instance metadata (REQ-FN-017)
POST /admin/cache/invalidate          # Admin only (admin:cache scope)
GET /health/liveness                  # Liveness probe (public)
GET /health/readiness                 # Readiness probe (public)
```

### Controller Structure

- `MetricsController`: Catalog and results endpoints
- `InstancesController`: Multi-instance LRS metadata
- `CacheController`: Admin cache invalidation
- `HealthController`: Liveness/readiness probes (public, skip rate limiting)

## Caching (REQ-FN-006)

- **Pattern**: Cache-aside with Redis
- **Keys**: `cache:{metricId}:{scope}:{filters}:{version}`
- **Invalidation**: Single key or pattern-based via admin API (REQ-FN-007)
- **Service**: `CacheService` implements `ICacheService` interface
- **Admin**: `CacheController` provides `/admin/cache/invalidate` endpoint
- **Entry shape** (REQ-FN-030): store `{ response, statements, cursor }` where `response` wraps the metric payload (metricId, value, timestamp/computed, fromCache, metadata, instanceId, status/warning when degraded) to enable incremental refresh and stale fallbacks.

## Resilience & Fault Tolerance (REQ-FN-017, REQ-NF-003)

- **Circuit Breaker**: `CircuitBreaker` service with CLOSED/OPEN/HALF_OPEN states
  - Protects LRS calls from cascading failures
  - Configurable threshold, timeout, and recovery attempts
  - State transitions tracked by `MetricsRegistryService`
- **Graceful Degradation**: `FallbackHandler` service
  - Strategy 1: Serve stale cache data when LRS unavailable (records `MetricsRegistryService.recordGracefulDegradation`)
  - Strategy 2: Return default/null values with degraded indicator; responses stay HTTP 200 but must include `status` (`available/degraded/unavailable`), `warning/error/cause`, `cachedAt`, `age`, and `dataAvailable` flags for clients.
- **Health Checks**: Liveness (app running) vs. Readiness (dependencies ready)

## Security

- **No secrets in repo** (pre-commit hooks with husky/lint-staged enforce)
- **Env vars** for config (REQ-FN-014)
- **JWT authentication** with `JwtAuthGuard` (REQ-FN-023)
- **Scope-based authorization** with `@RequireScopes()` decorator
  - `analytics:read`: Read metrics catalog and results
  - `admin:cache`: Cache invalidation operations
- **Input validation** on all DTOs via `class-validator`
- **Rate limiting** on public endpoints (REQ-FN-024)
  - Redis-backed throttling with `@nest-lab/throttler-storage-redis`
  - Health endpoints bypass rate limiting
- **Log security events** without PII (REQ-FN-020, REQ-NF-019)

## Observability

- **Structured logging** with correlation IDs via `LoggerService` (nest-winston)
- **CorrelationIdMiddleware** for `X-Correlation-ID` propagation across requests
- **Metrics tracking** via `MetricsRegistryService`
  - Circuit breaker state transitions
  - Authentication failures
  - Cache hit/miss ratios
  - Request performance

## Testing

- **Unit**: `src/**/*.spec.ts` (co-located)
- **E2E**: `test/**/*.e2e-spec.ts`
- **Coverage target**: 80% (REQ-NF-020)
- Reference REQ-\* in test descriptions
- Run: `yarn test`, `yarn test:e2e`, `yarn test:cov`

## Coding Standards

- **TypeScript strict mode**, avoid `any`
- **Naming**: `*Controller`, `*Service`, `*Provider`, `I*` (interfaces), `*Dto`
- **Path aliases**: None configured (use relative imports)
- **Format**: Prettier | **Lint**: ESLint v9 with flat config (`eslint.config.mjs`)
- **Pre-commit hooks**: Husky + lint-staged (auto-format and lint)

## Documentation

Update when changed:

- `docs/SRS.md` (requirements)
- `docs/architecture/ARCHITECTURE.md` (architecture + PlantUML)
- `docs/architecture/traceability.md` (component mapping)
- JSDoc for public APIs

## Commands

```bash
yarn install            # Install dependencies
yarn start:dev          # Dev with watch mode
yarn test               # Unit tests
yarn test:e2e           # E2E tests
yarn test:cov           # Coverage report
yarn lint               # ESLint with auto-fix
yarn build              # Production build
yarn start:prod         # Run production build

# Security & Setup
yarn setup:secrets      # Generate JWT secrets
yarn generate:jwt       # Generate dev JWT token
yarn generate:jwt:admin # Generate admin JWT token
```

## Deployment

- **Docker Compose**: `docker-compose.dev.yml` (dev), `docker-compose.yml` (prod)
- **Additional**: `docker-compose.lrs-local.yml`, `docker-compose.test.yml` for testing
- **CI/CD**: GitHub Actions (REQ-FN-015)
  - `production-deploy.yml`: Docker image build and publish
  - `security-scan.yml`: Security validation
- **Rollback**: Tagged Docker images (REQ-NF-012)

## Success Checklist

- ✅ Traceable to `docs/SRS.md` requirements
- ✅ Tests written with REQ-\* IDs, >80% coverage
- ✅ Documentation updated
- ✅ Security controls applied (auth, validation, no secrets)
- ✅ Observability instrumented (logging, metrics, health)
- ✅ All tests pass: `yarn test && yarn test:e2e`
- ✅ Code linted and formatted: `yarn lint` & Prettier

**Docs**: `docs/architecture/`, `docs/SRS.md`
