## Project Overview

NestJS-based intermediary between Learning Record Store (LRS) and Adaptive Learning Systems. Stack: TypeScript, NestJS, Yarn, Docker, Redis, Yetanalytics LRS (xAPI).

## Core Principles

- Follow **SOLID/CUPID** (REQ-FN-019)
- **Traceability**: Reference REQ-\* IDs in code comments, tests, commits
- **Stateless functions** for metric computations (REQ-NF-004)
- **Dependency injection** for all services
- Only modify code related to your issue

## Architecture

### Key Modules

- **MetricsModule**: API, catalog, orchestration (REQ-FN-001, 003, 005)
- **ComputationModule**: Metric logic via `IMetricComputation` (REQ-FN-004, 010)
- **DataAccessModule**: Redis (`ICacheService`) + LRS (`ILRSClient`) (REQ-FN-002, 006, 007)
- **AuthModule**: JWT auth, scope authorization, rate limiting (REQ-FN-023, 024)
- **CoreModule**: Logging (correlation IDs), config, health checks (REQ-FN-020)
- **AdminModule**: Cache invalidation (REQ-FN-007, 021)

### IMetricComputation Interface

```
export interface IMetricComputation {
  id: string;
  dashboardLevel: 'course' | 'topic' | 'element';
  description: string;
  version?: string;
  compute(params: MetricParams, lrsData: xAPIStatement[]): Promise<MetricResult>;
  validateParams?(params: MetricParams): void;
}
```

## API Design

- **Versioned REST**: `/api/v1/*`
- **OpenAPI decorators** (`@nestjs/swagger`) on all endpoints (REQ-FN-008, 009)
- **DTO validation** with `class-validator` (REQ-FN-024)
- **Auth guards**: `JwtAuthGuard`, `ScopesGuard` (REQ-FN-023)

### Key Endpoints

```
GET /api/v1/metrics                   # Catalog
GET /api/v1/metrics/:id               # Metric details
GET /api/v1/metrics/:id/results       # Compute/retrieve
POST /admin/cache/invalidate          # Admin only
GET /health/liveness|readiness        # Health checks
```

## Caching (REQ-FN-006)

- **Pattern**: Cache-aside with Redis
- **Keys**: `cache:{metricId}:{scope}:{filters}:{version}`
- **Invalidation**: Single key or pattern-based via admin API (REQ-FN-007)

## Security

- **No secrets in repo** (pre-commit hooks enforce)
- **Env vars** for config (REQ-FN-014)
- **Input validation** on all DTOs
- **Rate limiting** on public endpoints
- **Log security events** without PII (REQ-FN-020, REQ-NF-019)

## Observability

- **Structured logging** with correlation IDs via `LoggerService`
- **CorrelationIdMiddleware** for `X-Correlation-ID` propagation

## Testing

- **Unit**: `src/**/*.spec.ts` (co-located)
- **E2E**: `test/**/*.e2e-spec.ts`
- **Coverage target**: 80% (REQ-NF-020)
- Reference REQ-\* in test descriptions
- Run: `yarn test`, `yarn test:e2e`, `yarn test:cov`

## Coding Standards

- **TypeScript strict mode**, avoid `any`
- **Naming**: `*Controller`, `*Service`, `*Provider`, `I*` (interfaces), `*Dto`
- **Path aliases** from `tsconfig.json`
- **Format**: Prettier | **Lint**: ESLint (`yarn lint`)

## Documentation

Update when changed:

- `docs/SRS.md` (requirements)
- `docs/architecture/ARCHITECTURE.md` (architecture + PlantUML)
- `docs/architecture/traceability.md` (component mapping)
- JSDoc for public APIs

## Commands

```
yarn install            # Setup
yarn start:dev          # Dev with watch
yarn test               # Unit tests
yarn test:e2e           # E2E tests
yarn test:cov           # Coverage
yarn lint               # ESLint
yarn build              # Production build
```

## Deployment

- **Docker Compose**: `docker-compose.dev.yml` (dev), `docker-compose.prod.yml` (prod with Traefik)
- **CI/CD**: GitHub Actions (REQ-FN-015)
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
