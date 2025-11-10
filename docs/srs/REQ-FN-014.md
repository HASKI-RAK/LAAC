---
id: REQ-FN-014
title: Secrets and Configuration Management (Multi-LRS)
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-007, SG-5-001, SG-4-012
owner: TODO
version: 0.2
---

## Description

The system shall manage secrets and sensitive configuration for multiple LRS instances via environment variables or container orchestration secrets (Portainer/Docker secrets), ensuring no secrets are committed to the repository. A `.env.example` file shall document all required variables for all LRS instances.

## Rationale

Prevents credential leaks and supports secure deployment across environments.

## Acceptance Criteria

- **Configuration Documentation**: A `.env.example` file lists all required environment variables with placeholder values and descriptions:
  - Multi-LRS configuration variables (`LRS_INSTANCES` JSON or per-instance env vars)
  - JWT/authentication secrets (`JWT_SECRET`, `JWT_ISSUER`)
  - Redis connection details (`REDIS_HOST`, `REDIS_PASSWORD`)
  - Application settings (`PORT`, `LOG_LEVEL`, `NODE_ENV`)
  - Example multi-LRS configuration formats documented inline
- **Secret Exclusion**: Actual `.env` files, `*.secret`, and any credential files are listed in `.gitignore`.
- **Runtime Configuration**: Application reads configuration from environment variables at startup:
  - Validates required variables presence before starting services
  - Logs non-sensitive config values for verification (e.g., endpoint URLs without credentials)
  - Fails fast with clear error messages for missing/invalid secrets
- **Multi-LRS Credential Storage**: Supports two configuration patterns:
  - **Pattern 1 (JSON)**: Single `LRS_INSTANCES` env var with JSON array containing all instances and embedded credentials
  - **Pattern 2 (Prefixed)**: Individual env vars per instance: `LRS_{INSTANCE_ID}_ENDPOINT`, `LRS_{INSTANCE_ID}_USERNAME`, `LRS_{INSTANCE_ID}_PASSWORD`
  - Credentials stored as Docker secrets in production, referenced via `_FILE` suffix convention (e.g., `LRS_HS_KE_PASSWORD_FILE=/run/secrets/lrs_hs_ke_password`)
- **Deployment Secret Injection**: Compose files and deployment docs describe secure secret injection:
  - Development: `.env` file with placeholder credentials
  - Production: Docker secrets or Portainer secret management
  - Kubernetes: Secret resources mounted as volumes or env vars
- **CI/CD Secret Management**: CI pipeline uses repository secrets:
  - Registry credentials for Docker push
  - Portainer webhook URLs for deployment triggers
  - Test LRS credentials for integration tests (separate from production)
  - No hardcoded secrets in workflow files or commit history

## Verification

- **Secret Leak Prevention**:
  - Pre-commit hooks scan for patterns matching secrets (passwords, tokens, API keys)
  - CI grep check confirms no secrets in committed files (fails build if detected)
  - GitHub secret scanning enabled for repository
- **Configuration Completeness**:
  - Manual review of `.env.example` confirms all required variables documented
  - Automated test validates application startup with `.env.example` values (fails if missing required vars)
  - Documentation includes example multi-LRS configuration for both JSON and prefixed patterns
- **CI/CD Secret Usage**:
  - Integration tests run against mock LRS using repository secrets
  - CI job successfully authenticates to registry and Portainer using secrets (not hardcoded)
  - Test matrix covers both configuration patterns (JSON and prefixed env vars)

## Dependencies

- REQ-FN-002 (Multi-LRS integration) — provides credential requirements for each instance
- REQ-FN-013 (Docker Compose configurations) — uses secret injection mechanisms
- REQ-NF-002 (Standalone deployability) — ensures self-contained config
- REQ-NF-019 (Security baseline) — defines secure secret storage requirements
- SG-5-001 (Security stakeholder need) — drives encryption and secret management

## Assumptions / Constraints

- Secrets rotation and management are handled externally (e.g., by ops team or secret manager).

## API/Interface Impact

- None directly; affects deployment and configuration.

## Observability

- **Startup Logging**: Application logs confirm successful configuration loading:
  - Number of LRS instances configured (without logging credentials)
  - Endpoint URLs for each instance (redacted credentials)
  - Redis connection status
  - Missing/invalid configuration variables logged as errors with remediation hints
- **Configuration Validation Metrics**:
  - `config_validation_failures_total{reason}` — counter for config errors at startup
  - `lrs_instances_configured` — gauge showing number of configured instances
- **Secret Rotation Support**: Logs indicate when secrets are loaded from `_FILE` paths for Docker secrets pattern

## Risks / Open Questions

- None.

## References

- Stakeholder Need(s): [SG-4-007](../strs-needs/SG-4-007.md), [SG-5-001](../strs-needs/SG-5-001.md)

## Change History

- v0.2 — Extended to support multi-LRS credential management with pattern documentation
- v0.1 — Initial draft
