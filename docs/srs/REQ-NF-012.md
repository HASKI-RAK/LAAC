---
id: REQ-NF-012
title: Deployment Rollback and Recovery
type: Non-Functional
status: Draft
priority: High
stakeholder_trace: SG-4-007
owner: TODO
version: 0.1
---

## Description

The system shall support rapid deployment rollback and recovery through versioned Docker images, enabling operators to revert to a previous stable version within 5 minutes with zero data loss and minimal downtime. Deployments shall use rolling update strategies via Traefik to ensure service continuity during version transitions.

## Rationale

Production systems require the ability to quickly recover from failed deployments or discovered issues. Versioned container images combined with orchestrated rolling updates provide a reliable rollback mechanism that minimizes risk and downtime. This supports the DevOps requirement for automated, consistent deployment flows (SG-4-007) and ensures system reliability.

## Acceptance Criteria

- Docker images are tagged with both semantic version and commit SHA (e.g., `v1.2.3`, `sha-a1b2c3d`)
- A `latest` tag always points to the most recent stable production release
- Docker Compose configurations support rolling update strategies with health check validation
- Traefik load balancer performs zero-downtime rolling updates:
  - Starts new container version
  - Waits for health checks to pass (`/health/readiness`)
  - Routes traffic to new version
  - Gracefully terminates old version after drain period
- Rollback can be executed via:
  - Portainer: Selecting previous image tag and redeploying stack
  - Command line: `docker-compose up -d --force-recreate` with previous image tag
  - CI/CD: Triggering deployment workflow with previous version tag
- Rollback time from decision to completion: ≤ 5 minutes
- No data loss during rollback (Redis cache and LRS data unaffected)
- Deployment history maintained with image tags and timestamps
- Documentation includes step-by-step rollback procedures for common failure scenarios

## Verification

- **Manual Testing**:
  - Deploy version N, verify functionality
  - Deploy version N+1 with intentional breaking change
  - Execute rollback to version N
  - Verify system returns to stable state within 5 minutes
  - Confirm no data loss in Redis cache or LRS queries
- **E2E Tests**:
  - Automated deployment test with version rollback scenario
  - Health check validation during rolling update
  - Cache consistency verification pre/post rollback
- **CI/CD Validation**:
  - Pipeline produces tagged images with version and SHA
  - Deployment workflow supports version parameter for rollback
  - GitHub Container Registry (GHCR) retains minimum 10 previous versions
- **Documentation Review**:
  - Rollback procedures documented in README.md or `docs/operations.md`
  - Failure scenario playbook includes rollback steps

## Dependencies

- **REQ-FN-012**: Container Image Build and Registry (versioned images)
- **REQ-FN-013**: Docker Compose Configurations (deployment manifests)
- **REQ-FN-015**: CI/CD Pipeline with GitHub Actions (automated tagging)
- **REQ-NF-002**: Standalone Deployability (health checks for rollout validation)
- **REQ-NF-011**: Deployment Automation and Reliability (automated deployment flows)
- **External**: Portainer API/webhook for deployment triggering, Traefik reverse proxy for traffic routing

## Assumptions / Constraints

- **Image Registry**: GitHub Container Registry (GHCR) or compatible registry with retention policy
- **Orchestration**: Docker Compose with Traefik for production deployments (Kubernetes/Swarm optional future)
- **Stateless Application**: LAAC instances are stateless; rollback affects application code only, not persistent data
- **Shared State**: Redis cache is external to application containers; cache invalidation may be required post-rollback if data format changes
- **Version Retention**: Minimum 10 previous image versions retained in registry
- **Health Check Reliability**: Readiness checks (`/health/readiness`) must accurately reflect application health for safe rolling updates
- **Drain Period**: 30-second grace period for in-flight requests before old container termination
- **Rollback Window**: 5-minute target from rollback decision to service restoration

## API/Interface Impact

- **Deployment API**: Portainer webhook/API accepts image tag parameter for version specification
- **Health Endpoints**: `/health/readiness` and `/health/liveness` used by Traefik for rollout validation
- **No User-Facing API Impact**: Rollback is an operational procedure transparent to API consumers

## Observability

- **Deployment Metrics** (Prometheus):
  - `deployment_version_info{version, sha}` — Gauge indicating current deployed version
  - `deployment_rollback_total` — Counter of rollback events
  - `deployment_rollback_duration_seconds` — Histogram of rollback completion times
  - `deployment_health_check_failures_total` — Counter of failed health checks during rollout
- **Logs**:
  - Structured log entry on application startup with version and SHA: `{"level":"info","message":"Application started","version":"v1.2.3","sha":"a1b2c3d"}`
  - Log entry on health check transitions: `{"level":"info","message":"Readiness check passed","endpoint":"/health/readiness"}`
  - Log entry on graceful shutdown: `{"level":"info","message":"Application shutting down","drainPeriod":"30s"}`
- **Alerts**:
  - Alert if readiness checks fail repeatedly during rollout (may indicate failed deployment)
  - Alert if rollback duration exceeds 5-minute SLO
- **Audit Trail**:
  - GitHub Actions workflow logs capture deployment trigger, image tag, and result
  - Portainer deployment history logs version transitions

## Risks / Open Questions

- **Risk**: Incompatible data format changes between versions may require cache invalidation or migration
  - **Mitigation**: Implement versioned cache keys (e.g., `cache:v1:metric:...`) and invalidate on version change
  - **Mitigation**: Document breaking changes in release notes; require manual cache flush for major versions
- **Risk**: Rollback does not address corrupted or inconsistent data in Redis or LRS
  - **Mitigation**: Separate data recovery procedures for persistent state (LRS backups, Redis snapshots)
  - **Scope**: This requirement covers application code rollback only, not data recovery
- **Risk**: Traefik configuration drift may cause routing issues during rolling update
  - **Mitigation**: Version control Traefik configuration; include in Docker Compose manifest
  - **Verification**: E2E test validates Traefik routing during rollout
- **Open Question**: Should rollback be fully automated on health check failure, or require manual approval?
  - **Current Approach**: Manual rollback via Portainer or CI/CD workflow
  - **Future**: Consider automated rollback policy with alerting (ADR required)
- **Open Question**: How to handle database schema migrations in future (if database added)?
  - **Current Scope**: Out of scope (no database in baseline architecture)
  - **Future**: Migration rollback strategy required if database introduced

## References

- **Stakeholder Need(s)**: [SG-4-007](../strs-needs/SG-4-007.md) — DevOps deployment automation
- **Architecture**: `docs/architecture/ARCHITECTURE.md` Section 5.1 (Deployment Strategy)
- **Related Requirements**:
  - [REQ-FN-012](REQ-FN-012.md) — Container Image Build and Registry
  - [REQ-FN-013](REQ-FN-013.md) — Docker Compose Configurations
  - [REQ-FN-015](REQ-FN-015.md) — CI/CD Pipeline with GitHub Actions
  - [REQ-NF-002](REQ-NF-002.md) — Standalone Deployability (health checks)
  - [REQ-NF-011](REQ-NF-011.md) — Deployment Automation and Reliability
- **External References**:
  - [Docker Compose rolling updates](https://docs.docker.com/compose/compose-file/#update_config)
  - [Traefik health checks](https://doc.traefik.io/traefik/routing/services/#health-check)
  - [Portainer stack deployment API](https://docs.portainer.io/api/docs)

## Change History

- v0.1 — 2025-11-10 — Initial draft with rollback procedures, versioned images, rolling update strategy, and observability requirements
