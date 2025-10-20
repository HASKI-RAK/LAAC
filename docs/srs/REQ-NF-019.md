---
id: REQ-NF-019
title: Security Baseline and Secure Defaults
type: Non-Functional
status: Draft
priority: High
stakeholder_trace: SG-5-001
owner: TODO
version: 0.1
---

## Description
The system shall enforce a security baseline with secure defaults covering data protection (in transit and at rest), secrets management, dependency scanning, and auditability.

## Rationale
Establishes a minimum security posture to protect data, comply with regulations, and enable auditability.

## Acceptance Criteria
- Data protection in transit:
  - External communication (client-to-service) requires TLS 1.2+ (enforced by reverse proxy/Traefik)
  - Internal service-to-service communication policy documented (e.g., LRS connections use HTTPS)
- Data protection at rest:
  - Sensitive cached data (if containing PII or student data) is encrypted or pseudonymized per documented policy
  - Storage encryption configuration documented in deployment guide
  - Data minimization: only necessary data is cached/stored
- Secrets management (ref REQ-FN-014):
  - No secrets committed to repository (enforced by pre-commit hook or CI check)
  - Secrets provided via environment variables or secret store
  - Rotation process documented in operational runbook
- Dependency vulnerability scanning:
  - Automated scanning configured in CI (e.g., npm audit, Snyk, Dependabot) - tool-agnostic
  - Critical vulnerabilities block merges or trigger alerts
  - Scan results reviewed regularly (weekly or on-demand)
- Auditability:
  - Security-relevant events logged: authentication failures, authorization denials, admin actions (cache invalidation, config changes)
  - Logs exclude PII and sensitive data
  - Log retention policy documented (e.g., 90 days minimum)
- Secure defaults:
  - Authentication enabled by default in production
  - Error messages do not leak sensitive information
  - Unused/default endpoints disabled

## Verification
- CI checks confirm:
  - No committed secrets (regex scan or tool)
  - Dependency scan runs and results are reviewed
  - TLS configuration validated in deployment tests
- Manual security review checklist confirms secure defaults
- Audit log review confirms security events are captured

## Dependencies
- REQ-FN-014 (secrets management)
- REQ-FN-023 (authentication/authorization)
- REQ-FN-020 (logging)

## Assumptions / Constraints
- TLS termination handled by reverse proxy (Traefik)
- Specific encryption/scanning tools chosen by deployment team
- Compliance requirements (e.g., GDPR) inform data handling policies

## Observability
- Security metrics: auth failure rate, authz denial rate, vulnerability scan results
- Audit logs available for review and compliance reporting

## Risks / Open Questions
- Define specific data handling policies (encryption, pseudonymization) based on regulatory requirements

## References
- Stakeholder Need(s): [SG-5-001](../strs-needs/SG-5-001.md)

## Change History
- v0.1 — Initial draft

