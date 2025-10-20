# Software Architecture Document
**Learning Analytics Aggregation & Caching (LAAC) System**

*Based on IEEE 42010:2011 Architecture Description Standard*

---

## 1. Introduction

### 1.1 Purpose
This document describes the software architecture of the LAAC system, which acts as an intermediary between a Learning Record Store (LRS) and Adaptive Learning Systems (ALS). The architecture is designed to support the functional and non-functional requirements specified in `docs/SRS.md`.

### 1.2 Scope
This architecture covers:
- Logical view (components, modules, interfaces)
- Physical view (deployment topology, infrastructure)
- Process view (runtime behavior, concurrency)
- Development view (code organization, build structure)
- Data view (data flows, caching strategy)

### 1.3 Stakeholders
- **Developers**: Need clear module boundaries, extension points, and SOLID/CUPID principles
- **Operators**: Need deployment patterns, observability, and operational runbooks
- **Research Team**: Need extension architecture for bachelor thesis integration
- **Security/Compliance**: Need security controls and data protection patterns

### 1.4 References
- [SRS](../SRS.md) — Software Requirements Specification
- [StRS](../StRS.md) — Stakeholder Requirements
- [Metrics Specification](../Metrics-Specification.md) — Formal metric definitions
- REQ-FN-018, REQ-FN-019 — Architecture and design principles requirements

---

## 2. Architectural Drivers

### 2.1 Key Requirements (Architecturally Significant)
- **REQ-FN-001, 002**: Client API + xAPI LRS integration
- **REQ-FN-003, 004, 005**: Metrics catalog, computation, and retrieval
- **REQ-FN-006, 007**: Caching with invalidation
- **REQ-FN-010**: Extensible metric architecture (bachelor thesis integration)
- **REQ-FN-023, 024**: Authentication, authorization, input validation
- **REQ-NF-005, 017, 018**: Performance SLOs (p95 < 2s)
- **REQ-NF-010**: Metric isolation and testability
- **REQ-NF-019, 020**: Security baseline and testing

### 2.2 Quality Attributes
| Attribute | Priority | Requirement Traces |
|-----------|----------|-------------------|
| **Extensibility** | High | REQ-FN-010, REQ-NF-009 |
| **Performance** | High | REQ-NF-005, 017, 018 |
| **Security** | High | REQ-FN-023, 024, REQ-NF-019, 020 |
| **Observability** | Medium | REQ-FN-020, 021, REQ-NF-016 |
| **Maintainability** | Medium | REQ-FN-018, 019, REQ-NF-014, 015 |
| **Testability** | Medium | REQ-NF-010, 020 |

### 2.3 Constraints
- **Technology Stack**: NestJS (TypeScript), Docker, Traefik reverse proxy
- **Data Source**: Yetanalytics LRS (xAPI standard)
- **Deployment**: Docker Compose with Portainer, GitHub Actions CI/CD
- **Bachelor Thesis Integration**: Quick implementation and thesis components must be interchangeable in-place

---

## 3. Architectural Decisions (ADRs)

### ADR-001: NestJS Modular Monolith
**Status**: Accepted  
**Context**: Need extensibility, testability, and rapid development  
**Decision**: Use NestJS modular monolith with clear module boundaries  
**Consequences**:
- ✅ Strong module encapsulation via dependency injection
- ✅ Easy to test with mocking/DI
- ✅ Can extract modules to microservices later if needed
- ⚠️ Requires discipline to maintain module boundaries

### ADR-002: Plugin-Based Metric Architecture
**Status**: Accepted  
**Context**: REQ-FN-010 requires bachelor thesis integration as swappable component  
**Decision**: Metrics implement `IMetricComputation` interface, registered via NestJS providers  
**Consequences**:
- ✅ Metrics are isolated, testable units
- ✅ Easy to swap implementations (quick vs. thesis algorithms)
- ✅ Clear extension point for new metrics
- ⚠️ Requires versioning strategy for metric definitions

### ADR-003: Cache-Aside Pattern with Redis
**Status**: Accepted  
**Context**: REQ-FN-006, REQ-NF-005 require caching for performance  
**Decision**: Implement cache-aside pattern with Redis, TTL-based expiration, explicit invalidation  
**Consequences**:
- ✅ Reduces LRS load and improves latency
- ✅ Cache misses fall back to computation
- ⚠️ Requires cache key design for multi-instance support
- ⚠️ Stale data risk mitigated by TTL + explicit invalidation API

### ADR-004: API-First with OpenAPI/Swagger
**Status**: Accepted  
**Context**: REQ-FN-008, 009 require OpenAPI docs and interactive UI  
**Decision**: Use NestJS Swagger decorators for code-first API spec generation  
**Consequences**:
- ✅ API spec always in sync with implementation
- ✅ Interactive testing via Swagger UI
- ✅ Client SDK generation possible

### ADR-005: JWT-Based Authentication with Scope/Role Authorization
**Status**: Accepted  
**Context**: REQ-FN-023 requires industry-standard auth  
**Decision**: JWT Bearer tokens with scope claims, NestJS Guards for authz  
**Consequences**:
- ✅ Stateless authentication
- ✅ Fine-grained access control via scopes
- ⚠️ Requires external identity provider or JWT issuer
- ⚠️ Token refresh strategy needed for long-lived sessions

### ADR-006: Structured Logging with Correlation IDs
**Status**: Accepted  
**Context**: REQ-FN-020, REQ-NF-016 require observability  
**Decision**: Winston logger with correlation IDs, JSON format  
**Consequences**:
- ✅ Traceable request flows across components
- ✅ Queryable structured logs
- ✅ Integrates with log aggregation tools (ELK, Loki)

---

## 4. Logical View (Component Architecture)

### 4.1 High-Level Components
```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications (ALS)                 │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS + JWT
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                       │
│  • Authentication Guard • Authorization Guard • Rate Limiter │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        ▼                                       ▼
┌──────────────────┐                  ┌──────────────────┐
│  Metrics Module  │                  │   Admin Module   │
│  • MetricsCtrl   │                  │  • CacheCtrl     │
│  • MetricsSvc    │                  │  • HealthCtrl    │
└────────┬─────────┘                  └──────────────────┘
         │
         ├─────► Metrics Catalog (Registry)
         │
         ├─────► Computation Layer (Plugin Interface)
         │         ├── QuickImplementation (Phase 1)
         │         └── ThesisImplementation (Phase 2+)
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│                     Data Access Layer                         │
│  • CacheService (Redis) • LRSClient (xAPI HTTP)              │
└───────────────┬──────────────────────┬───────────────────────┘
                │                      │
                ▼                      ▼
        ┌──────────────┐       ┌────────────────┐
        │ Redis Cache  │       │ Yetanalytics   │
        │              │       │ LRS (xAPI)     │
        └──────────────┘       └────────────────┘
```

### 4.2 Module Breakdown (NestJS Modules)

#### **CoreModule** (Shared Infrastructure)
- `LoggerService`: Winston-based structured logging with correlation IDs
- `ConfigService`: Environment-based configuration (dotenv)
- `HealthController`: Liveness/readiness probes

#### **AuthModule** (Security)
- `JwtAuthGuard`: Validates JWT tokens (REQ-FN-023)
- `ScopesGuard`: Enforces role/scope-based authorization
- `RateLimitGuard`: Throttles requests per client (REQ-FN-024)
- `ValidationPipe`: DTO validation with class-validator

#### **MetricsModule** (Core Business Logic)
- `MetricsController`: API endpoints for catalog and results
  - `GET /metrics` — List all metrics
  - `GET /metrics/:id` — Get metric details
  - `GET /metrics/:id/results` — Compute/retrieve results
- `MetricsService`: Orchestrates computation and caching
- `MetricsRegistry`: Catalog of available metrics (REQ-FN-003)

#### **ComputationModule** (Extensible Computation Layer)
- `IMetricComputation` (Interface): Defines metric computation contract
  ```typescript
  interface IMetricComputation {
    id: string;
    compute(params: MetricParams, lrsData: xAPIStatement[]): Promise<MetricResult>;
  }
  ```
- `QuickMetricProvider`: Phase 1 implementations (all CSV metrics)
- `ThesisMetricProvider`: Phase 2+ bachelor thesis algorithms (swappable)
- `ComputationFactory`: Routes metric ID to appropriate provider

#### **DataAccessModule** (External Systems)
- `CacheService`: Redis client with cache-aside pattern
  - `get(key)`, `set(key, value, ttl)`, `invalidate(key)`
- `LRSClient`: HTTP client for xAPI LRS (Yetanalytics)
  - `getStatements(query)` — Fetches xAPI statements with filters

#### **AdminModule** (Operational APIs)
- `CacheController`: Cache management endpoints (admin scope required)
  - `POST /admin/cache/invalidate` — Invalidate cache keys
- `MetricsExporter`: Prometheus metrics endpoint (`GET /metrics/prometheus`)

### 4.3 Data Flow (Typical Request)
1. **Client** sends `GET /metrics/course-completion/results?courseId=123&start=2025-01-01`
2. **AuthGuard** validates JWT token, extracts scopes
3. **ScopesGuard** checks for `analytics:read` scope
4. **RateLimitGuard** checks request rate
5. **ValidationPipe** validates query parameters
6. **MetricsController** delegates to `MetricsService.getResults()`
7. **MetricsService** checks **CacheService** for cached result
   - **Cache hit**: Return cached result (sub-100ms)
   - **Cache miss**: Proceed to computation
8. **ComputationFactory** resolves metric provider (Quick or Thesis)
9. **MetricProvider** calls **LRSClient** to fetch xAPI statements
10. **LRSClient** queries Yetanalytics LRS via HTTP
11. **MetricProvider** computes result from xAPI data
12. **CacheService** stores result with TTL
13. **MetricsService** returns result to controller
14. **Response** sent to client with correlation ID in headers

---

## 5. Physical View (Deployment Architecture)

### 5.1 Deployment Topology (Production)
```
                    ┌──────────────────┐
                    │   Internet       │
                    └────────┬─────────┘
                             │ HTTPS
                             ▼
                    ┌──────────────────┐
                    │  Traefik Proxy   │
                    │  (TLS termination)│
                    │  (Rate limiting)  │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌──────────────────┐          ┌──────────────────┐
    │   LAAC Service   │          │   Portainer UI   │
    │   (NestJS App)   │          │   (Admin)        │
    │   Port: 3000     │          │   Port: 9000     │
    └────────┬─────────┘          └──────────────────┘
             │
       ┌─────┴──────┐
       │            │
       ▼            ▼
┌─────────────┐  ┌──────────────────┐
│ Redis Cache │  │ Yetanalytics LRS │
│ Port: 6379  │  │ (External)       │
└─────────────┘  └──────────────────┘
```

### 5.2 Container Strategy
- **laac-service**: NestJS application (Node 22 LTS, Alpine)
- **redis**: Redis 7 (official image, persistence enabled)
- **traefik**: Traefik 3 (reverse proxy, TLS, routing)
- **portainer**: Portainer CE (container management UI)

### 5.3 Network Configuration
- **Public Network**: Traefik exposed (ports 80, 443)
- **Internal Network**: Services communicate via Docker network (bridge)
- **Secrets**: Environment variables via Docker secrets or `.env` (not committed)

### 5.4 Scalability Strategy
- **Horizontal scaling**: Multiple LAAC instances behind Traefik (REQ-FN-017)
- **Cache sharing**: All instances share Redis (multi-instance support)
- **Session affinity**: Not required (stateless JWT auth)

---

## 6. Process View (Runtime Behavior)

### 6.1 Concurrency Model
- **Request Handling**: NestJS async/await (Node.js event loop)
- **LRS Queries**: Concurrent HTTP requests with connection pooling
- **Cache Operations**: Non-blocking Redis I/O
- **Metric Computation**: CPU-bound work may use worker threads (future optimization)

### 6.2 State Management
- **Application State**: Stateless (no in-memory user sessions)
- **Cache State**: Shared in Redis (distributed across instances)
- **Configuration State**: Immutable after startup (env vars)

### 6.3 Error Handling
- **HTTP Errors**: Mapped to standard HTTP status codes (400, 401, 403, 500)
- **LRS Unavailable**: Return 503 with retry-after header
- **Cache Unavailable**: Fall through to computation (degraded mode)
- **Computation Errors**: Log + return 500 with correlation ID

---

## 7. Development View (Code Organization)

### 7.1 Directory Structure
```
src/
├── main.ts                      # Application bootstrap
├── app.module.ts                # Root module
├── core/                        # Shared infrastructure (CoreModule)
│   ├── logger/
│   ├── config/
│   └── health/
├── auth/                        # Security (AuthModule)
│   ├── guards/
│   ├── decorators/
│   └── strategies/
├── metrics/                     # Business logic (MetricsModule)
│   ├── controllers/
│   ├── services/
│   ├── dto/
│   └── registry/
├── computation/                 # Computation layer (ComputationModule)
│   ├── interfaces/              # IMetricComputation
│   ├── quick/                   # Phase 1 implementations
│   ├── thesis/                  # Phase 2 (bachelor thesis)
│   └── factory/
├── data-access/                 # External systems (DataAccessModule)
│   ├── cache/
│   └── lrs/
└── admin/                       # Operational APIs (AdminModule)
    ├── controllers/
    └── exporters/
```

### 7.2 Build & Test Strategy
- **Build**: `nest build` (TypeScript → JavaScript)
- **Unit Tests**: Jest with DI mocking (per module)
- **E2E Tests**: Supertest against running app (test DB/cache)
- **Coverage Target**: 80% (REQ-NF-020)
- **CI/CD**: GitHub Actions (lint, test, build, deploy)

---

## 8. Data View

### 8.1 Cache Key Design
```
cache:{metricId}:{scope}:{filters}:{version}
Example: cache:course-completion:course:123:v1
```
- **metricId**: Unique metric identifier
- **scope**: course | topic | element
- **filters**: Hashed query params (courseId, start, end)
- **version**: API/metric version for cache invalidation

### 8.2 xAPI Data Flow
- **Source**: Yetanalytics LRS (REQ-FN-002)
- **Query**: HTTP GET with filters (actor, verb, object, timestamp)
- **Format**: xAPI statements (JSON)
- **Processing**: Extract, transform, aggregate per metric logic
- **Output**: MetricResult (value, unit, metadata)

### 8.3 Data Retention
- **Cache TTL**: Configurable per metric (default: 1 hour)
- **Logs**: 90 days retention (REQ-NF-019)
- **Audit Logs**: Security events retained per compliance policy

---

## 9. Security Architecture

### 9.1 Authentication Flow
1. Client obtains JWT from identity provider (e.g., Keycloak, Auth0)
2. Client includes JWT in `Authorization: Bearer <token>` header
3. JwtAuthGuard validates signature, expiration, issuer
4. User/scope claims extracted for authorization

### 9.2 Authorization Model
| Scope | Permissions |
|-------|-------------|
| `analytics:read` | Access metrics catalog and results |
| `admin:cache` | Invalidate cache keys |
| `admin:config` | Modify instance configuration |

### 9.3 Input Validation
- **DTO Validation**: class-validator decorators (REQ-FN-024)
- **Query Params**: Whitelist allowed params, reject unknown
- **Body Payloads**: JSON schema validation

### 9.4 Rate Limiting
- **Strategy**: Token bucket per client IP or API key
- **Limits**: Configurable (default: 100 req/min)
- **Response**: 429 Too Many Requests with retry-after

---

## 10. Observability Architecture

### 10.1 Logging (REQ-FN-020)
- **Format**: JSON structured logs
- **Correlation ID**: Per-request UUID in `X-Correlation-ID` header
- **Levels**: error, warn, info, debug
- **Content**: No PII, no secrets, sanitized errors

### 10.2 Metrics (REQ-FN-021)
- **Exporter**: Prometheus-format endpoint (`/metrics`)
- **Key Metrics**:
  - `http_request_duration_seconds` (histogram, p50/p95/p99)
  - `cache_hit_ratio` (gauge)
  - `lrs_query_duration_seconds` (histogram)
  - `metric_computation_duration_seconds` (histogram, per metricId)
  - `auth_failures_total` (counter)
  - `rate_limit_rejections_total` (counter)

### 10.3 Health Checks
- `GET /health/liveness` → 200 if app is running
- `GET /health/readiness` → 200 if app + Redis + LRS are reachable

---

## 11. Extension Points (Bachelor Thesis Integration)

### 11.1 Metric Provider Interface
```typescript
export interface IMetricComputation {
  id: string;
  dashboardLevel: 'course' | 'topic' | 'element';
  description: string;
  
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult>;
}

export interface MetricParams {
  courseId?: string;
  topicId?: string;
  elementId?: string;
  actorId?: string;
  start?: Date;
  end?: Date;
}

export interface MetricResult {
  metricId: string;
  value: number | string | object;
  unit?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

### 11.2 Swapping Implementations
1. Implement new class extending `IMetricComputation`
2. Register in `ThesisMetricProvider` module
3. Configure factory to route metric ID to new provider
4. No changes needed to API or client code

### 11.3 Versioning Strategy (REQ-FN-016)
- Metric definitions versioned with API version (v1, v2)
- Breaking changes require new version
- Old versions deprecated with sunset timeline

---

## 12. Design Principles (REQ-FN-019)

### 12.1 SOLID Principles
- **S (Single Responsibility)**: Each module/service has one reason to change
- **O (Open/Closed)**: Metrics extensible via interface, no core changes needed
- **L (Liskov Substitution)**: ThesisProvider substitutes QuickProvider seamlessly
- **I (Interface Segregation)**: Focused interfaces (IMetricComputation, ICacheService)
- **D (Dependency Inversion)**: Depend on abstractions (interfaces), not concrete classes

### 12.2 CUPID Principles
- **Composable**: Modules compose via dependency injection
- **Unix Philosophy**: Each service does one thing well (metrics, cache, auth)
- **Predictable**: Deterministic computations (REQ-NF-004), idempotent APIs
- **Idiomatic**: Follows NestJS conventions, TypeScript best practices
- **Domain-based**: Modules align with domain concepts (metrics, auth, admin)

---

## 13. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **LRS Unavailable** | High | Timeouts, circuit breaker, graceful degradation (REQ-NF-018) |
| **Cache Unavailable** | Medium | Fall through to computation, monitor cache hit ratio |
| **Metric Computation Slow** | Medium | Cache results, async processing, SLO monitoring (REQ-NF-017) |
| **Authentication Bypass** | High | Security tests in CI (REQ-NF-020), regular audits |
| **Metric Definition Drift** | Medium | Traceability checks (REQ-NF-003), versioned specs |

---

## 14. Future Considerations

### 14.1 Microservices Migration
If monolith becomes unwieldy:
- Extract `ComputationModule` as separate service
- Extract `CacheService` as distributed cache layer
- Use message queue (RabbitMQ, Kafka) for async computation

### 14.2 Advanced Caching
- Multi-tier caching (in-memory L1 + Redis L2)
- Predictive cache warming based on access patterns
- Cache result streaming for large datasets

### 14.3 Real-Time Analytics
- WebSocket support for live metric updates
- Server-sent events (SSE) for push notifications
- Event-driven architecture with xAPI webhook subscriptions

---

## 15. Compliance & Auditing

### 15.1 Regulatory Alignment
- **GDPR**: Data minimization, pseudonymization, audit logs (REQ-NF-019)
- **WCAG**: API documentation accessibility (REQ-NF-008)
- **ISO 27001**: Security controls, risk management

### 15.2 Audit Trail
- Authentication/authorization events logged
- Cache invalidation operations logged
- Admin actions (config changes) logged
- Logs include: timestamp, actor, action, outcome, correlation ID

---

## 16. Glossary

| Term | Definition |
|------|------------|
| **ALS** | Adaptive Learning System (client) |
| **LRS** | Learning Record Store (xAPI data source) |
| **xAPI** | Experience API (learning data standard) |
| **Metric** | Computed analytics value (e.g., completion rate) |
| **Dashboard Level** | Scope of metric: course, topic, or element |
| **Cache-Aside** | Pattern where app checks cache, then computes on miss |
| **JWT** | JSON Web Token (stateless auth mechanism) |
| **SLO** | Service Level Objective (performance target) |

---

## 17. Approval & Maintenance

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-10-20 | Architecture Team | Initial draft |

**Review Cycle**: Architecture reviewed quarterly or on major requirement changes  
**Diagram Updates**: PlantUML diagrams regenerated on component changes  
**Traceability**: Requirements-to-architecture mapping maintained in `traceability.md`

---

**Next Steps**:
1. Review and approve this architecture
2. Generate PlantUML diagrams (`components.puml`, `deployment.puml`)
3. Create requirements traceability matrix
4. Begin detailed design and implementation planning
