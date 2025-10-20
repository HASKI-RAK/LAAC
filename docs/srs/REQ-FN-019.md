---
id: REQ-FN-019
title: SOLID and CUPID Principles Guidance
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-008
owner: TODO
version: 0.1
---

## Description
The system shall provide documented guidance on applying SOLID and CUPID principles within the codebase, including concrete examples and patterns specific to this project's NestJS structure.

## Rationale
Ensures consistent application of software design principles across the team, improving code quality and maintainability.

## Acceptance Criteria
- A `docs/architecture/principles.md` document exists explaining:
  - SOLID principles (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion) with codebase-specific examples
  - CUPID principles (Composable, Unix philosophy, Predictable, Idiomatic, Domain-based) with codebase-specific examples
- Each principle includes:
  - Brief explanation in context of this project
  - At least one positive example from the codebase (what to do)
  - At least one anti-pattern to avoid (what not to do)
- Guidance references concrete modules, controllers, services, and interfaces
- Document is linked from README and contribution guide (REQ-FN-011)

## Verification
- Manual review confirms document completeness and clarity
- Examples compile and accurately reflect actual code
- Code review checklist references principles document

## Dependencies
- REQ-FN-018 (architecture documentation)
- REQ-FN-010 (metric extension architecture) provides examples

## Assumptions / Constraints
- Principles are applied pragmatically; perfection is not required but awareness and effort are expected

## API/Interface Impact
- None directly; guides internal code structure

## Observability
- None

## Risks / Open Questions
- None

## References
- Stakeholder Need(s): [SG-4-008](../strs-needs/SG-4-008.md)
- SOLID principles (Martin, Robert C.)
- CUPID principles (Nygard, Daniel)

## Change History
- v0.1 — Initial draft

