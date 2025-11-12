---
description: 'Implement the feature described in a GitHub issue.'
tools:
  ['edit', 'search', 'runCommands', 'runTasks', 'browser/*', 'github/github-mcp-server/issue_read', 'github/github-mcp-server/issue_write', 'github/github-mcp-server/list_issues', 'github/github-mcp-server/search_issues', 'github/github-mcp-server/update_pull_request', 'usages', 'problems', 'changes', 'testFailure', 'githubRepo', 'sonarsource.sonarlint-vscode/sonarqube_getPotentialSecurityIssues', 'sonarsource.sonarlint-vscode/sonarqube_excludeFiles', 'sonarsource.sonarlint-vscode/sonarqube_setUpConnectedMode', 'sonarsource.sonarlint-vscode/sonarqube_analyzeFile', 'todos', 'runSubagent', 'runTests']
---

# GitHub Copilot: Requirement Implementation

---

## Issue Context

**Issue Number**: #{ISSUE_NUMBER}  
**Requirement ID**: {REQ-ID}  
**Requirement Type**: Functional / Non-Functional  
**Priority**: High / Medium / Low  
**Sprint**: SPRINT-{N}  
**Module**: {ModuleName}

---

## Your Mission

Implement the feature described in this issue according to the Software Requirements Specification (SRS), following LAAC's architectural patterns, coding standards, and quality gates. Your implementation must be:

- ✅ **Traceable**: Reference {REQ-ID} in code comments, tests, and commit messages
- ✅ **Complete**: Address all acceptance criteria with checkboxes
- ✅ **Tested**: Achieve >80% test coverage with unit and E2E tests
- ✅ **Secure**: Apply auth guards, input validation, and rate limiting as specified
- ✅ **Observable**: Add structured logging, correlation IDs, and Prometheus metrics
- ✅ **Documented**: Update API docs, architecture, and traceability matrix

---

## Workflow

### 1. Understand the Requirement

**Read First**:

- **Primary**: `docs/srs/{REQ-ID}.md` — Detailed requirement specification
- **Fallback**: `docs/SRS.md` — Search for {REQ-ID} if per-requirement file doesn't exist
- **Architecture**: `docs/architecture/ARCHITECTURE.md` — Module boundaries and patterns
- **Traceability**: `docs/architecture/traceability.md` — Component mapping

**Extract**:

- Requirement name/title
- SHALL/SHOULD/MAY modality (mandatory vs. optional)
- Acceptance criteria
- Verification methods
- Related requirements (dependencies)
- Target module and components

### 2. Review the Issue

**Check**:

- **Requirement Traceability**: Confirm SRS reference, type, priority, module
- **Acceptance Criteria**: Review all checkboxes under "Acceptance Criteria" section
- **Implementation Scope**: Note files to create/modify from "Files to Create/Modify" table
- **Architectural Context**: Understand module dependencies and design patterns
- **Implementation Guidelines**: Review NestJS patterns, testing approach, security, observability

### 3. Plan Implementation

**Before Writing Code**:

- Read existing code in the target module (`src/{module-name}/`)
- Identify dependencies (services, providers, guards, middleware)
- Review related tests (`src/{module-name}/*.spec.ts`, `test/*.e2e-spec.ts`)
- Check for similar implementations in other modules (pattern reuse)

**Create a Mental Checklist**:

- Which files to create vs. modify?
- What DTOs, interfaces, services, controllers are needed?
- Which guards and decorators to apply?
- What to log and which metrics to track?
- What test cases are required?

### 4. Implement the Feature

**Follow NestJS Best Practices**:

- Use **dependency injection** for all services and providers
- Apply **decorators** for Swagger documentation (`@ApiTags`, `@ApiOperation`, `@ApiResponse`)
- Use **DTOs** with `class-validator` decorators for input validation
- Apply **guards** (`JwtAuthGuard`, `ScopesGuard`) for authentication/authorization
- Use **pure, stateless functions** for business logic (especially metric computations)

**Traceability Annotations**:

- Add inline comments referencing {REQ-ID} for complex logic:
  ```typescript
  // REQ-ID: Implements cache-aside pattern with Redis
  const cached = await this.cache.get(key);
  if (cached) return cached;
  ```

### 5. Add Observability

**Structured Logging**:

```typescript
// Use LoggerService with correlation IDs
this.logger.log('Action completed', {
  metricId,
  duration,
  correlationId,
});
```

- Add Prometheus metrics if applicable (counters, histograms)

**Health Checks** (if adding new dependencies):

- Update `src/core/health/health.controller.ts` if new external dependency is added

### 6. Write Unit Tests

**Location**: Co-located with implementation (`src/{module}/*.spec.ts`)

**Coverage Requirements**:

- Target >80% coverage for the feature
- Test success paths, error paths, edge cases
- Mock external dependencies (LRS, cache, database)
- Run `yarn run test:cov` to verify coverage

### 7. Write E2E Tests

**Location**: `test/{feature}.e2e-spec.ts`

**Run Tests**:

- `yarn run test` — Unit tests
- `yarn run test:e2e` — E2E tests
- `yarn run test:cov` — Coverage report

### 8. Security Checklist

**Authentication** (REQ-FN-023):

- Apply `@UseGuards(JwtAuthGuard)` to protected endpoints
- Never expose admin endpoints without auth

**Authorization** (REQ-FN-023):

- Apply `@RequireScopes('scope:action')` decorator for scope-based authz
- Test unauthorized access returns 403

**Input Validation** (REQ-FN-024):

- Use DTOs with `class-validator` decorators

- Test invalid inputs return 400

**Rate Limiting** (REQ-FN-024):

- Public endpoints should have rate limiting applied (configured in `CoreModule`)

**Secrets**:

- Never commit secrets to the repository
- Use environment variables or Docker secrets

### 9. Documentation

**Update API Documentation**:

- All endpoints have `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators
- Swagger UI at `/api/docs` reflects changes
- Run `yarn run start:dev` and verify at `http://localhost:3000/api/docs`

**Update Architecture Documentation** (if applicable):

- `docs/architecture/ARCHITECTURE.md` — If new module or significant pattern change
- `docs/architecture/traceability.md` — If new components added
- PlantUML diagrams (`docs/architecture/*.puml`) — If architectural diagrams need updates

**Add JSDoc Comments**:

- Add concise JSDoc for public APIs

### 10. Final Checks

**Run All Quality Gates**:

- `yarn install`
- `yarn run lint` and `yarn run format`
- `yarn run test`, `yarn run test:e2e`, `yarn run test:cov`
- `yarn run build`
- `yarn run start:dev`

**Verify Implementation Against Issue**:

- [ ] All acceptance criteria checkboxes can be marked complete
- [ ] All files from "Implementation Scope" table are created/modified
- [ ] {REQ-ID} referenced in code comments, test descriptions
- [ ] Unit tests written with >80% coverage
- [ ] E2E tests passing
- [ ] No ESLint errors
- [ ] Code formatted with Prettier
- [ ] Swagger documentation updated
- [ ] Security controls applied (guards, validation)
- [ ] Observability added (logging, metrics)
- [ ] Architecture documentation updated (if needed)

**Update Issue**:

- Check off completed items in "Acceptance Criteria"
- Check off completed items in "Implementation Checklist"
- Add comment summarizing implementation and test coverage
- Reference commit SHA(s)

### 11. Commit and PR

**Commit Message Format**:

```
<type>: <short description> ({REQ-ID})

<optional body with details>

Implements {REQ-ID}
Closes #{ISSUE_NUMBER}
```

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

**Example**:

```
feat: implement metrics catalog endpoint (REQ-FN-003)

Add GET /api/v1/metrics endpoint that returns the full metrics catalog
with metadata for each registered metric. Includes unit and E2E tests.

Implements REQ-FN-003
Closes #25
```

**Pull Request**:

- Reference issue number in PR title and description
- Link to SRS requirement file
- Summarize changes and test coverage
- Request review from team

---

## Architecture Reference

### Module Overview

```
src/
├── core/         # Logging, config, health (REQ-FN-020)
├── auth/         # JWT, scopes, rate limiting (REQ-FN-023, 024)
├── metrics/      # Catalog, orchestration (REQ-FN-001, 003, 005)
├── computation/  # Metric logic (REQ-FN-004, 010)
├── data-access/  # Cache, LRS client (REQ-FN-002, 006, 007)
├── admin/        # Cache invalidation, Prometheus (REQ-FN-007, 021)
└── common/       # Shared utilities
```

### Key Interfaces

```typescript
// Metric Computation (REQ-FN-010)
export interface IMetricComputation {
  id: string;
  dashboardLevel: 'course' | 'topic' | 'element';
  description: string;
  version?: string;
  compute(
    params: MetricParams,
    lrsData: xAPIStatement[],
  ): Promise<MetricResult>;
  validateParams?(params: MetricParams): void;
}

// Cache Service (REQ-FN-006)
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}
```

### REST API Conventions

- Versioning: `/api/v1/`
- Metrics: `GET /api/v1/metrics`, `GET /api/v1/metrics/:id`, `GET /api/v1/metrics/:id/results`
- Admin: `POST /admin/cache/invalidate`
- Prometheus: `GET /metrics` (public)
- Health: `GET /health/liveness`, `GET /health/readiness`

### Cache Key Structure

```
cache:{metricId}:{scope}:{filters}:{version}
Example: cache:course-completion:course:123:v1
```
