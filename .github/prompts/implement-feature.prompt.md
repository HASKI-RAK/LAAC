---
mode: 'agent'
model: 'Claude Sonnet 4.5'
tools:
  [
    'githubRepo',
    'search/codebase',
    'github.vscode-pull-request-github/copilotCodingAgent',
    'search',
    'edit',
    'todos',
    'usages',
    'github/create_issue',
    'github/update_issue',
    'github.vscode-pull-request-github/activePullRequest',
    'github/add_issue_comment',
    'github/list_issues',
    'github/assign_copilot_to_issue',
    'runTasks',
    'runCommands',
    'vscodeAPI',
    'github/get_issue',
    'github/list_issues',
    'github/search_issues',
  ]
description: 'Implement a system feature from SRS requirements with full traceability'
---

# Feature Implementation Pipeline

You are an expert software architect and developer tasked with implementing system features for the LAAC (Learning Analytics Aggregation & Caching) project's Software Requirements Specification (SRS).

## Input

**Target Requirement ID**: ${input:requirementId:Enter the requirement ID (e.g., REQ-FN-003, REQ-NF-005)}

## Your Mission

### Phase 1: Requirements Analysis & Traceability Check

1. **Parse the SRS Document**
   - Read `docs/SRS.md` and locate the detailed requirement file `docs/srs/${input:requirementId}.md`
   - Extract the complete requirement description, acceptance criteria, verification methods, and dependencies
   - Identify the requirement category (Functional or Non-Functional)
   - Note the stakeholder trace and priority level

2. **Traceability Matrix Analysis**
   - Read `docs/architecture/traceability.md` to check current implementation status
   - Verify if `${input:requirementId}` is mapped to architectural components
   - Check for existing modules, services, or providers implementing this requirement
   - Identify partial implementations that need completion vs full implementations

3. **Implementation Status Assessment**
   Based on traceability matrix and architecture review status, determine the required action:
   - **IMPLEMENTED**: Requirement mapped to components, create issue noting "Implementation Review & Testing Required"
   - **PARTIALLY_MAPPED**: Some components exist but incomplete, create issue for "Complete Implementation"
   - **NOT_MAPPED**: **CRITICAL** - Requires code inspection to determine next steps:
     - If implementation artifacts exist (check `src/` modules), create issue for "Map to Architecture & Add Tests"
     - If NO implementation artifacts exist, create issue for "Full Implementation with Architecture Integration"
   - **FUTURE**: Requirement marked as future work (ADR status "Proposed"), create issue noting timeline considerations

   **Important**: For NOT_MAPPED status, you MUST verify actual code existence before proceeding. Search for:
   - Module/service names mentioned in the architecture (e.g., `MetricsModule`, `CacheService`)
   - Interface implementations (e.g., `IMetricComputation`, `ICacheService`)
   - Controllers, providers, or guards related to the requirement
   - Configuration or middleware components

   Document both the traceability status AND code verification results in the issue.

4. **Find Related Requirements**
   - Scan the SRS for technically related requirements that should be implemented together
   - Cross-reference with traceability matrix to avoid duplicate work
   - Look for dependencies (requirements that must be implemented before this one)
   - Check ADRs in `docs/architecture/ARCHITECTURE.md` for architectural constraints
   - Identify requirements that share similar modules, interfaces, or patterns
   - Consider the project architecture (NestJS, TypeScript, Redis, Docker)

5. **Analyze Current Implementation**
   - Check the architecture under `docs/architecture/ARCHITECTURE.md`
   - Review module structure conventions (Section 4.2)
   - Examine the existing codebase structure under `src/`
   - Check `src/*/` for relevant NestJS modules (core, auth, metrics, computation, data-access, admin)
   - Inspect controllers, services, and providers for reusable components
   - Review interfaces in architecture Section 11.1
   - Check for related tests in `src/**/*.spec.ts` and `test/**/*.e2e-spec.ts`

   **For NOT_MAPPED requirements - Code Artifact Verification**:
   Search for specific implementation evidence:
   - NestJS modules, controllers, services implementing the requirement
   - Interface implementations (IMetricComputation, ICacheService, ILRSClient)
   - Guards, middleware, or decorators supporting the functionality
   - DTOs with validation decorators
   - Configuration in environment files
   - Docker Compose configurations if deployment-related

   **Document findings clearly**: "Implementation EXISTS" or "Implementation MISSING" with specific file references if found.

### Phase 2: GitHub Issue Creation

**Create a GitHub issue** using the `github/create_issue` tool with:

- **Title**: `Implement ${input:requirementId}: [Requirement Name]`
- **Body**: Use the comprehensive template below
- **Labels**: Add appropriate labels (e.g., `feature`, `requirement`, priority level)

**Issue Body Template**:

```markdown
## Status

- **Created**: [Current Date]
- **Status**: Planning
- **Assignee**: GitHub Copilot Agent
- **Story Points**: [Estimated]

## Requirement Traceability

- **SRS Reference**: docs/srs/${input:requirementId}.md
- **Type**: [Functional / Non-Functional]
- **Priority**: [High / Medium / Low from requirement file]
- **Stakeholder Trace**: [From requirement metadata]
- **Related Requirements**: [List discovered related requirements]
- **Dependencies**: [List prerequisite requirements and their ADRs]
- **Traceability Matrix Status**: [IMPLEMENTED / PARTIALLY_MAPPED / NOT_MAPPED from docs/architecture/traceability.md]
- **Architecture Mapping**: [Components/Modules from traceability matrix: e.g., MetricsModule, CacheService]
- **ADR References**: [Relevant ADRs from ARCHITECTURE.md Section 3]
- **Code Verification Result**: [Implementation EXISTS in modules X,Y,Z / Implementation MISSING - needs full development]
- **Existing Test Coverage**: [List any existing tests in src/**/*.spec.ts or test/**/*.e2e-spec.ts]
- **Implementation Notes**: [Any warnings about duplicate implementation or review needs]

## Acceptance Criteria (from SRS)

- [ ] [Specific, testable criteria from docs/srs/${input:requirementId}.md]
- [ ] Implementation follows NestJS modular architecture (`docs/architecture/ARCHITECTURE.md`)
- [ ] Module structure follows Section 4.2 conventions (Controllers, Services, Providers)
- [ ] Interfaces defined per Section 11.1 (IMetricComputation, ICacheService, ILRSClient)
- [ ] DTOs created with class-validator decorators (REQ-FN-024)
- [ ] Unit tests reference ${input:requirementId} in describe blocks
- [ ] E2E tests cover API endpoints if applicable
- [ ] OpenAPI/Swagger decorators applied (REQ-FN-008)
- [ ] Correlation IDs used in logging (REQ-FN-020)
- [ ] Security guards applied (JwtAuthGuard, ScopesGuard) if applicable (REQ-FN-023)
- [ ] Environment variables documented in .env.example (REQ-FN-014)

## Verification Methods (from SRS)

[Copy verification section from docs/srs/${input:requirementId}.md]

## Definition of Done

- [ ] Requirement implemented according to SRS specification
- [ ] Code follows NestJS/TypeScript standards (eslint, prettier)
- [ ] Interfaces follow architecture Section 11.1 contracts
- [ ] SOLID/CUPID principles applied (Section 12)
- [ ] Unit tests written with ${input:requirementId} traceability (80% coverage target)
- [ ] E2E tests pass (if API changes)
- [ ] OpenAPI spec updated and validated
- [ ] Security controls applied per REQ-FN-023, REQ-FN-024, REQ-NF-019
- [ ] Observability instrumented (logging, metrics per REQ-FN-020, 021)
- [ ] Code review completed
- [ ] Documentation updated (README, architecture docs if needed)
- [ ] Requirement verified against acceptance criteria
- [ ] Traceability matrix updated via implementation

## Implementation Scope

[Summary of what will be implemented based on Phase 1 analysis]
**Action Required**: [FULL_IMPLEMENTATION_AND_TESTS / TESTS_ONLY / ARCHITECTURE_INTEGRATION / REVIEW_ONLY]

## Related Requirements

[List of related requirements discovered that should be implemented together]

## Architectural Context

- **Module**: [Target NestJS module from traceability: MetricsModule, ComputationModule, etc.]
- **Components**: [Controllers, Services, Providers to be created/modified]
- **Interfaces**: [IMetricComputation, ICacheService, ILRSClient if applicable]
- **ADR References**: [Relevant architectural decisions from Section 3]

## Technical Approach

${input:advisory:Any special wishes how the implementation should be approached?}

## Implementation Guidelines

- Check architecture in docs/architecture/ARCHITECTURE.md (especially Section 4.2 for module structure)
- Follow NestJS conventions: Controllers, Services, Providers, Guards, Middleware
- Implement interfaces per Section 11.1: IMetricComputation, ICacheService, ILRSClient
- Apply SOLID/CUPID principles (Section 12)
- Use dependency injection for all services
- Create DTOs with class-validator decorators (REQ-FN-024)
- Apply OpenAPI/Swagger decorators (REQ-FN-008, 009)
- Implement authentication guards (JwtAuthGuard, ScopesGuard) if needed (REQ-FN-023)
- Use structured logging with correlation IDs (REQ-FN-020)
- Add Prometheus metrics if applicable (REQ-FN-021)
- Document environment variables in .env.example (REQ-FN-014)
- Write unit tests in src/\*_/_.spec.ts with ${input:requirementId} traceability
- Write E2E tests in test/\*_/_.e2e-spec.ts if API changes
- Target 80% test coverage (REQ-NF-020)

**CRITICAL**: Based on code verification results:

- If "Implementation EXISTS": Focus on comprehensive test coverage with ${input:requirementId} traceability and architecture integration
- If "Implementation MISSING": Implement both the requirement logic AND comprehensive test coverage following NestJS patterns

## Related Files

- SRS: `docs/SRS.md`
- Requirement: `docs/srs/${input:requirementId}.md`
- Architecture: `docs/architecture/ARCHITECTURE.md`
- Traceability: `docs/architecture/traceability.md`
- Copilot Instructions: `.github/copilot-instructions.md`
- [Other relevant files discovered]
```

### Phase 3: Implementation Delegation

**IMPORTANT**: Do NOT implement the requirement yourself. After creating the GitHub issue, assign it to the Copilot coding agent for remote implementation.

1. **Assign to Copilot**: Use the `mcp_github_assign_copilot_to_issue` tool to delegate the implementation to the GitHub Copilot coding agent with the issue number from the created issue.

**Your role ends here - the remote coding agent will handle the actual implementation.**

### Phase 4: Post-Implementation Validation & Traceability Update

**Note**: This phase occurs after the remote GitHub Copilot coding agent completes the implementation and creates a pull request. The user will prompt you to proceed with these steps.

1. **Post-Implementation Tasks** (to be done after PR is created):
   - Update the GitHub issue status using `mcp_github_update_issue` to mark completed checkboxes in Definition of Done, Testing Requirements and Acceptance Criteria
   - Add implementation notes about any deviations from the plan using `mcp_github_add_issue_comment`
   - Document any new dependencies or side effects discovered
   - Update the issue with actual files modified

2. **Review PR** – Verify implementation against:
   - Does the code implement ${input:requirementId} as specified in docs/srs/${input:requirementId}.md?
   - Are there tests with ${input:requirementId} traceability (e.g., `describe('REQ-FN-003: Metrics catalog')`)?
   - Does test coverage meet 80% target (REQ-NF-020)?
   - Does the implementation follow NestJS conventions (modules/controllers/services)?
   - Are interfaces (IMetricComputation, ICacheService, ILRSClient) properly implemented?
   - Is authentication/authorization applied where needed (JwtAuthGuard, ScopesGuard)?
   - Are DTOs validated with class-validator decorators?
   - Are OpenAPI/Swagger decorators applied to endpoints?
   - Does logging use correlation IDs via LoggerService?
   - Are Prometheus metrics exported if applicable?
   - Is documentation updated (JSDoc comments, README if needed)?
   - Are environment variables documented in .env.example?

3. **Verify Test Execution**:
   - Unit tests: `yarn run test`
   - E2E tests: `yarn run test:e2e`
   - Coverage: `yarn run test:cov` (verify 80% threshold)
   - Linting: `yarn run lint`
   - Build: `yarn run build`

4. **Check Observability**:
   - Verify structured logs include correlation IDs and ${input:requirementId} context
   - Confirm Prometheus metrics are exported if applicable (GET /metrics)
   - Test health checks at /health/liveness and /health/readiness

5. **Security Validation**:
   - Verify no secrets committed
   - Confirm input validation on all DTOs
   - Test authentication/authorization enforcement
   - Verify rate limiting applied to public endpoints

6. **Verify Traceability** (when reviewing the PR):
   - Ensure tests reference ${input:requirementId} in describe blocks
   - Verify SRS requirements are fully addressed
   - Check docs/architecture/traceability.md for correct component mapping
   - Verify ADR references are accurate

7. **Update Documentation** – If new patterns or conventions emerged, update:
   - .github/copilot-instructions.md
   - docs/architecture/ARCHITECTURE.md (if architecture changed)
   - README.md (if setup instructions changed)

## Quality Assurance

Throughout the process, ensure:

- **Consistency**: Follow NestJS patterns, TypeScript conventions, and project structure
- **Traceability**: Maintain clear links between requirements (REQ-\*), architecture components, implementation, and tests
- **Documentation**: Keep issue documentation accurate and aligned with SRS
- **Testing**: Comprehensive test coverage (80% target) with proper requirement references in describe blocks
- **Architecture**: Respect the NestJS modular monolith + TypeScript + Redis + Docker architecture
- **Security**: Apply authentication guards, input validation, rate limiting per requirements
- **Observability**: Use structured logging with correlation IDs, export Prometheus metrics
- **Interfaces**: Implement architecture-defined interfaces (IMetricComputation, ICacheService, ILRSClient)
- **Principles**: Apply SOLID/CUPID principles (ARCHITECTURE.md Section 12)

## Success Criteria

The requirement delegation is successful when:

1. ✅ All SRS requirements for ${input:requirementId} are analyzed and documented
2. ✅ Related requirements are identified and coordinated
3. ✅ GitHub issue is created with comprehensive implementation requirements using `mcp_github_create_issue`
4. ✅ GitHub Copilot coding agent is assigned to the issue using `mcp_github_assign_copilot_to_issue`
5. ✅ Full traceability requirements are specified in the GitHub issue
6. ✅ Implementation guidelines and project standards are clearly communicated in the issue
7. ✅ Acceptance criteria are properly included in the GitHub issue body

**Post-Implementation** (after remote agent completes work): 8. ✅ All tests pass with ${input:requirementId} traceability 9. ✅ Test coverage meets 80% target (REQ-NF-020) 10. ✅ GitHub issue is updated with implementation results using `mcp_github_update_issue` and `mcp_github_add_issue_comment` 11. ✅ Traceability matrix remains accurate (docs/architecture/traceability.md)

---

**EXECUTION PLAN**:

1. Complete Phase 1: Requirements Analysis & Traceability Check
2. Complete Phase 2: Create comprehensive GitHub issue using `mcp_github_create_issue`
3. Complete Phase 3: Assign GitHub Copilot coding agent to the issue using `mcp_github_assign_copilot_to_issue`
4. **STOP** - Remote agent will handle implementation
5. Phase 4 activities will be completed after the remote implementation is done (update issue with results)

**Start the analysis and delegation process now with requirement ID: ${input:requirementId}**
