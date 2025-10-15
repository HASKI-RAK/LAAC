---
id: REQ-FN-011
title: Metric Contribution Guide and Templates
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-006
owner: TODO
version: 0.1
---

## Description
The system shall provide a documented contribution guide and scaffolding templates (or examples) for adding new metrics, covering the full lifecycle: implementation, testing, API wiring, and documentation.

## Rationale
Reduces onboarding time and ensures consistency across metrics contributed by different developers.

## Acceptance Criteria
- A contribution guide (in README or docs/) documents the step-by-step process: implement interface, add tests, register in module, update catalog/metadata, annotate for OpenAPI.
- A template file or generator script (e.g., CLI command or boilerplate file) provides a starting point for a new metric with placeholder implementation, test stubs, and annotations.
- At least one example metric is provided as a reference implementation.
- Guide includes checklist for PR/review: interface implementation, unit tests, E2E test path, OpenAPI annotations, catalog entry.

## Verification
- Manual review confirms guide completeness and clarity.
- Developer walkthrough: a new contributor follows the guide to add a test metric within the target lead time (see REQ-NF-009).
- CI enforces checklist items (tests, docs) for new metrics.

## Dependencies
- REQ-FN-010 (extension architecture).
- REQ-FN-008 (OpenAPI annotations).

## Assumptions / Constraints
- Guide assumes familiarity with NestJS and TypeScript.

## API/Interface Impact
- None directly; supports internal development process.

## Observability
- None.

## Risks / Open Questions
- None.

## References
- Stakeholder Need(s): [SG-4-006](../strs-needs/SG-4-006.md)

## Change History
- v0.1 — Initial draft

