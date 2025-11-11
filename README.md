<p align="center">
  <a href="http://haski-learning.de/" target="blank"><img src="https://haski-learning.de/wp-content/uploads/2023/03/cropped-cropped-Logo_HASKI_orange_2022_k101.png" width="120" alt="HASKI Logo" /></a>
</p>

# Learning Analytics Analyzing Center (LAAC)

[![CI/CD Pipeline](https://github.com/HASKI-RAK/LAAC/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/HASKI-RAK/LAAC/actions/workflows/ci-cd.yml)
[![NestJS CI](https://github.com/HASKI-RAK/LAAC/actions/workflows/nest_js.yml/badge.svg)](https://github.com/HASKI-RAK/LAAC/actions/workflows/nest_js.yml)

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

# Run tests

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## API Documentation

> **REQ-FN-008/009**: This project provides interactive API documentation via Swagger UI and a machine-readable OpenAPI specification.

### Accessing API Documentation

Once the application is running (via `yarn start` or `yarn start:dev`), you can access:

- **Swagger UI**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
  - Interactive API documentation with "Try it out" functionality
  - Pre-configured with JWT bearer authentication
  - Explore all endpoints, request/response schemas, and error codes

- **OpenAPI Spec (JSON)**: [http://localhost:3000/api-docs/openapi.json](http://localhost:3000/api-docs/openapi.json)
  - Machine-readable OpenAPI 3.0 specification
  - Use for API client generation, testing tools, or CI/CD validation

### Example API Requests

```bash
# Health check (public, no auth required)
curl http://localhost:3000/health/liveness

# Get metrics catalog (requires JWT token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/metrics

# Get specific metric details
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/metrics/course-completion-rate

# Prometheus metrics (public, no auth required)
curl http://localhost:3000/metrics
```

### Disabling Swagger in Production

To disable Swagger UI and OpenAPI spec endpoints in production:

1. Set the environment variable:
   ```bash
   SWAGGER_ENABLED=false
   ```

2. Or in your `.env` file:
   ```
   SWAGGER_ENABLED=false
   ```

The Swagger UI and spec endpoints will return 404 when disabled.

## Run tests

## Local Redis (Dev)

This project already reads Redis settings from `.env` (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`). To run a local Redis for development:

1. Ensure `.env` exists and uses the defaults:

   - `REDIS_HOST=localhost`
   - `REDIS_PORT=6379`
   - `REDIS_PASSWORD=` (empty for dev)

2. Start Redis with Docker Compose:

   ```bash
   docker compose -f docker-compose.dev.yml up -d redis
   ```

3. Verify Redis is healthy:

   ```bash
   docker compose -f docker-compose.dev.yml ps
   # or
   curl -s http://localhost:3000/health/readiness | jq .
   # (with the app running via `yarn start:dev`; Redis should show status "up")
   ```

4. Stop Redis when done:

   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

Notes:

- The dev Redis runs without a password. If you need a password, set `REDIS_PASSWORD` in `.env` and adjust the `command` in `docker-compose.dev.yml` to use `--requirepass`.
- No code changes are required; the app connects via `ioredis` using the values from `.env`.

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

## CI/CD Pipeline and Deployment

> **REQ-FN-015**: The project uses GitHub Actions for automated testing, building, and deployment.

### Pipeline Overview

The CI/CD pipeline (`.github/workflows/ci-cd.yml`) automatically runs on every push to the `main` branch:

1. **Test Stage**: Runs linting, unit tests, E2E tests, and generates coverage reports
2. **Build Stage**: Builds Docker image with multi-architecture support (amd64, arm64)
3. **Push Stage**: Pushes image to GitHub Container Registry (GHCR) with proper tags
4. **Deploy Stage**: Triggers Portainer webhook to redeploy the application stack

### Pipeline Status

Check the current pipeline status:
- **CI/CD Pipeline**: [![CI/CD Status](https://github.com/HASKI-RAK/LAAC/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/HASKI-RAK/LAAC/actions/workflows/ci-cd.yml)
- **Pull Request Tests**: [![NestJS CI](https://github.com/HASKI-RAK/LAAC/actions/workflows/nest_js.yml/badge.svg)](https://github.com/HASKI-RAK/LAAC/actions/workflows/nest_js.yml)

### Repository Secrets Configuration

To enable the CI/CD pipeline, configure the following repository secrets in **Settings > Secrets and variables > Actions**:

#### Required Secrets

| Secret Name | Description | Example | Required |
|-------------|-------------|---------|----------|
| `PORTAINER_WEBHOOK_URL` | Portainer webhook URL for stack redeploy | `https://portainer.example.com/api/webhooks/<id>` | **Yes** |

#### Optional Secrets (for custom registries)

The pipeline uses GitHub Container Registry (GHCR) by default with `GITHUB_TOKEN` (automatically provided). Custom registry credentials are not currently supported, but the workflow can be extended if needed.

| Secret Name | Description | Example | Required |
|-------------|-------------|---------|----------|
| `DOCKER_REGISTRY_URL` | Container registry URL | `ghcr.io`, `docker.io` | No (default: `ghcr.io`) |

### Setting Up Portainer Webhook

1. **Create Webhook in Portainer**:
   - Navigate to your Portainer stack (Stacks > LAAC)
   - Enable webhook in stack settings
   - Copy the webhook URL

2. **Configure GitHub Secret**:
   ```bash
   # In GitHub repository:
   # Settings > Secrets and variables > Actions > New repository secret
   # Name: PORTAINER_WEBHOOK_URL
   # Value: https://portainer.example.com/api/webhooks/<webhook-id>
   ```

3. **Test Webhook** (optional):
   ```bash
   curl -X POST "https://portainer.example.com/api/webhooks/<webhook-id>" \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

### Docker Image Tags

The pipeline creates the following Docker image tags:

- **`latest`**: Always points to the most recent build from `main` branch
- **`<short-sha>`**: Short commit SHA (7 characters) for rollback capability
- **`<long-sha>`**: Full commit SHA for complete traceability

Example:
```bash
ghcr.io/haski-rak/laac:latest
ghcr.io/haski-rak/laac:a1b2c3d
ghcr.io/haski-rak/laac:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

### Manual Deployment Trigger

You can manually trigger the CI/CD pipeline from the GitHub Actions UI:

1. Navigate to **Actions** tab
2. Select **CI/CD Pipeline** workflow
3. Click **Run workflow** button
4. Select `main` branch and click **Run workflow**

### Deployment Verification

After a successful deployment:

1. **Check GitHub Actions**: Verify all steps completed successfully (green checkmarks)
2. **Check Portainer**: Verify stack update event in activity logs
3. **Check Application Health**: 
   ```bash
   curl https://your-domain.com/health/readiness
   # Should return HTTP 200 with status "ok"
   ```

### Troubleshooting

#### Pipeline Fails at Test Stage
- Check test logs in GitHub Actions for specific failure
- Run tests locally: `yarn test` and `yarn test:e2e`
- Ensure all dependencies are properly installed

#### Pipeline Fails at Build Stage
- Check Dockerfile syntax and build context
- Verify base image availability
- Check for disk space issues in runner

#### Pipeline Fails at Push Stage
- Verify `GITHUB_TOKEN` permissions (packages: write)
- Check GitHub Container Registry status
- Ensure repository allows package publishing

#### Webhook Invocation Fails
- Verify `PORTAINER_WEBHOOK_URL` secret is set correctly
- Check Portainer webhook is enabled and accessible
- Test webhook manually with `curl`
- Note: Webhook failure does not block image push (reliability consideration from REQ-FN-015)

### Rollback Procedure

If a deployment causes issues, you can rollback to a previous version:

1. **Identify previous working version** (check GitHub Actions history for SHA)
2. **Update Portainer stack** to use the specific SHA tag:
   ```yaml
   services:
     laac:
       image: ghcr.io/haski-rak/laac:<previous-sha>
   ```
3. **Redeploy stack** in Portainer UI or trigger webhook manually

For more details, see:
- `.github/workflows/ci-cd.yml` - Full pipeline implementation
- `docs/srs/REQ-FN-015.md` - CI/CD requirements specification
- `docs/architecture/ARCHITECTURE.md` Section 9 - Deployment architecture

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
