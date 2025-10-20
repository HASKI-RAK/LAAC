---
id: REQ-NF-015
title: Developer Onboarding and Architecture Comprehension
type: Non-Functional
status: Draft
priority: Medium
stakeholder_trace: SG-4-008
owner: TODO
version: 0.1
---

## Description
New developers (including bachelor thesis students and GenAI assistants) shall be able to understand the system architecture and begin productive contribution within a defined onboarding period, aided by architecture documentation and contribution guides.

## Rationale
Reduces time-to-productivity and improves quality of contributions from new team members.

## Acceptance Criteria
- Target onboarding time: A new developer familiar with NestJS and TypeScript can understand the system architecture and complete a small feature (e.g., add a simple metric) within 2-3 days, including:
  - Day 1: Read architecture docs, understand module structure, run dev environment
  - Days 2-3: Implement a test metric following contribution guide (REQ-FN-011)
- Architecture documentation includes:
  - "Getting Started" section with quick architecture overview
  - Glossary of key terms and concepts
  - Links to key modules and extension points
- Onboarding checklist provided in README or `docs/onboarding.md`
- At least one walkthrough or tutorial demonstrating a common contribution path (e.g., adding a metric)

## Verification
- Onboarding trial: Have a new developer or intern complete onboarding and provide feedback on time and clarity
- Documentation review confirms presence of getting started guide and glossary
- Survey new contributors for comprehension and time-to-productivity

## Dependencies
- REQ-FN-018 (architecture documentation)
- REQ-FN-019 (SOLID/CUPID guidance)
- REQ-FN-011 (contribution guide)

## Assumptions / Constraints
- Assumes familiarity with NestJS, TypeScript, and basic xAPI concepts
- Target is for small-to-medium contributions; complex features may require additional time

## Observability
- Track time-to-first-PR and feedback from new contributors

## Risks / Open Questions
- None

## References
- Stakeholder Need(s): [SG-4-008](../strs-needs/SG-4-008.md)

## Change History
- v0.1 — Initial draft

