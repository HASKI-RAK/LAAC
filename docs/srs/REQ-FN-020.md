---
id: REQ-FN-020
title: Structured Logging with Correlation IDs
type: Functional
status: Draft
priority: Medium
stakeholder_trace: SG-4-009
owner: TODO
version: 0.1
---

## Description
The system shall emit structured, leveled logs (debug, info, warn, error) with correlation/request IDs for distributed request tracing, excluding PII, and providing rich context for errors.

## Rationale
Enables effective debugging and troubleshooting by correlating logs across components and requests.

## Acceptance Criteria
- Logs are structured (JSON or similar machine-parseable format) with consistent fields:
  - `timestamp`, `level`, `message`, `correlationId` (or `requestId`), `module`/`service`, `instanceId` (if multi-instance)
  - Error logs include: `error.message`, `error.stack`, `error.code`, relevant context (e.g., `metricId`, `actorId`)
- Correlation ID is:
  - Generated for each incoming request (or extracted from client header `X-Correlation-ID` if present)
  - Propagated through all internal service calls and logged in all log entries for that request
  - Returned to clients in response header `X-Correlation-ID`
- Log levels are configurable via environment variable (e.g., `LOG_LEVEL=debug|info|warn|error`)
- No PII (e.g., student names, email addresses) is logged; use anonymized IDs or hashed values
- Logs are emitted to stdout/stderr for capture by container runtime or log aggregator

## Verification
- E2E tests verify correlation ID is present in logs and response headers
- Unit tests for logger utility confirm structured output and field presence
- Manual review of sample logs confirms no PII leakage and rich error context

## Dependencies
- REQ-NF-002 (standalone deployability) for log output to stdout/stderr

## Assumptions / Constraints
- Log aggregation and storage (e.g., ELK, Loki) are handled by infrastructure, not the application
- Correlation ID generation uses UUIDs or similar collision-free identifiers

## API/Interface Impact
- Response header: `X-Correlation-ID` on all responses
- Optional request header: `X-Correlation-ID` to propagate client-provided IDs

## Observability
- Logs themselves are the primary observability artifact
- Log volume metrics may be exported (e.g., logs/sec by level)

## Risks / Open Questions
- High log volume at debug level may impact performance; test and document safe defaults

## References
- Stakeholder Need(s): [SG-4-009](../strs-needs/SG-4-009.md)

## Change History
- v0.1 — Initial draft

