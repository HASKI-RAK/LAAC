# Testing with Real LRS and Redis in CI/CD

This guide explains how LAAC tests against real LRS (Learning Record Store) and Redis instances in GitHub Actions CI/CD pipelines.

## Overview

When GitHub Copilot or any CI/CD runner executes tests, they now run against:

- **Redis 7** (for caching tests)
- **PostgreSQL 16** (LRS database)
- **Yetanalytics LRSQL** (xAPI-compliant LRS)
- **Seeded test data** (sample xAPI statements)

This ensures E2E tests validate real integrations rather than mocked responses.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions Runner (Ubuntu)                              │
│                                                              │
│  ┌──────────────┐    ┌─────────────┐    ┌───────────────┐  │
│  │ LAAC App     │───▶│ Redis       │    │ PostgreSQL    │  │
│  │ (Tests)      │    │ :6379       │    │ :5432         │  │
│  └──────┬───────┘    └─────────────┘    └───────┬───────┘  │
│         │                                        │          │
│         └────────────▶┌─────────────────────────┘          │
│                       │ Yetanalytics LRS                    │
│                       │ :8080 (internal, :8090 external)    │
│                       │ /xapi endpoint                      │
│                       │ (with seeded test data)             │
│                       └─────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

## Files Created/Modified

### 1. Test Fixtures

**File:** `test/fixtures/xapi-statements.json`

- Contains 500 sample xAPI statements
- Covers various scenarios: completed, attempted, progressed, failed
- Multiple students and activities
- Valid xAPI 1.0.3 format

### 2. LRS Seeding Script

**File:** `scripts/seed-test-lrs.js`

- Node.js script to populate LRS with test data
- Waits for LRS health check (up to 45 seconds)
- Posts xAPI statements via LRS API
- Exits with proper codes for CI/CD

### 3. Docker Compose Test Configuration

**File:** `docker-compose.test.yml`

- Added `lrs-db-test`: PostgreSQL 16 for LRS
- Added `lrs-test`: Yetanalytics LRSQL instance
- Health checks for all services
- Network isolation for tests

### 4. CI/CD Workflows

**Files:**

- `.github/workflows/ci-cd.yml` (main branch pushes)
- `.github/workflows/nest_js.yml` (pull requests)

**Changes:**

- Added `services` section with Redis, PostgreSQL, and LRS containers
- Added "Seed test LRS with data" step before tests
- Set environment variables for test connectivity
- All tests now run against real services

### 5. Test Setup

**File:** `test/setup-e2e.ts`

- Updated to use environment-provided LRS credentials
- Falls back to localhost for local development
- Configurable via env vars in CI

## Usage

### Local Testing (with real services)

```bash
# 1. Start test infrastructure
docker-compose -f docker-compose.test.yml up -d

# 2. Wait for services to be healthy (check logs)
docker-compose -f docker-compose.test.yml logs -f

# 3. Seed test data
node scripts/seed-test-lrs.js

# 4. Run E2E tests (using mapped port 8090 for local development)
LRS_URL=http://localhost:8090/xapi \
LRS_API_KEY=test-api-key \
LRS_API_SECRET=test-api-secret \
yarn test:e2e

# 5. Clean up
docker-compose -f docker-compose.test.yml down
```

### CI/CD (Automatic)

When code is pushed to `main` or a PR is opened:

1. **GitHub Actions** spins up service containers
2. **LRS health check** waits until ready (30s start period, 10 retries)
3. **Seeding script** posts test xAPI statements
4. **Tests run** against populated LRS and Redis
5. **Services terminate** after test completion

**Environment Variables Set by CI:**

```yaml
LRS_URL: http://localhost:8080/xapi
LRS_API_KEY: test-api-key
LRS_API_SECRET: test-api-secret
REDIS_HOST: localhost
REDIS_PORT: 6379
```

## Test Data Details

### xAPI Statements Seeded

- **500 anonymized statements** from production LRS (HASKI Moodle) (~1 MB)
- **Activity types:** Course views, link clicks, module interactions, quiz attempts, and more
- **Verbs:** viewed, clicked, completed, attempted, progressed, etc.
- **Platform:** Moodle LMS and Frontend
- **Context:** Parent activities, extensions with domain info, grouping activities
- **Timestamps:** Production data from June 2024 onwards
- **Valid xAPI 1.0.3** format from production environment

**Privacy & Anonymization (REQ-NF-019):**

- All PII removed: actor names, email addresses, real domains
- Account names hashed consistently for relationship preservation
- Domains replaced with `test-domain-N.example.com`
- Structure and relationships preserved for accurate testing

These are real statements extracted from production LRS and anonymized, ensuring tests validate against diverse, real-world data structures without exposing user data.

### LRS Credentials (Test Only)

**CI Environment:**
```
URL: http://localhost:8080/xapi
API Key: test-api-key
API Secret: test-api-secret
```

**Local Development:**
```
URL: http://localhost:8090/xapi  (mapped from container's 8080)
API Key: test-api-key
API Secret: test-api-secret
```

⚠️ **Never use these credentials in production!**

## Verification

### Check if LRS is running:

```bash
curl http://localhost:8080/health
# Expected: 200 OK
```

### Check seeded statements:

```bash
curl -u "test-api-key:test-api-secret" \
  -H "X-Experience-API-Version: 1.0.3" \
  "http://localhost:8080/xapi/statements"
```

### Check Redis:

```bash
docker exec laac-redis-test redis-cli ping
# Expected: PONG
```

## Troubleshooting

### LRS Not Ready in CI

- **Symptom:** Seeding script fails with "LRS did not become ready"
- **Solution:** Increase `MAX_RETRIES` in `scripts/seed-test-lrs.js` or `start_period` in workflow

### Tests Fail with Connection Errors

- **Check:** Environment variables are set correctly
- **Check:** Service containers have `ports` exposed (not just internal)
- **Check:** Health checks are passing

### Seed Script Fails

- **Check:** LRS health endpoint returns 200
- **Check:** xAPI statements JSON is valid
- **Check:** Basic Auth credentials match

## Benefits

✅ **Real Integration Testing**: Tests validate against actual LRS behavior, not mocks  
✅ **Consistent Environments**: CI and local use identical service versions  
✅ **Known Test Data**: Predictable xAPI statements for assertions  
✅ **Fast Feedback**: Services start in ~30 seconds  
✅ **No External Dependencies**: All services run in containers  
✅ **Reproducible**: Same setup works locally and in cloud

## Next Steps

To refresh or update test data:

1. **Fetch fresh statements** from your LRS:
   ```bash
   LRS_URL=http://localhost:8090/xapi \
   LRS_API_KEY=your-api-key \
   LRS_API_SECRET=your-api-secret \
   node scripts/fetch-lrs-statements.js 10  # 10 pages = 500 statements
   ```
2. **Anonymize the data** (remove PII):
   ```bash
   node scripts/anonymize-xapi-statements.js
   ```
3. **Seed to test LRS**: `node scripts/seed-test-lrs.js`
4. **Update test assertions** if data structure changes

## References

- [Yetanalytics LRSQL Docs](https://github.com/yetanalytics/lrsql)
- [xAPI Specification 1.0.3](https://github.com/adlnet/xAPI-Spec)
- [GitHub Actions Services](https://docs.github.com/en/actions/using-containerized-services)
- [REQ-FN-018: E2E Test Infrastructure](../SRS.md#req-fn-018)
