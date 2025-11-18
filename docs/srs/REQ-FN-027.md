---
id: REQ-FN-027
title: Keycloak Integration and Token Issuance
type: Functional
status: Draft
priority: High
stakeholder_trace: SG-5-001
owner: TODO
version: 0.1
---

## Description

The system shall integrate with Keycloak as the identity provider to enable user authentication, token issuance, and token refresh functionality. This provides a complete authentication solution where LAAC acts as a resource server validating tokens issued by Keycloak.

## Rationale

Currently, LAAC only validates JWT tokens (REQ-FN-023) but does not provide a mechanism for clients to obtain tokens. Integrating with Keycloak provides:

- Centralized identity management with industry-standard OAuth2/OIDC protocols
- Token issuance and refresh capabilities
- User and role management through Keycloak admin interface
- Support for various authentication flows (authorization code, client credentials, etc.)
- Single sign-on (SSO) capabilities across multiple services
- Production-ready security features (MFA, password policies, session management)

## Acceptance Criteria

- **Keycloak Configuration**:
  - Keycloak realm configured for LAAC with appropriate client settings
  - LAAC registered as a confidential client in Keycloak
  - Realm roles mapped to LAAC scopes (`analytics:read`, `admin:cache`, `admin:config`)
  - Keycloak instance URL and realm configuration provided via environment variables
- **Token Issuance**:
  - Clients can authenticate with Keycloak and receive JWT access tokens
  - Tokens issued by Keycloak contain required claims: `sub`, `scopes` (or `realm_access.roles`)
  - Token expiration aligns with security best practices (short-lived: 5-15 minutes for access tokens)
- **Token Refresh**:
  - Refresh token flow supported for obtaining new access tokens without re-authentication
  - Refresh tokens have longer expiration (configurable, e.g., 30 days)
  - Refresh token rotation enabled for enhanced security
- **LAAC Integration**:
  - JWT validation strategy updated to accept Keycloak-issued tokens
  - Token signature verified against Keycloak's public key (JWKS endpoint)
  - Scope mapping configured to extract roles from Keycloak token format
  - Support for both symmetric (HS256) and asymmetric (RS256) token validation
- **Documentation**:
  - Keycloak realm setup guide with export/import templates
  - Client configuration instructions (environment variables, client secrets)
  - Authentication flow examples for common use cases
  - Migration guide from current dev JWT tokens to Keycloak tokens
- **Development Experience**:
  - Optional Keycloak service in `docker-compose.dev.yml` for local development
  - Dev realm pre-configured with test users and roles
  - Scripts to generate test tokens from local Keycloak instance

## Verification

- **Unit Tests**:
  - Token validation with Keycloak token structure (test both symmetric and asymmetric keys)
  - Scope extraction from Keycloak `realm_access.roles` or custom scope claims
  - Invalid token rejection (expired, wrong issuer, invalid signature)
- **E2E Tests**:
  - Authentication flow: obtain token from Keycloak, access protected endpoint
  - Token refresh flow: use refresh token to obtain new access token
  - Scope authorization: tokens with different roles access appropriate endpoints
  - Token expiration: expired tokens properly rejected with 401
- **Integration Tests**:
  - Mock Keycloak server responses for token issuance and validation
  - JWKS endpoint integration for public key retrieval
  - Graceful handling of Keycloak unavailability
- **Security Tests**:
  - Token tampering detection
  - Invalid issuer rejection
  - Expired token rejection
  - Scope escalation prevention

## Dependencies

- **REQ-FN-023**: Authentication and Authorization Framework (extends this requirement)
- **REQ-FN-014**: Secrets and Configuration Management (Keycloak client secrets)
- **REQ-FN-013**: Docker Compose Configurations (Keycloak service in dev environment)
- **REQ-NF-019**: Security Baseline (secure token handling, HTTPS requirements)

## Assumptions / Constraints

- Keycloak instance is deployed and accessible from LAAC (self-hosted or managed service)
- Network connectivity between LAAC and Keycloak for JWKS endpoint and token validation
- Keycloak version compatibility: Tested with Keycloak 22.x or later
- OAuth2/OIDC standard compliance for token format and flows
- Existing JWT validation remains backward compatible during migration period
- TLS/HTTPS required for Keycloak communication in production
- Keycloak administrative setup (realm, clients, roles) is deployment-specific and documented

## API/Interface Impact

- **New Configuration Variables**:
  - `KEYCLOAK_URL`: Base URL of Keycloak server (e.g., `https://keycloak.example.com`)
  - `KEYCLOAK_REALM`: Realm name (e.g., `laac-realm`)
  - `KEYCLOAK_CLIENT_ID`: Client ID for LAAC (e.g., `laac-client`)
  - `KEYCLOAK_CLIENT_SECRET`: Client secret for confidential client authentication
  - `KEYCLOAK_JWKS_URL`: Optional override for JWKS endpoint (auto-discovered by default)
  - `JWT_ISSUER`: Expected token issuer (Keycloak realm URL)
  - `JWT_ALGORITHM`: Token signing algorithm (RS256 for Keycloak, HS256 for legacy dev tokens)
- **Authentication Endpoints** (Optional - if LAAC proxies Keycloak):
  - `POST /auth/login`: Proxy to Keycloak token endpoint (client credentials or password flow)
  - `POST /auth/refresh`: Proxy to Keycloak refresh token endpoint
  - `POST /auth/logout`: Revoke tokens (optional)
  - `GET /auth/userinfo`: Get current user information from token
- **Existing Endpoints**: No breaking changes; continue to accept Bearer tokens in `Authorization` header
- **Token Format**: Updated to support Keycloak token structure with `iss`, `azp`, `realm_access`, etc.

## Observability

- **Logs**:
  - Keycloak connection initialization (success/failure)
  - JWKS key retrieval and caching
  - Token validation failures with reason (invalid issuer, expired, signature mismatch)
  - Scope mapping from Keycloak roles to LAAC scopes
  - Token refresh attempts and outcomes
- **Metrics** (via `AuthMetricsService`):
  - `auth.keycloak.token_validation.success` and `.failure` counts
  - `auth.keycloak.jwks_fetch.success` and `.failure` counts
  - `auth.token_refresh.success` and `.failure` counts
- **Health Checks**:
  - Keycloak connectivity check in readiness probe (optional)
  - JWKS endpoint availability

## Risks / Open Questions

- **Migration Strategy**: How to handle transition from dev JWT tokens to Keycloak tokens?
  - Proposed: Support both validation methods during migration period with feature flag
- **Keycloak Deployment**: Who manages Keycloak instance? Self-hosted or managed service?
  - Assumption: Deployment-specific; provide Docker Compose for dev, document production options
- **Token Format Compatibility**: Does Keycloak token structure match current expectations?
  - Risk: May need token claim mapping (e.g., `realm_access.roles` → `scopes`)
- **Performance Impact**: Additional network call to JWKS endpoint for key retrieval?
  - Mitigation: Cache public keys with TTL (e.g., 1 hour), use passport-jwt JWKS support
- **Backward Compatibility**: How to maintain support for existing dev JWT generation?
  - Proposed: Keep dev scripts functional, add new Keycloak-based scripts
- **Scope Mapping**: How to map Keycloak roles to LAAC scopes?
  - Proposed: Configurable mapping or naming convention (e.g., Keycloak role `analytics_read` → scope `analytics:read`)

## References

- Stakeholder Need(s): [SG-5-001](../strs-needs/SG-5-001.md) — Security baseline with authentication
- **REQ-FN-023**: Authentication and Authorization Framework
- **Keycloak Documentation**: https://www.keycloak.org/documentation
- **OAuth 2.0 RFC 6749**: https://tools.ietf.org/html/rfc6749
- **OpenID Connect Core 1.0**: https://openid.net/specs/openid-connect-core-1_0.html
- **JWT RFC 7519**: https://tools.ietf.org/html/rfc7519
- **JWKS RFC 7517**: https://tools.ietf.org/html/rfc7517

## Change History

- v0.1 — Initial draft (2025-11-18)
