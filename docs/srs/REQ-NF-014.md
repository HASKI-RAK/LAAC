---
id: REQ-NF-014
title: Architecture Documentation Currency and Maintenance
type: Non-Functional
status: Draft
priority: High
stakeholder_trace: SG-4-008
owner: TODO
version: 0.1
---

## Description
Architecture documentation and diagrams shall be kept current with the codebase, with updates required when significant structural changes are merged, and a documented policy for maintaining documentation currency.

## Rationale
Outdated documentation is worse than no documentation; maintaining currency ensures docs remain a reliable reference.

## Acceptance Criteria
- A maintenance policy is documented (in README or `docs/architecture/`) stating:
  - Architecture docs must be updated when: adding/removing modules, changing key interfaces, modifying data flows, or altering deployment structure
  - PR checklist includes "Update architecture docs if applicable"
  - Quarterly review of architecture docs for accuracy (scheduled or on-demand)
- Diagrams include a "Last Updated" comment or metadata field with date and reason
- Major refactors or feature additions include architecture doc updates in the same PR or follow-up PR
- CI validation (future TODO): automated check to detect major code structure changes without corresponding doc updates (e.g., new modules without diagram updates)

## Verification
- Manual review of recent PRs confirms architecture updates accompany structural changes
- Quarterly review audit confirms docs are current
- PR template or checklist includes architecture doc reminder

## Dependencies
- REQ-FN-018 (architecture documentation)

## Assumptions / Constraints
- Perfect synchronization is aspirational; reasonable currency (within 1-2 sprints) is acceptable

## Observability
- None directly; tracked via PR reviews and periodic audits

## Risks / Open Questions
- Enforcement relies on discipline; consider automation (e.g., structure diff tools) as future enhancement

## References
- Stakeholder Need(s): [SG-4-008](../strs-needs/SG-4-008.md)

## Change History
- v0.1 — Initial draft

