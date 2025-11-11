# Feature Implementation Template Guide

**Purpose**: Standardize the creation and tracking of feature implementation issues across the LAAC project. This guide explains each section of the template and best practices for filling it out.

---

## Overview

The Feature Implementation template is designed for any issue that implements a requirement from the Software Requirements Specification (SRS). It enforces:

- ✅ **Traceability**: Clear links to SRS requirements (REQ-ID)
- ✅ **Scope Clarity**: Defined acceptance criteria and Definition of Done
- ✅ **Architecture Alignment**: Mapped to NestJS modules and architectural patterns
- ✅ **Quality**: Built-in testing and review checkpoints
- ✅ **Documentation**: Observability and implementation guidance for developers

---

## Section-by-Section Guide

### Quick Summary

**What**: 1-2 sentence overview of the feature  
**Why**: Helps reviewers and Copilot quickly understand scope  
**Example**: "Implement public Prometheus metrics endpoint exposing HTTP request metrics, cache hit ratios, and LRS query latency."

---

### Status

**What**: Issue metadata (creation date, current status, sprint assignment, story points)  
**Why**: Enables sprint board tracking and velocity calculation  
**Values**:

- `Ready for Implementation` — All details finalized, awaiting assignment
- `In Progress` — Actively being worked on
- `In Review` — Code review requested
- `Blocked` — Waiting for dependencies

---

### Requirement Traceability

**SRS Reference**: Link to the requirement file (e.g., `docs/srs/REQ-FN-003.md`)

**Type**: `Functional` (implements user-facing capability) or `Non-Functional` (implements quality/performance property)

**Priority**: From SRS file (High/Medium/Low)

**Stakeholder**: Stakeholder Needs reference (e.g., SG-4-009) — helps understand who requested this

**Architecture Module**: NestJS module name (e.g., `MetricsModule`, `AdminModule`)

**Related Requirements**: Other REQ-IDs that are related (e.g., REQ-FN-006 for cache metrics)

**Traceability Status**:

- `IMPLEMENTED` — Feature fully coded, needs test coverage
- `PARTIALLY_MAPPED` — Some code exists, needs completion
- `NOT_MAPPED` — No code exists, full implementation needed

**Implementation Notes**: Warnings about duplicate work, deferred phases, or special constraints

---

### Acceptance Criteria

**Structure**: Organized into logical subsections (e.g., "API Endpoints", "Documentation", "Testing")

**Format**: Checkbox items that are specific and measurable

**Key Principle**: Each checkbox is a "Definition of Done" item — if unchecked, the feature is incomplete

**Example**:

```
### Admin Cache Invalidation Endpoint
- [ ] POST /admin/cache/invalidate endpoint exists
- [ ] Endpoint protected with @RequireScopes('admin:cache')
- [ ] Request body validated with DTO
- [ ] Returns 200 on success, 400 on validation error
```

---

### Verification Methods

**What**: Test and validation approaches from the SRS  
**Why**: Ensures acceptance criteria are testable  
**Example**:

```
1. Unit tests: DTO validation with valid/invalid payloads
2. E2E tests: Endpoint rejects unauthorized requests with 403
3. Manual verification: Swagger UI shows endpoint documented
```

---

### Definition of Done

**What**: Final checklist before marking issue complete  
**Why**: Enforces quality standards (tests, linting, reviews)  
**Core Items**:

- Files created per scope
- > 80% test coverage with REQ-ID traceability
- No linting errors
- CI pipeline passes
- Code review approved

**Note**: This is more comprehensive than acceptance criteria — it includes engineering practices.

---

### Implementation Scope

**Action** (choose one):

- `FULL_IMPLEMENTATION_AND_TESTS` — Build from scratch + all tests
- `TESTS_ONLY` — Code exists, needs comprehensive test coverage
- `ARCHITECTURE_INTEGRATION` — Code exists, needs integration and guards
- `REVIEW_ONLY` — Code exists, needs verification against SRS

**Description**: Narrative summary of what will be done

**Files Table**: Clear list of which files to create/modify and why

---

### Architectural Context

**Module**: NestJS module that owns this feature (e.g., `MetricsModule`)

**Requires**: Dependencies on other modules or services (e.g., `AuthModule`, `LoggerService`)

**Key Implementation Details**: Design patterns, integration points, constraints

**Schemas** (if applicable): TypeScript interfaces showing request/response structure

---

### Implementation Guidelines

**NestJS Patterns**: How to structure controllers, services, DTOs for this feature

**Testing**: Specific unit test strategy (mocking approach) and E2E test bootstrap

**Security**: Guards to apply, scopes to enforce, input validation rules

**Observability**: What to log, which metrics to track, correlation ID usage

**Example Test Structure**: Template showing how to organize tests with REQ-ID traceability

---

### References

**Links to**:

- SRS file for this requirement
- Architecture documentation
- Traceability matrix
- Project-wide guidelines (Copilot instructions, backend standards)

**Why**: Provides single place to find all supporting documentation

---

### Related Issues

**Epic**: Parent epic or feature group this belongs to

**Dependency**: Issues that must be completed first

**Related**: Similar or related work items

---

### Implementation Checklist

**Purpose**: Quick visual indicator of progress through implementation phases

**Items**:

- Code implementation started
- Unit tests written
- E2E tests passing
- Documentation updated
- Code review requested
- CI checks passing
- Ready for merge

---

## How to Use This Template

### When Creating an Issue

1. **Open the template**: Use GitHub's "Issue Templates" or copy from `.github/issue-templates/feature-implementation.md`
2. **Fill in systematically**: Start with Requirement Traceability (extract from SRS file)
3. **Define scope clearly**: List exactly which files will be created/modified
4. **Provide implementation guidance**: Include patterns, examples, and references
5. **Assign and label**: Add `sprint:current`, `requirement`, and priority labels

### When Assigning to Copilot

1. Ensure all required sections are filled in
2. Verify links to SRS files are correct
3. Confirm Architecture Module matches `src/*/` folder structure
4. Use `@mcp_github_github_assign_copilot_to_issue` tool

### When Reviewing Implementation

1. Check acceptance criteria are all addressed
2. Verify test coverage >80% and includes REQ-ID in describe blocks
3. Confirm no ESLint errors and code formatted
4. Validate CI pipeline passes
5. Update issue status to reflect progress

---

## Best Practices

### Traceability

- Always include REQ-ID in issue title: `Implement REQ-FN-003: [Feature]`
- Reference REQ-ID in test describe blocks: `describe('REQ-FN-003: Metrics Catalog')`
- Add inline code comments referencing REQ-ID for complex logic

### Scope Clarity

- Use "Files to Create/Modify" table for precise file list
- Separate "what" (acceptance criteria) from "how" (implementation guidelines)
- Include concrete examples (DTOs, endpoints, test structure)

### Quality Gates

- Definition of Done includes both acceptance criteria AND engineering practices
- Never skip test coverage or linting checks
- Always require code review before merge

### Documentation

- Link to SRS files early (before implementation starts)
- Update Architecture Module if new modules are introduced
- Add observability guidance (logging, metrics, health checks)

### Dependencies

- List related issues clearly
- Flag blockers in Implementation Notes
- Defer Phase 2+ work clearly (don't implement out of scope)

---

## Example: Completed Issue Using This Template

See the following sprint issues for real-world examples:

- [#25](https://github.com/HASKI-RAK/LAAC/issues/25) — REQ-FN-003: Metrics Catalog Endpoints
- [#26](https://github.com/HASKI-RAK/LAAC/issues/26) — REQ-FN-007: Admin Cache Invalidation
- [#27](https://github.com/HASKI-RAK/LAAC/issues/27) — REQ-FN-021: Prometheus Metrics Endpoint

These follow the formalized template and demonstrate best practices.

---

## Maintenance

This template should be reviewed quarterly or when:

- New architectural patterns are introduced
- Testing standards change
- Project structure evolves
- Requirements coverage expands

**Last Updated**: 2025-11-11  
**Maintainer**: Architecture Team
