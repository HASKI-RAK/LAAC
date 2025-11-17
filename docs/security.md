# Security Documentation

## REQ-FN-023: Authentication and Authorization Framework

This document describes the authentication and authorization mechanisms implemented in LAAC (Learning Analytics Analyzing Center).

### Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [Scopes](#scopes)
5. [Public Endpoints](#public-endpoints)
6. [Protected Endpoints](#protected-endpoints)
7. [JWT Token Format](#jwt-token-format)
8. [Configuration](#configuration)
9. [Development and Testing](#development-and-testing)
10. [Security Best Practices](#security-best-practices)

---

## Overview

LAAC uses JWT (JSON Web Token) based authentication with scope-based authorization to secure API endpoints. The system supports:

- **Authentication**: Verifies user identity via JWT Bearer tokens
- **Authorization**: Controls access to resources based on scopes
- **Public endpoints**: Health checks and documentation (no auth required)
- **Development bypass**: Authentication can be disabled for local development/testing

---

## Authentication

### JWT Bearer Tokens

All protected endpoints require a valid JWT token in the `Authorization` header:

```http
Authorization: Bearer <jwt-token>
```

### Authentication Flow

1. Client obtains JWT token from authentication service (not part of LAAC)
2. Client includes token in `Authorization` header for API requests
3. LAAC validates token signature and expiration
4. LAAC extracts user information and scopes from token
5. Request proceeds if token is valid, otherwise returns 401

### Failed Authentication Response

When authentication fails, LAAC returns HTTP 401 with the following response:

```json
{
  "statusCode": 401,
  "message": "Authentication failed",
  "error": "Unauthorized"
}
```

The response includes the `WWW-Authenticate: Bearer` header as per RFC 6750.

---

## Authorization

### Scope-Based Access Control

After successful authentication, LAAC enforces scope-based authorization. Users must have at least one of the required scopes to access an endpoint.

### Failed Authorization Response

When authorization fails, LAAC returns HTTP 403 with a descriptive message:

```json
{
  "statusCode": 403,
  "message": "Access denied. Required scopes: admin:cache or admin:config",
  "error": "Forbidden"
}
```

**Security Note**: The error message does not leak sensitive information about the system or user data.

---

## Scopes

LAAC defines the following authorization scopes:

### Analytics Scopes

| Scope | Description | Use Case |
|-------|-------------|----------|
| `analytics:read` | Read access to metrics catalog and results | Viewing dashboards, retrieving computed metrics |

### Admin Scopes

| Scope | Description | Use Case |
|-------|-------------|----------|
| `admin:cache` | Manage cache operations | Cache invalidation, cache inspection |
| `admin:config` | Modify instance configuration | Runtime configuration changes |

### Scope Combinations

- Users can have multiple scopes in a single token
- Endpoints may require one of multiple scopes (OR logic)
- Future: Support for scope hierarchies and wildcards

---

## Public Endpoints

The following endpoints are publicly accessible (no authentication required):

### Health and Monitoring

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health/liveness` | GET | Liveness probe (app running) |
| `/health/readiness` | GET | Readiness probe (app + dependencies ready) |
| `/health` | GET | Basic health check |
| `/` | GET | API root (informational) |

### Documentation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/docs` | GET | Swagger API documentation (future) |

**Note**: Observability telemetry is now emitted via structured logs (no dedicated HTTP metrics endpoint).

---

## Protected Endpoints

### Metrics API (REQ-FN-003, REQ-FN-005)

| Endpoint | Method | Required Scopes | Description |
|----------|--------|-----------------|-------------|
| `/api/v1/metrics` | GET | `analytics:read` | List all available metrics (catalog) |
| `/api/v1/metrics/:id` | GET | `analytics:read` | Get metric details |
| `/api/v1/metrics/:id/results` | GET | `analytics:read` | Compute/retrieve metric results |

### Admin API (REQ-FN-007, REQ-FN-021)

| Endpoint | Method | Required Scopes | Description |
|----------|--------|-----------------|-------------|
| `/admin/cache/invalidate` | POST | `admin:cache` | Invalidate cache entries (supports patterns) |
| `/admin/config` | GET | `admin:config` | View instance configuration |
| `/admin/config` | PATCH | `admin:config` | Update instance configuration |

**Note**: Metrics catalog and admin endpoints will be implemented in future sprints.

---

## JWT Token Format

### Token Structure

LAAC expects JWT tokens with the following payload structure:

```json
{
  "sub": "user-unique-id",
  "username": "optional-username",
  "scopes": ["analytics:read", "admin:cache"],
  "iat": 1614556800,
  "exp": 1614560400
}
```

### Required Claims

| Claim | Type | Required | Description |
|-------|------|----------|-------------|
| `sub` | string | Yes | Subject (user unique identifier) |
| `scopes` | string[] | Yes | List of authorization scopes |
| `username` | string | No | Optional human-readable username |
| `iat` | number | No | Issued at timestamp (seconds since epoch) |
| `exp` | number | No | Expiration timestamp (seconds since epoch) |

### Token Signing

Tokens must be signed with the `JWT_SECRET` configured in LAAC. LAAC uses **HS256** (HMAC-SHA256) algorithm for signature verification.

### Token Expiration

Token expiration is validated on every request. Expired tokens are rejected with HTTP 401.

**Recommendation**: Use short-lived tokens (e.g., 1 hour) and implement token refresh mechanism in your authentication service.

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 characters) |
| `JWT_EXPIRATION` | No | `1h` | Token expiration time (format: `30m`, `1h`, `7d`) |
| `AUTH_ENABLED` | No | `true` | Enable/disable authentication |

### JWT_SECRET Security Requirements

- **Minimum length**: 32 characters
- **Validation**: Enforced at application startup (fails fast if invalid)
- **Storage**: Use environment variables or Docker secrets (never commit to repository)
- **Generation**: Use cryptographically secure random generator

Generate a secure secret:

```bash
openssl rand -base64 32
```

### Configuration Validation

LAAC validates configuration at startup using Joi schema (REQ-FN-014). Invalid configuration prevents application startup.

---

## Development and Testing

### Authentication Bypass

For local development and automated testing, authentication can be disabled:

```bash
AUTH_ENABLED=false
```

When disabled:
- All endpoints are accessible without tokens
- Scope checks are bypassed
- Useful for integration testing and rapid prototyping

**⚠️ Security Warning**: Never disable authentication in production environments!

### Default Configuration

Default `.env` file includes:

```bash
AUTH_ENABLED=true  # Authentication enabled by default
JWT_SECRET=your-secret-key-min-32-chars-replace-in-production
JWT_EXPIRATION=1h
```

### Testing with JWT Tokens

For testing, generate tokens programmatically using `@nestjs/jwt`:

```typescript
import { JwtService } from '@nestjs/jwt';

const jwtService = moduleRef.get<JwtService>(JwtService);
const token = jwtService.sign({
  sub: 'test-user-123',
  username: 'testuser',
  scopes: ['analytics:read'],
});
```

---

## Security Best Practices

### Token Management

1. **Short-lived tokens**: Use expiration times of 1 hour or less
2. **Token refresh**: Implement refresh token mechanism in auth service
3. **Secure transmission**: Always use HTTPS in production
4. **No client-side storage**: Avoid storing tokens in localStorage (use httpOnly cookies)

### Secret Management

1. **Rotation**: Rotate `JWT_SECRET` periodically (with grace period for old tokens)
2. **Environment-specific**: Use different secrets for dev/staging/production
3. **Access control**: Limit who can view/modify secrets
4. **Secure storage**: Use Docker secrets, Kubernetes secrets, or vault services

### API Security

1. **Rate limiting**: Implement rate limiting on public and authenticated endpoints (REQ-FN-024)
2. **Input validation**: All DTOs validated with `class-validator` (REQ-FN-024)
3. **Error handling**: Don't leak sensitive information in error messages
4. **Logging**: Log auth failures without tokens or PII (REQ-FN-020)

### Monitoring and Alerting

1. **Authentication telemetry**: Enable `METRICS_DEBUG=true` to log events such as `auth.failures`
2. **Authorization telemetry**: Track denials via structured logs with correlation IDs
3. **Alerting**: Configure log-based alerts for unusual patterns (e.g., high auth failure rate)
4. **Audit logs**: Maintain audit logs for admin operations

### Telemetry Events

LAAC emits the following security-related events via logs when `METRICS_DEBUG=true`:

| Event | Description |
|-------|-------------|
| `auth.failure` (logged by `AuthMetricsService`) | Authentication failures with reason/path metadata |
| `rate.limit` (logged by guards/AuthMetricsService) | Rate limit rejections captured by guards |

---

## Security Incident Response

### Suspected Token Compromise

1. Rotate `JWT_SECRET` immediately
2. Invalidate all active tokens (users must re-authenticate)
3. Review logs for suspicious activity
4. Notify affected users if necessary

### Unauthorized Access Attempt

1. Review `auth.failure` telemetry events for patterns
2. Review logs with correlation IDs
3. Block IP addresses if needed (at infrastructure level)
4. Update security policies as needed

---

## Related Requirements

- **REQ-FN-023**: Authentication and Authorization Framework (this document)
- **REQ-FN-014**: Secrets and Configuration Management
- **REQ-FN-024**: Input Validation and Rate Limiting
- **REQ-FN-020**: Structured Logging with Correlation IDs
- **REQ-FN-021**: Observability Telemetry Hooks
- **REQ-NF-019**: Security Baseline and Testing

---

## Additional Resources

- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [OAuth 2.0 Bearer Token Usage RFC 6750](https://tools.ietf.org/html/rfc6750)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [NestJS Authorization](https://docs.nestjs.com/security/authorization)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

*Last Updated*: 2025-10-21  
*Document Version*: 1.0  
*Implements*: REQ-FN-023
