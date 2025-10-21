<p align="center">
  <a href="http://haski-learning.de/" target="blank"><img src="https://haski-learning.de/wp-content/uploads/2023/03/cropped-cropped-Logo_HASKI_orange_2022_k101.png" width="120" alt="HASKI Logo" /></a>
</p>

# Learning Analytics Analyzing Center (LAAC)

Provide processed learning analytics by compiling data from a Learning Record Store (LRS).

## Description

This is the Learning Analytics Analyzing Center (LAAC) project, which is part of the HASKI project. The LAAC is designed to take input from a Learning Record Store (LRS) and analyze the data to provide insights into learning activities, thus consolidating learning artifacts.

The project is built using [NestJS](https://nestjs.com/), a progressive Node.js framework for building efficient and scalable server-side applications.

## Project setup

```bash
$ yarn install
```

## Compile and run the project

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Configuration and Secrets Management

> **REQ-FN-014**: This project follows secure configuration management practices to prevent credential leaks and support deployment across environments.

### Local Development

1. **Copy the environment template**:

   ```bash
   cp .env.example .env
   ```

2. **Generate secure secrets** (recommended):

   ```bash
   yarn setup:secrets
   ```

   This will generate a secure `JWT_SECRET` in `.env`.

   Or, generate manually:

   ```bash
   # Generate a secure JWT secret (minimum 32 characters required)
   openssl rand -base64 32
   ```

3. **Configure your local `.env` file** with actual values:
   - Set `JWT_SECRET` to a secure random string (minimum 32 characters)
   - Configure `LRS_URL` and `LRS_API_KEY` from your LRS provider
   - Adjust `REDIS_*` settings if using a non-default Redis configuration
   - Set `NODE_ENV=development` for local development

4. **Never commit `.env` files** - they are automatically excluded by `.gitignore`

### Production Deployment

For production deployments, **never use `.env` files**. Instead:

#### Option 1: Docker Secrets (Recommended for Docker Swarm/Compose)

1. Create Docker secrets for sensitive values:

   ```bash
   echo "your-jwt-secret" | docker secret create laac_jwt_secret -
   echo "your-lrs-api-key" | docker secret create laac_lrs_api_key -
   ```

2. Reference secrets in your `docker-compose.yml`:
   ```yaml
   services:
     laac:
       environment:
         JWT_SECRET_FILE: /run/secrets/laac_jwt_secret
         LRS_API_KEY_FILE: /run/secrets/laac_lrs_api_key
       secrets:
         - laac_jwt_secret
         - laac_lrs_api_key
   ```

#### Option 2: Environment Variables (Portainer/Kubernetes)

Use Portainer's environment variable editor or Kubernetes secrets to inject configuration at runtime:

- **Portainer**: Navigate to Container → Env variables and add required variables
- **Kubernetes**: Create ConfigMaps for non-sensitive config and Secrets for credentials

#### Option 3: Secret Management Services

For enterprise deployments, integrate with secret management services:

- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager

### Required Configuration Variables

See `.env.example` for a complete list of required environment variables. Key variables include:

| Variable         | Required | Description                   | Security Level                      |
| ---------------- | -------- | ----------------------------- | ----------------------------------- |
| `JWT_SECRET`     | Yes      | JWT signing secret            | **CRITICAL** - Never commit         |
| `LRS_API_KEY`    | Yes      | LRS authentication key        | **CRITICAL** - Never commit         |
| `LRS_URL`        | Yes      | LRS xAPI endpoint URL         | Sensitive                           |
| `REDIS_PASSWORD` | No       | Redis authentication password | **CRITICAL** - Never commit if used |
| `NODE_ENV`       | No       | Application environment       | Public                              |
| `PORT`           | No       | Application port              | Public                              |

### Security Checklist

- ✅ All secrets use environment variables or Docker secrets
- ✅ `.env` files are in `.gitignore`
- ✅ `.env.example` contains only placeholder values
- ✅ `JWT_SECRET` is at least 32 characters in production
- ✅ CI/CD pipeline uses repository secrets (GitHub Actions)
- ✅ Automated secret scanning runs on every PR

### Validation

The application validates all required configuration at startup using Joi schema validation. If required variables are missing or invalid, the application will fail to start with clear error messages.

For more details, see:

- `.env.example` - Complete environment variable documentation
- `docs/srs/REQ-FN-014.md` - Requirements specification
- `docs/architecture/ARCHITECTURE.md` Section 5.3 - Deployment configuration
- `src/core/config/` - Configuration validation implementation

## Health and Readiness Endpoints

> **REQ-NF-002**: The application provides health check endpoints for container orchestration and monitoring.

### Liveness Probe

**Endpoint**: `GET /health/liveness`

Returns 200 OK if the application is running. This endpoint checks only the application's internal state and does not verify external dependencies.

**Response**:

```json
{
  "status": "ok",
  "info": {},
  "error": {},
  "details": {},
  "timestamp": "2025-10-21T12:14:07.537Z",
  "version": "0.0.1"
}
```

### Readiness Probe

**Endpoint**: `GET /health/readiness`

Returns 200 OK if the application and all dependencies (Redis, LRS) are ready to accept traffic. Returns 503 Service Unavailable if any dependency is not reachable.

**Response (Healthy)**:

```json
{
  "status": "ok",
  "info": {
    "redis": { "status": "up" },
    "lrs": { "status": "up" }
  },
  "error": {},
  "details": {
    "redis": { "status": "up" },
    "lrs": { "status": "up" }
  },
  "timestamp": "2025-10-21T12:14:07.537Z",
  "version": "0.0.1"
}
```

**Response (Unhealthy - 503)**:

```json
{
  "status": "error",
  "info": {},
  "error": {
    "redis": { "status": "down", "message": "Connection refused" }
  },
  "details": {
    "redis": { "status": "down", "message": "Connection refused" },
    "lrs": { "status": "up" }
  }
}
```

### Usage in Container Orchestration

**Docker Compose**:

```yaml
services:
  laac:
    healthcheck:
      test:
        [
          'CMD',
          'wget',
          '--spider',
          '-q',
          'http://localhost:3000/health/readiness',
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

**Kubernetes**:

```yaml
livenessProbe:
  httpGet:
    path: /health/liveness
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/readiness
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Implementation Details

- **Framework**: Built with `@nestjs/terminus` for standardized health checks
- **Dependencies Checked**: Redis cache, LRS (Learning Record Store)
- **Authentication**: Both endpoints are public (no authentication required)
- **Timeout Handling**:
  - Redis: 3 seconds timeout
  - LRS: 5 seconds timeout (capped from configuration)
- **Error Handling**: Graceful degradation with detailed error messages

For more details, see:

- `docs/srs/REQ-NF-002.md` - Requirements specification
- `docs/architecture/ARCHITECTURE.md` Section 10.3 - Health checks architecture
- `src/core/health/` - Health check implementation
