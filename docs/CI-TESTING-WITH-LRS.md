# Testing with Real LRS and Redis in CI/CD

This guide explains how LAAC tests against real LRS (Learning Record Store) and Redis instances in GitHub Actions CI/CD pipelines, with automatic environment detection for seamless local and cloud testing.

## Overview

When GitHub Copilot or any CI/CD runner executes tests, they now run against:

- **Redis 7** (for caching tests)
- **External LRS** (your production-like LRS with pre-populated test data - CI/CD only)
- **Local LRS** (containerized Yetanalytics LRSQL - local development only)

**Key Feature: Automatic Environment Detection** - Tests automatically use the correct LRS configuration based on the environment without manual intervention.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions Runner (Ubuntu)                              │
│                                                              │
│  ┌──────────────┐    ┌─────────────┐                        │
│  │ LAAC App     │───▶│ Redis       │                        │
│  │ (Tests)      │    │ :6379       │                        │
│  └──────┬───────┘    └─────────────┘                        │
│         │                                                    │
│         └────────────────────────────────────────────────┐  │
└──────────────────────────────────────────────────────────┼──┘
                                                           │
                                                           ▼
                                       ┌────────────────────────────┐
                                       │ External LRS (GitHub Repo) │
                                       │ - Pre-populated test data  │
                                       │ - Production-like env      │
                                       │ - Accessible via secrets   │
                                       └────────────────────────────┘
```

## Files Created/Modified

### 1. GitHub Secrets Configuration

**Repository Secrets (configured in GitHub):**

| GitHub Secret Name | Maps to Environment Variable | Purpose                                    |
| ------------------ | ---------------------------- | ------------------------------------------ |
| `LRS_DOMAIN`       | `LRS_URL`                    | Full URL to your external LRS endpoint     |
| `LRS_API_USER`     | `LRS_API_KEY`                | LRS API username/key for authentication    |
| `LRS_API_SECRET`   | `LRS_API_SECRET`             | LRS API password/secret for authentication |

**Important:** GitHub secrets use different names (`LRS_DOMAIN`, `LRS_API_USER`) to distinguish them from local environment variables. Workflows automatically map these to standard application variables (`LRS_URL`, `LRS_API_KEY`).

These secrets are injected into the CI/CD environment and Copilot workspace for testing.

**See:** [docs/LRS-CONFIGURATION.md](LRS-CONFIGURATION.md) for complete LRS configuration guide.

### 2. Test Fixtures

**File:** `test/fixtures/xapi-statements.json`

- Contains 500 sample xAPI statements
- Covers various scenarios: completed, attempted, progressed, failed
- Multiple students and activities
- Valid xAPI 1.0.3 format

**Note:** Your external LRS should be pre-populated with test data for reliable test execution.

### 3. LRS Seeding Script (for local testing)

**File:** `scripts/seed-test-lrs.js`

- Node.js script to populate LRS with test data
- Waits for LRS health check (up to 45 seconds)
- Posts xAPI statements via LRS API
- Exits with proper codes for CI/CD

**Note:** CI/CD uses pre-populated external LRS; seeding only needed for local development.

### 4. Docker Compose Test Configuration

**File:** `docker-compose.test.yml`

- Added `lrs-db-test`: PostgreSQL 16 for LRS
- Added `lrs-test`: Yetanalytics LRSQL instance
- Health checks for all services
- Network isolation for tests

**Note:** For local development only; CI/CD uses external LRS.

### 5. CI/CD Workflows

**Files:**

- `.github/workflows/ci-cd.yml` (main branch pushes)
- `.github/workflows/nest_js.yml` (pull requests)
- `.github/workflows/copilot-setup-steps.yml` (Copilot environment)

**Changes:**

- Added `services` section with Redis container
- Removed local PostgreSQL and LRS containers (using external LRS instead)
- Set environment variables from GitHub secrets for external LRS connectivity
- All tests now run against external LRS with pre-populated data

### 6. Test Setup

**File:** `test/setup-e2e.ts`

- Automatically detects environment (CI vs local) based on LRS_URL
- CI/CD: Uses environment variables from GitHub secrets
- Local: Falls back to localhost defaults for docker-compose.test.yml
- Logs which environment is being used for transparency
- Configurable via env vars in both environments

**Environment Detection Logic:**

```typescript
// CI detected when LRS_URL doesn't contain 'localhost'
const isCI = !lrsUrl.includes('localhost');
```

This ensures tests automatically use the correct configuration without manual intervention.

## Usage

### CI/CD Testing (Automatic with GitHub Secrets)

When code is pushed to `main` or a PR is opened:

1. **GitHub Actions** spins up Redis service container
2. **Environment variables** injected from repository secrets:
   - `LRS_URL=${{ secrets.LRS_DOMAIN }}`
   - `LRS_API_KEY=${{ secrets.LRS_API_USER }}`
   - `LRS_API_SECRET=${{ secrets.LRS_API_SECRET }}`
3. **Tests run** against your pre-populated external LRS
4. **Services terminate** after test completion

**No seeding required** - your external LRS already has test data populated.

### Local Testing (with local LRS)

For local development with a containerized LRS:

```bash
# 1. (Optional) Create .env.test for custom configuration
cp .env.test.example .env.test

# 2. Start test infrastructure
docker-compose -f docker-compose.test.yml up -d

# 3. Wait for services to be healthy (check logs)
docker-compose -f docker-compose.test.yml logs -f

# 4. Seed test data
node scripts/seed-test-lrs.js

# 5. Run E2E tests (automatically uses local LRS)
yarn test:e2e
# Output: [E2E Setup] Using LRS: Local Development LRS at http://localhost:8090/xapi

# 6. Clean up
docker-compose -f docker-compose.test.yml down
```

**How it works:**

- Test setup detects localhost URL and uses local configuration
- No environment variables needed (uses defaults)
- Fallback values: `test-api-key` / `test-api-secret`

### Local Testing (with external LRS)

To test against the same external LRS used in CI/CD:

```bash
# Method 1: Set environment variables
export LRS_URL="https://your-lrs-domain.com/xapi"
export LRS_API_KEY="your-api-user"
export LRS_API_SECRET="your-api-secret"
yarn test:e2e
# Output: [E2E Setup] Using LRS: External LRS (CI/CD) at https://your-lrs-domain.com/xapi

# Method 2: Use .env.test file
cp .env.test.example .env.test
# Edit .env.test with your external LRS credentials
yarn test:e2e
```

**How it works:**

- Test setup detects non-localhost URL
- Automatically configures for external LRS
- Same behavior as CI/CD environment

### CI/CD Environment Variables

**Automatically injected from GitHub secrets:**

```yaml
LRS_URL: ${{ secrets.LRS_DOMAIN }}
LRS_API_KEY: ${{ secrets.LRS_API_USER }}
LRS_API_SECRET: ${{ secrets.LRS_API_SECRET }}
REDIS_HOST: localhost
REDIS_PORT: 6379
```

**For Copilot workspace:** Same secrets are available via `copilot-setup-steps.yml` workflow.

## Environment Detection

The test setup (`test/setup-e2e.ts`) automatically detects whether tests are running locally or in CI/CD:

### Detection Logic

```typescript
const lrsUrl = process.env.LRS_URL || 'http://localhost:8090/xapi';
const isCI = !lrsUrl.includes('localhost');
```

### Environment Configurations

| Environment               | LRS_URL                         | Credentials                                       | Detection                          |
| ------------------------- | ------------------------------- | ------------------------------------------------- | ---------------------------------- |
| **CI/CD**                 | `secrets.LRS_DOMAIN` (external) | `secrets.LRS_API_USER` / `secrets.LRS_API_SECRET` | URL doesn't contain "localhost"    |
| **Local (containerized)** | `http://localhost:8090/xapi`    | `test-api-key` / `test-api-secret`                | URL contains "localhost" (default) |
| **Local (external)**      | User-provided external URL      | User-provided credentials                         | URL doesn't contain "localhost"    |

### Console Output

Tests log which LRS they're using:

```bash
# CI/CD or external LRS
[E2E Setup] Using LRS: External LRS (CI/CD) at https://lrs.example.com/xapi

# Local containerized LRS
[E2E Setup] Using LRS: Local Development LRS at http://localhost:8090/xapi
```

This provides transparency and helps debug configuration issues.

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

### LRS Credentials

**CI/CD Environment (via GitHub Secrets):**

```
URL: ${{ secrets.LRS_DOMAIN }}
API User: ${{ secrets.LRS_API_USER }}
API Secret: ${{ secrets.LRS_API_SECRET }}
```

Your external LRS should be pre-populated with test data for reliable testing.

**Local Development (containerized LRS):**

```
URL: http://localhost:8090/xapi  (mapped from container's 8080)
API Key: test-api-key
API Secret: test-api-secret
```

⚠️ **Never use production credentials in code or commit them to the repository!**

## Verification

### Check if external LRS is accessible (CI/CD):

```bash
# This is done automatically by the test setup
# Tests will fail if LRS is unreachable
```

### Check if local LRS is running:

```bash
# For local containerized LRS
curl http://localhost:8080/health
# Expected: 200 OK
```

### Check seeded statements (local LRS):

```bash
curl -u "test-api-key:test-api-secret" \
  -H "X-Experience-API-Version: 1.0.3" \
  "http://localhost:8090/xapi/statements"
```

### Check Redis:

```bash
docker exec laac-redis-test redis-cli ping
# Expected: PONG
```

## Troubleshooting

### Tests Fail with "LRS Connection Error" in CI

- **Check:** GitHub secrets are configured correctly:
  - `LRS_DOMAIN` should be full URL (e.g., `https://lrs.example.com/xapi`)
  - `LRS_API_USER` and `LRS_API_SECRET` match your LRS credentials
- **Check:** External LRS is accessible from GitHub Actions runners
- **Check:** LRS has proper CORS/authentication configuration

### LRS Not Ready in Local Development

- **Symptom:** Seeding script fails with "LRS did not become ready"
- **Solution:** Increase `MAX_RETRIES` in `scripts/seed-test-lrs.js` or wait longer for container startup

### Tests Fail with Connection Errors (Local)

- **Check:** Environment variables are set correctly
- **Check:** Service containers have `ports` exposed (not just internal)
- **Check:** Health checks are passing

### Seed Script Fails (Local)

- **Check:** LRS health endpoint returns 200
- **Check:** xAPI statements JSON is valid
- **Check:** Basic Auth credentials match

## Benefits

✅ **Real Integration Testing**: Tests validate against actual LRS behavior, not mocks  
✅ **Production-Like Environment**: CI/CD uses same LRS as production testing  
✅ **Secure Credentials**: GitHub secrets protect sensitive LRS credentials  
✅ **Fast Feedback**: Tests run directly against pre-populated LRS  
✅ **Copilot Compatible**: Same environment available for AI-assisted development  
✅ **No Container Overhead**: CI/CD doesn't need to spin up LRS containers

## GitHub Secrets Configuration

To configure the repository secrets:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

| GitHub Secret Name | Maps to Env Variable | Example Value                  | Purpose                 |
| ------------------ | -------------------- | ------------------------------ | ----------------------- |
| `LRS_DOMAIN`       | `LRS_URL`            | `https://lrs.example.com/xapi` | Full LRS endpoint URL   |
| `LRS_API_USER`     | `LRS_API_KEY`        | `4876c54d1677...`              | LRS API username/key    |
| `LRS_API_SECRET`   | `LRS_API_SECRET`     | `61d14e51a4a6...`              | LRS API password/secret |

**Important:**

- GitHub secrets use different names to avoid confusion with local `.env` files
- Workflows automatically map these to standard application variables
- Application code always uses `LRS_URL`, `LRS_API_KEY`, `LRS_API_SECRET`

### Why Different Names?

- **`LRS_DOMAIN`** vs `LRS_URL`: Distinguishes secret name from environment variable
- **`LRS_API_USER`** vs `LRS_API_KEY`: Clarifies it's a username/key, not just any key
- **`LRS_API_SECRET`**: Same name in both contexts for consistency

This naming convention makes it clear when you're configuring secrets (in GitHub UI) vs setting environment variables (in code/configs).

**See:** [docs/LRS-CONFIGURATION.md](LRS-CONFIGURATION.md) for complete configuration guide including multi-instance setup.

These secrets will be automatically available in:

- CI/CD workflows (`ci-cd.yml`, `nest_js.yml`)
- Copilot workspace (`copilot-setup-steps.yml`)

## Next Steps

### For CI/CD Testing

1. **Ensure GitHub secrets are configured** with your external LRS credentials
2. **Verify external LRS has test data** populated for consistent test results
3. **Monitor test runs** to ensure connectivity and data availability

### For Local Development

To refresh or update test data in local LRS:

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
