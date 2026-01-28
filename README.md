<p align="center">
   <a href="http://haski-learning.de/" target="blank"><img src="https://haski-learning.de/wp-content/uploads/2023/03/cropped-cropped-Logo_HASKI_orange_2022_k101.png" width="120" alt="HASKI Logo" /></a>
</p>

# Learning Analytics Analyzing Center (LAAC)

[![CI/CD Pipeline](https://github.com/HASKI-RAK/LAAC/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/HASKI-RAK/LAAC/actions/workflows/ci-cd.yml)
[![NestJS CI](https://github.com/HASKI-RAK/LAAC/actions/workflows/nest_js.yml/badge.svg)](https://github.com/HASKI-RAK/LAAC/actions/workflows/nest_js.yml)

LAAC serves learning analytics from your LRS via a compact NestJS API. This guide is trimmed for scientists and developers who just need to call it.

## Quick Start

```bash
cp .env.example .env          # set LRS_* and JWT_SECRET
yarn install
yarn start:dev                # API at http://localhost:3000
```

Need a local LRS? See [docs/LOCAL-LRS-SETUP.md](docs/LOCAL-LRS-SETUP.md). Swagger UI lives at http://localhost:3000/api/docs.

## Auth in One Minute

All metric endpoints require `Authorization: Bearer <token>` with `analytics:read` scope.

Local token:

```bash
yarn setup:secrets   # once
yarn generate:jwt    # writes DEV_JWT into .env
```

Use it:

```bash
curl -H "Authorization: Bearer $DEV_JWT" http://localhost:3000/api/v1/metrics
```

## Call the API

Base path: `/api/v1`. OpenAPI: http://localhost:3000/api-docs/openapi.json.

```bash
# List catalog
curl -H "Authorization: Bearer $DEV_JWT" \
   http://localhost:3000/api/v1/metrics

# Metric details
curl -H "Authorization: Bearer $DEV_JWT" \
   http://localhost:3000/api/v1/metrics/course-completion

# Compute results
curl -H "Authorization: Bearer $DEV_JWT" \
   "http://localhost:3000/api/v1/metrics/course-completion/results?courseId=COURSE_123&userId=USER_456&since=2025-01-01T00:00:00Z&until=2025-02-01T00:00:00Z"
```

Common query params for `/metrics/:id/results`:

- `courseId`, `topicId`, `elementId`
- `userId`, `groupId`
- `since`, `until` (ISO-8601)
- `instanceId` (`hs-ke`, `hs-ke,hs-rv`, or `*`)

Responses include value, metadata, cache status, and computation timestamp. 401/403 are returned for missing/invalid scopes.

## Run with Docker Compose (short)

```bash
# dev: app + redis + hot reload
docker compose -f docker-compose.dev.yml up

# prod (Traefik-ready)
docker compose up -d
```

Set required env vars in `.env` (see `.env.example`). For secrets in production, use Docker/Kubernetes secrets instead of files. Detailed ops notes stay in [docs/](docs/).

## Configuration Essentials

- `JWT_SECRET` (32+ chars), `LRS_DOMAIN`, `LRS_USER` are required.
- Optional: `REDIS_HOST/PORT/PASSWORD`, `PORT`, `NODE_ENV`, `SWAGGER_ENABLED`.
- Configuration validation fails fast on startup.

More: [docs/LRS-CONFIGURATION.md](docs/LRS-CONFIGURATION.md).

## Testing

```bash
yarn test        # unit
yarn test:e2e    # e2e
yarn test:cov    # coverage
```

## Health & Status

- Liveness: `GET /health/liveness`
- Readiness (includes Redis): `GET /health/readiness`

## Need Details?

- Metrics spec: [docs/Metrics-Specification.md](docs/Metrics-Specification.md)
- Architecture: [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)
- CI/CD: [docs/CI-TESTING-WITH-LRS.md](docs/CI-TESTING-WITH-LRS.md)
