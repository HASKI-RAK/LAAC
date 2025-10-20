# Stakeholder Requirements Specification (StRS)
This document outlines the stakeholder requirements for the project according to ISO/IEC/IEEE 29148:2018 (Stakeholder Needs and Requirements).

## Introduction

### Purpose of Stakeholder
Stakeholders are individuals or organizations that have an interest in the system being developed. They can include end-users, customers, project sponsors, regulatory bodies, and other parties affected by the system.

### Stakeholder Context
This document captures all high level needs and expectations of stakeholders informally. They are refined into formal requirements in the Software Requirements Specification [SRS](./SRS.md) document.

### Overview
This document is structured to provide a clear understanding of stakeholder needs, categorized by different stakeholder groups. Each need is assigned a unique identifier for traceability.
We identified the Developers to be the primary stakeholder group as the purpose of this project is to to develop and intermediate system which connects a learning record store and an ALS (Adaptive Learning System).

### Stakeholder Groups
| ID  | Stakeholder Group      | Type | Interests / Goals | Influence |
|-----|------------------------|------|-------------------|-----------|
| SG-1| Students               | Secondary | Adaptive Learning, Feedback, Accessibility | High      |
| SG-2| Educators              | Secondary | Curriculum Alignment, Student Engagement | High      |
| SG-3| Project Funding Bodies | Secondary | Cost Efficiency, Project Success | Medium    |
| SG-4| Developers            | Primary | Clear Requirements, Feasibility | Medium    |
| SG-5| Regulatory Bodies      | Secondary | Compliance, Data Privacy | High      |

## References
- ISO/IEC/IEEE 29148:2018 - Systems and software engineering — Life cycle processes — Requirements engineering
- [SRS Document](./SRS.md)
- [Metrics Specification](./Metrics-Specification.md)

## Stakeholder Needs
> SSOT: Each need is maintained as its own file under `docs/strs-needs/`.

- SG-4-001 — Developers: Intermediary between client backends and xAPI LRS → `docs/strs-needs/SG-4-001.md`
- SG-4-002 — Developers: Deployable as standalone service → `docs/strs-needs/SG-4-002.md`
- SG-4-003 — Developers: Generate learning analytics from LRS data per CSV → `docs/strs-needs/SG-4-003.md`
- SG-4-004 — Developers: Cache analytics results to avoid recomputation → `docs/strs-needs/SG-4-004.md`
- SG-4-005 — Developers: Well-documented API with Swagger/OpenAPI → `docs/strs-needs/SG-4-005.md`
- SG-4-006 — Developers: Rapidly add new metrics → `docs/strs-needs/SG-4-006.md`
- SG-4-007 — Developers: Portainer-based deployment & CI/CD → `docs/strs-needs/SG-4-007.md`
- SG-4-008 — Developers: Extensible, documented architecture (SOLID/CUPID, PlantUML) → `docs/strs-needs/SG-4-008.md`
- SG-4-009 — Developers: Observability (logs, metrics, tracing) → `docs/strs-needs/SG-4-009.md`
- SG-4-010 — Developers: Performance SLO ≤ 1s response → `docs/strs-needs/SG-4-010.md`
- SG-4-011 — Developers: API versioning and deprecation policy → `docs/strs-needs/SG-4-011.md`
- SG-4-012 — Developers: Multi-university instance support → `docs/strs-needs/SG-4-012.md`
- SG-1-001 — Students: Pseudonymized data storage and exposure → `docs/strs-needs/SG-1-001.md`
- SG-1-002 — Students: Data deletion on request → `docs/strs-needs/SG-1-002.md`
- SG-2-001 — Educators: Accurate analytics results → `docs/strs-needs/SG-2-001.md`
- SG-5-001 — Regulatory Bodies: Security baseline (authn/z, encryption, secrets) → `docs/strs-needs/SG-5-001.md`
