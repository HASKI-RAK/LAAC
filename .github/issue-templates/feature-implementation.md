---
name: Feature Implementation
about: Implement a system feature from SRS requirements with full traceability
title: 'Implement [REQ-ID]: [Feature Name]'
labels: ['feature', 'requirement']
assignees: []
---

<!--
This template is for implementing features that are derived from the Software Requirements Specification (SRS).
Each feature corresponds to a specific requirement ID (REQ-FN-* or REQ-NF-*) and should follow the traceability guidelines.
-->

## Quick Summary

<!-- 1-2 sentence summary of what this feature implements -->

## Status

- **Created**: [YYYY-MM-DD]
- **Status**: Ready for Implementation
- **Sprint**: SPRINT-N (Story X.Y)
- **Story Points**: [Number]

---

## Requirement Traceability

**SRS Reference**: [docs/srs/REQ-ID.md](../../../docs/srs/REQ-ID.md)  
**Type**: Functional / Non-Functional  
**Priority**: High / Medium / Low  
**Stakeholder**: [SG-#-###]  
**Architecture Module**: [ModuleName]  
**Related Requirements**: [REQ-IDs]  
**Traceability Status**: IMPLEMENTED / PARTIALLY_MAPPED / NOT_MAPPED  
**Implementation Notes**: [Any warnings or dependencies]

---

## Acceptance Criteria

### Primary Features

- [ ] Specific, testable criteria from SRS
- [ ] Clear success indicators
- [ ] Measurable outcomes

### Documentation & Discoverability

- [ ] Feature documented with appropriate decorators/comments
- [ ] API documentation updated (if applicable)
- [ ] REQ-ID explicitly referenced in code and tests

### Testing

- [ ] Unit tests written with >80% coverage
- [ ] E2E tests cover main flows
- [ ] Authorization/security tests included (if applicable)

---

## Verification Methods (from SRS)

1. **Method 1**: Specific verification approach
2. **Method 2**: Additional validation
3. **Method 3**: Manual verification steps

---

## Definition of Done

- [ ] Files created per "Implementation Scope" below
- [ ] All acceptance criteria verified with checkboxes
- [ ] Unit tests written with >80% coverage and REQ-ID traceability
- [ ] E2E tests passing (if API changes)
- [ ] No ESLint errors; code formatted with Prettier
- [ ] CI pipeline passes (lint, test, build)
- [ ] Code review completed and approved
- [ ] Requirement traceability verified in code comments

---

## Implementation Scope

**Action**: FULL_IMPLEMENTATION_AND_TESTS / TESTS_ONLY / ARCHITECTURE_INTEGRATION / REVIEW_ONLY

**Description**: Clear phase and scope statement

### Files to Create/Modify

| File                        | Purpose           | Type          |
| --------------------------- | ----------------- | ------------- |
| `src/path/file.ts`          | Brief description | Create/Modify |
| `src/path/file.spec.ts`     | Unit tests        | Create        |
| `test/e2e/file.e2e-spec.ts` | E2E tests         | Create        |

---

## Architectural Context

**Module**: [NestJS Module Name]  
**Requires**: [Dependencies: ModuleName, ServiceName, etc.]

**Key Implementation Details**:

- [Design pattern or approach]
- [Integration points]
- [Important constraints]

**Response/Request Schemas** (if applicable):

```typescript
interface ExampleRequest {
  field: string;
  // schema definition
}

interface ExampleResponse {
  status: string;
  // response structure
}
```

---

## Implementation Guidelines

**NestJS Patterns**:

- [Controller/Service pattern details]
- [DI injection approach]
- [Guard/Middleware application]

**Testing**:

- Unit test: [Approach and mocking strategy]
- E2E test: [Real app bootstrap, request patterns]
- Reference `REQ-ID` in describe/it blocks

**Security**:

- [Auth guards to apply]
- [Input validation requirements]
- [Scope enforcement if needed]

**Observability**:

- [Logging strategy]
- [Metrics to track (if applicable)]
- [Correlation ID usage]

**Example Test Structure**:

```typescript
describe('REQ-ID: Feature Name', () => {
  describe('Primary Feature', () => {
    it('should implement feature correctly', async () => {
      // Test implementation
    });
  });
});
```

---

## References

- **SRS**: [docs/srs/REQ-ID.md](../../../docs/srs/REQ-ID.md)
- **Architecture**: [docs/architecture/ARCHITECTURE.md](../../../docs/architecture/ARCHITECTURE.md)
- **Traceability**: [docs/architecture/traceability.md](../../../docs/architecture/traceability.md)
- **Copilot Instructions**: [.github/copilot-instructions.md](../../../.github/copilot-instructions.md)
- **Project Standards**: [.github/instructions/](../../../.github/instructions/)

---

## Related Issues

- **Epic**: [#N](https://github.com/HASKI-RAK/LAAC/issues/N) — Parent epic or feature group
- **Dependency**: [#N](https://github.com/HASKI-RAK/LAAC/issues/N) — Related features or blockers
- **Related**: [#N](https://github.com/HASKI-RAK/LAAC/issues/N) — Related work items

---

## Implementation Checklist

- [ ] Code implementation started
- [ ] Unit tests written
- [ ] E2E tests passing
- [ ] Documentation updated
- [ ] Code review requested
- [ ] CI checks passing
- [ ] Ready for merge
