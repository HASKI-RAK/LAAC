# Implement REQ-FN-004: User-scoped LRS filtering for per-user metrics

## Quick Summary

Ensure per-user metrics query the LRS with an actor filter so results are computed per user and not across all users.

## Status

- **Created**: 2026-01-27
- **Status**: Ready for Implementation
- **Sprint**: SPRINT-3 (Story 3.x)
- **Story Points**: 3

---

## Requirement Traceability

**SRS Reference**: [docs/srs/REQ-FN-004.md](../srs/REQ-FN-004.md)  
**Type**: Functional  
**Priority**: High  
**Stakeholder**: SG-4-003  
**Architecture Module**: MetricsModule  
**Related Requirements**: REQ-FN-002, REQ-FN-005, REQ-FN-017  
**Traceability Status**: PARTIALLY_MAPPED  
**Implementation Notes**: LRS query layer currently does not apply actor filtering when userId is provided.

---

## Acceptance Criteria

### Primary Features

- [x] When `userId` is provided, LRS queries include the xAPI `agent` filter (account-based actor).
- [ ] Per-user metrics (e.g., course-total-score, course-time-spent) return different results for different users when data differs.
- [x] Metrics that do not require `userId` remain unchanged.

### Documentation & Discoverability

- [x] Requirement text references actor filtering for `userId`-scoped metrics.
- [x] API documentation for metrics results indicates user-scoped filtering behavior.
- [x] REQ-FN-004 referenced in code comments and tests for the change.

### Testing

- [x] Unit tests validate LRS query filters include actor when `userId` is passed.
- [ ] Metrics provider tests verify per-user isolation with mixed user statements.

---

## Verification Methods (from SRS)

1. Unit tests: query filter generation includes `agent` when userId is present.
2. E2E tests: per-user metrics return distinct values for different users in shared courses.
3. Manual verification: inspect LRS query logs for `agent` filter when userId is supplied.

---

## Definition of Done

- [ ] Files created per “Implementation Scope” below
- [ ] All acceptance criteria verified with checkboxes
- [ ] Unit tests written with >80% coverage and REQ-FN-004 traceability
- [ ] E2E tests passing (if API changes)
- [ ] No ESLint errors; code formatted with Prettier
- [ ] CI pipeline passes (lint, test, build)
- [ ] Code review completed and approved
- [ ] Requirement traceability verified in code comments

---

## Implementation Scope

**Action**: FULL_IMPLEMENTATION_AND_TESTS

**Description**: Add actor filtering to LRS queries for user-scoped metrics and verify per-user behavior in unit and E2E tests.

### Files to Create/Modify

| File                                             | Purpose                                      | Type   |
| ------------------------------------------------ | -------------------------------------------- | ------ |
| src/metrics/services/computation.service.ts      | Add actor filter when userId provided        | Modify |
| src/metrics/services/computation.service.spec.ts | Add unit test coverage for actor filtering   | Modify |
| docs/srs/REQ-FN-004.md                           | Require actor filter for user-scoped metrics | Modify |

## Architectural Context

**Module**: MetricsModule  
**Requires**: LRSClient, LRSQueryBuilder, Metric Providers

**Key Implementation Details**:

- Use account-based xAPI agent filter (homePage + account name). HomePage defaults to https://{instance}.moodle.haski.app derived from LRS endpoint.
- Maintain instance scoping per REQ-FN-017.
- Preserve current behavior for metrics without userId.

---

## Implementation Guidelines

**NestJS Patterns**:

- Maintain existing service/provider responsibilities.
- Do not add state to metric providers.

**Testing**:

- Unit test: verify LRS query filters include agent when `userId` is passed.
- E2E test: mock mixed-user statements and assert per-user aggregation.
- Reference `REQ-FN-004` in describe/it blocks.

**Security**:

- Validate userId input via existing DTO validation.

**Observability**:

- Log query filters with agent presence indicator (without PII).

---

## References

- **SRS**: [docs/srs/REQ-FN-004.md](../srs/REQ-FN-004.md)
- **Architecture**: [docs/architecture/ARCHITECTURE.md](../architecture/ARCHITECTURE.md)
- **Traceability**: [docs/architecture/traceability.md](../architecture/traceability.md)
- **Copilot Instructions**: [.github/copilot-instructions.md](../../.github/copilot-instructions.md)
- **Project Standards**: [.github/instructions/](../../.github/instructions/)

---

## Related Issues

- **Epic**: TBD
- **Dependency**: TBD
- **Related**: TBD

---

## Implementation Checklist

- [x] Code implementation started
- [x] Unit tests written
- [ ] E2E tests passing
- [x] Documentation updated
- [x] Code review requested
- [x] CI checks passing
- [ ] Ready for merge
