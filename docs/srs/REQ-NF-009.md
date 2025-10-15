---
id: REQ-NF-009
title: Metric Development Velocity and Lead Time
type: Non-Functional
status: Draft
priority: High
stakeholder_trace: SG-4-006
owner: TODO
version: 0.1
---

## Description
Adding a simple new metric (standard aggregation over xAPI statements) shall take ≤ 1 developer-day including implementation, unit/E2E tests, and documentation updates, measured and validated on representative examples.

## Rationale
Ensures the extension architecture delivers on the promise of rapid metric addition.

## Acceptance Criteria
- Lead time target: ≤ 1 day for a simple metric (e.g., total time spent, completion count).
- Measured on at least two example metrics during initial development or pilot phase.
- Contributing developer completes a retrospective or checklist confirming steps and time.
- Complex metrics (multi-source, novel algorithms) may exceed this target but should follow the same process.

## Verification
- Developer walkthrough and time tracking for example metrics.
- Retrospective notes included in project documentation.

## Dependencies
- REQ-FN-010 (extension architecture).
- REQ-FN-011 (contribution guide/templates).

## Assumptions / Constraints
- "Simple metric" defined as: single LRS query pattern, standard aggregation (sum/count/avg/max), no external dependencies.
- Developer is familiar with NestJS and TypeScript.

## Observability
- None directly; tracked via development process metrics.

## Risks / Open Questions
- Initial metrics may take longer as patterns stabilize; target is aspirational and iteratively validated.

## References
- Stakeholder Need(s): [SG-4-006](../strs-needs/SG-4-006.md)

## Change History
- v0.1 — Initial draft

