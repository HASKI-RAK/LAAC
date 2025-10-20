---
id: REQ-FN-018
title: Architecture Documentation with PlantUML Diagrams
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-008
owner: TODO
version: 0.1
---

## Description
The system shall maintain architecture documentation in a dedicated `docs/architecture/` folder, including PlantUML diagrams (`.puml` files) and design documents covering system overview, module boundaries, data flows, and request lifecycles.

## Rationale
Provides a single source of truth for system design, enabling developers and GenAI assistants to understand and extend the codebase effectively.

## Acceptance Criteria
- A `docs/architecture/` folder exists with:
  - PlantUML diagrams (`.puml` files) for: system overview, module/component structure, data flows, key request lifecycles (e.g., analytics computation flow)
  - Design documents (`.md` files) accompanying diagrams with explanations, rationale, and mapping to concrete modules/controllers/services
- Diagrams name key extension points (e.g., Metric interface, registry, LRS client adapter)
- README links to architecture documentation with a brief overview
- Documentation includes instructions to generate/preview PlantUML diagrams locally (CLI or VS Code plugin)
- A script or command placeholder validates diagram syntax (e.g., `yarn docs:validate` or TODO if tooling pending)

## Verification
- Manual review confirms presence and completeness of diagrams and docs
- Diagrams render correctly using PlantUML tools
- Architecture docs accurately reflect current codebase structure (spot-check against actual modules)

## Dependencies
- REQ-FN-010 (metric extension architecture) provides key extension points to document
- REQ-NF-013 (architecture maintenance policy)

## Assumptions / Constraints
- PlantUML is the standard diagramming format
- NestJS module structure is the primary organizational unit
- Diagrams are versioned with code in the repository

## API/Interface Impact
- None directly; supports development and maintenance

## Observability
- None

## Risks / Open Questions
- Keeping diagrams current requires discipline; tracked under REQ-NF-013

## References
- Stakeholder Need(s): [SG-4-008](../strs-needs/SG-4-008.md)

## Change History
- v0.1 — Initial draft

