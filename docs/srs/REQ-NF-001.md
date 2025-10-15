
---
id: REQ-NF-001
title: Core Data Source Scope (xAPI LRS)
type: Non-Functional
status: Draft
priority: High
stakeholder_trace: SG-4-001
owner: TODO
version: 0.1
---


## Description
Core system interactions for analytics shall rely solely on an xAPI-compliant LRS as the authoritative data source. No additional non-xAPI data sources are required for core analytics functionality.


## Rationale
Constrains scope and positions the system clearly as a mediation layer between clients and an xAPI LRS.


## Acceptance Criteria
- Configuration and code paths for core analytics rely only on the LRS; other data sources (if any) are optional/plug-in and not required for core flows.
- Documentation states the xAPI LRS as the authoritative source for core analytics.


## Verification
- Architecture/design review confirms no mandatory dependencies beyond the LRS for core analytics.
- Tests exercise core analytics using only LRS input data.


## Dependencies
- Complements REQ-FN-001 and REQ-FN-002.


## Assumptions / Constraints
- Optional data sources may be added in the future as extensions but are not required for baseline operation.


## Observability
- None specific beyond existing observability requirements.

## Risks / Open Questions
- None yet.


## References
- Stakeholder Need(s): [SG-4-001](../strs-needs/SG-4-001.md)


## Change History
- v0.1 — Initial draft

