---
id: REQ-FN-026
title: Multi-LRS Configuration Schema and Instance Auth
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-4-012
owner: TODO
version: 0.1
---

## Description

Define a standardized configuration schema and environment variable strategy for managing multiple xAPI LRS instances, including per-instance authentication, timeouts, and labeling. This requirement operationalizes REQ-FN-002 so implementations converge on the same config model.

## Rationale

Avoids ambiguity between single vs. multi-LRS configuration and ensures consistent, secure handling of per-instance credentials across environments.

## Acceptance Criteria

- Configuration Source:
  - The application SHALL accept a JSON array in `LRS_INSTANCES` that defines all LRS instances.
  - Alternatively, the application MAY accept per-instance prefixed environment variables for deployments unable to pass JSON safely.
- Instance Schema:
  - Each instance object SHALL include the following fields:
    - `id` (string, unique): stable instance identifier (e.g., `hs-ke`)
    - `name` (string): human-readable label
    - `endpoint` (string): xAPI base URL (typically ends with `/xapi`)
    - `timeoutMs` (number, optional): request timeout in milliseconds (default: 10000)
    - `auth` (object): authentication configuration with required fields:
      - `type` = `basic` | `bearer` | `custom`
      - If `basic`: `username` and `password`, OR `key` and `secret` (alias for username/password)
      - If `bearer`: `token`
      - If `custom`: `headers` (map of string to string)
- Env Var Examples:
  - JSON array form:
    ```bash
    export LRS_INSTANCES='[
      {"id":"hs-ke","name":"HS Kempten","endpoint":"https://ke.lrs.haski.app/xapi",
       "timeoutMs":10000,
       "auth":{"type":"basic","username":"apiKey","password":"apiSecret"}},
      {"id":"hs-rv","name":"HS Ravensburg","endpoint":"https://rv.lrs.haski.app/xapi",
       "auth":{"type":"basic","key":"apiKey2","secret":"apiSecret2"}}
    ]'
    ```
  - Prefixed env vars form (normalized ID `HS_KE`):
    ```bash
    LRS_HS_KE_ENDPOINT=https://ke.lrs.haski.app/xapi
    LRS_HS_KE_AUTH_TYPE=basic
    LRS_HS_KE_USERNAME=apiKey
    LRS_HS_KE_PASSWORD=apiSecret
    LRS_HS_KE_TIMEOUT_MS=10000
    ```
- Validation Rules:
  - At least one instance MUST be configured; startup SHALL fail with clear error otherwise
  - `id` values MUST be unique; duplicates SHALL fail startup
  - For `basic` auth, either `username`+`password` OR `key`+`secret` MUST be present
  - `endpoint` MUST be a valid URI; non-HTTP(S) protocols are rejected
- Health & Auth Consistency:
  - Health checks SHALL use the same auth config per instance
  - Health checks targeting `/xapi/about` SHALL treat 2xx, 401, and 403 as reachable (see REQ-FN-025)

## Verification

- Unit tests parse `LRS_INSTANCES` JSON and prefixed env vars into a normalized configuration model
- Validation tests assert startup failures on: missing instances, duplicate `id`, invalid `endpoint`, missing credentials
- Tests confirm that `basic` auth supports both `username/password` and `key/secret` aliases

## Dependencies

- REQ-FN-002 (Multi-LRS integration)
- REQ-FN-014 (Secrets and configuration management)

## Assumptions / Constraints

- Credentials provided via environment variables or secrets injection; no credentials in source control
- Instance identifiers are stable and used throughout the system for scoping and tagging (REQ-FN-017)

## API/Interface Impact

- None directly; defines configuration model consumed by the DataAccess layer

## Observability

- Startup logs MAY list configured instance IDs and endpoints (redacted), but MUST NOT log credentials

## Change History

- v0.1 — Initial draft

