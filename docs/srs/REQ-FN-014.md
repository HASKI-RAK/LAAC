---
id: REQ-FN-014
title: Secrets and Configuration Management
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-007, SG-5-001
owner: TODO
version: 0.1
---

## Description
The system shall manage secrets and sensitive configuration via environment variables or container orchestration secrets (Portainer/Docker secrets), ensuring no secrets are committed to the repository. A `.env.example` file shall document all required variables.

## Rationale
Prevents credential leaks and supports secure deployment across environments.

## Acceptance Criteria
- A `.env.example` file lists all required environment variables with placeholder values and descriptions.
- Actual `.env` files and any secret files are listed in `.gitignore`.
- Application reads configuration from environment variables at runtime.
- Compose files and deployment docs describe how to inject secrets (e.g., Portainer secrets, Docker secrets, or environment files).
- CI pipeline uses repository secrets for registry credentials and Portainer webhook URLs; no hardcoded secrets in workflow files.

## Verification
- Grep/CI check confirms no secrets (passwords, tokens, API keys) in committed files.
- Manual review of `.env.example` confirms completeness.
- CI job uses secrets from repository settings (validated by successful auth to registry and Portainer).

## Dependencies
- REQ-FN-013 (Docker Compose configurations).
- REQ-NF-002 (standalone deployability).
- Security baseline (see SG-5-001 derived requirements).

## Assumptions / Constraints
- Secrets rotation and management are handled externally (e.g., by ops team or secret manager).

## API/Interface Impact
- None directly; affects deployment and configuration.

## Observability
- Startup logs confirm successful loading of configuration (non-secret values) and flag missing required vars.

## Risks / Open Questions
- None.

## References
- Stakeholder Need(s): [SG-4-007](../strs-needs/SG-4-007.md), [SG-5-001](../strs-needs/SG-5-001.md)

## Change History
- v0.1 — Initial draft

