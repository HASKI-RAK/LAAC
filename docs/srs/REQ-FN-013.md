---
id: REQ-FN-013
title: Docker Compose Configurations (Dev and Prod)
type: Functional
status: Draft
priority: Medium
stakeholder_trace: SG-4-007
owner: TODO
version: 0.1
---

## Description
The system shall provide Docker Compose configurations for development (`docker-compose.dev.yml`) and production (`docker-compose.yml`) environments, documenting service definitions, networking, volumes, and environment variable injection.

## Rationale
Simplifies local development and provides a reference deployment configuration for Portainer stacks.

## Acceptance Criteria
- `docker-compose.dev.yml` includes: app service with hot-reload (bind mounts or watch), mock/local LRS (or external service reference), and any dev-specific tools (e.g., debugger ports).
- `docker-compose.yml` (production) includes:
  - App service using the registry image with restart policy (`restart: always`)
  - Health checks and environment variable injection
  - Traefik labels for reverse proxy integration: `traefik.enable`, router rules with `Host()`, entrypoints (`websecure`), TLS with cert resolver, and service port
  - External `traefik_web` network for Traefik integration
  - Named volumes for persistent data
  - Environment variables: `SUBDOMAIN`, `DOMAIN_NAME`, `GENERIC_TIMEZONE`, and app-specific vars from `.env` file
- Both files reference a `.env.example` for required variables; actual `.env` files are gitignored.
- README documents how to start each environment (`docker compose -f <file> up`) and required Traefik network setup.
- Production compose follows Portainer stack deployment patterns (version 3.8+, external networks, labeled services).

## Verification
- Manual test: `docker compose -f docker-compose.dev.yml up` starts the dev environment and app responds.
- Manual test: `docker compose -f docker-compose.yml up` starts the prod-like environment with registry image.
- Validation: `docker compose config` parses both files without errors.
- Production deployment: Stack deploys in Portainer with external `traefik_web` network and Traefik routes traffic correctly via configured labels.
- Health check endpoint accessible through Traefik reverse proxy at configured domain.

## Dependencies
- REQ-FN-012 (container image).
- REQ-FN-014 (secrets handling).

## Assumptions / Constraints
- Compose file version ≥ 3.8 (or compatible with Portainer).
- Traefik reverse proxy is pre-configured in the target environment with `traefik_web` external network and Let's Encrypt cert resolver (`le`).
- Production deployment assumes domain and TLS certificates are managed by Traefik.

## API/Interface Impact
- None directly; defines deployment structure.

## Observability
- Compose logs show service startup and health check results.
- Traefik dashboard/logs confirm service registration and routing.

## Risks / Open Questions
- None.

## References
- Stakeholder Need(s): [SG-4-007](../strs-needs/SG-4-007.md)

## Change History
- v0.1 — Initial draft

