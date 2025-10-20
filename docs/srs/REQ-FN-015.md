---
id: REQ-FN-015
title: CI/CD Pipeline with GitHub Actions
type: Functional
status: Draft
priority: Medium
stakeholder_trace: SG-4-007
owner: TODO
version: 0.1
---

## Description
The system shall provide a GitHub Actions CI/CD pipeline that, on push to `main`, builds and tests the application, builds and pushes a container image to the registry, and triggers deployment via Portainer webhook or API.

## Rationale
Automates deployment and reduces manual steps, ensuring consistent and fast delivery.

## Acceptance Criteria
- A `.github/workflows/ci-cd.yml` (or similar) workflow exists.
- On push to `main`: runs tests (`yarn test`, `yarn test:e2e`), builds the Docker image, tags it, and pushes to registry.
- After successful image push, workflow triggers a Portainer stack redeploy via webhook URL (stored in repository secrets).
- Workflow uses repository secrets for: registry credentials, Portainer webhook URL, and any other sensitive values.
- Workflow status is visible in GitHub Actions UI and reports success/failure.
- README documents how to configure repository secrets for CI.

## Verification
- Push to `main` triggers workflow; logs confirm test execution, image build/push, and webhook invocation.
- Portainer UI shows stack update/redeploy after workflow completes.
- Failed tests or build block deployment (workflow exits with error).

## Dependencies
- REQ-FN-012 (container image).
- REQ-FN-014 (secrets management).

## Assumptions / Constraints
- Portainer stack is pre-configured with webhook enabled or API access.
- Repository secrets are configured by maintainers.

## API/Interface Impact
- None directly; supports deployment automation.

## Observability
- GitHub Actions logs show each step (test, build, push, deploy trigger).
- Portainer activity logs confirm webhook receipt and redeploy.

## Risks / Open Questions
- Webhook reliability; consider retry or notification on failure.

## References
- Stakeholder Need(s): [SG-4-007](../strs-needs/SG-4-007.md)

## Change History
- v0.1 — Initial draft

