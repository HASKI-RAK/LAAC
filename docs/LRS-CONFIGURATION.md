# LRS Configuration Guide

This document explains the LRS (Learning Record Store) configuration for LAAC, including environment variable naming conventions and the differences between single-instance and multi-instance setups.

## 📋 Quick Reference

### Environment Variable Names

| Context              | URL Variable           | Username/Key Variable | Password/Secret Variable |
| -------------------- | ---------------------- | --------------------- | ------------------------ |
| **Application Code** | `LRS_DOMAIN`           | `LRS_USER`            | `LRS_SECRET`             |
| **GitHub Secrets**   | `LRS_DOMAIN`           | `LRS_USER`            | `LRS_SECRET`             |
| **Multi-Instance**   | `LRS_INSTANCES` (JSON) | N/A                   | N/A                      |

**Important:** GitHub secrets use different names (`LRS_DOMAIN`, `LRS_USER`) but workflows map them to the standard application variables (`LRS_DOMAIN`, `LRS_USER`).

---

## 🎯 Configuration Methods

### Method 1: Multi-Instance Configuration (Recommended)

For production deployments with multiple LRS instances (REQ-FN-026).

**Environment Variable:** `LRS_INSTANCES` (JSON array)

```bash
# Example: Two LRS instances
LRS_INSTANCES='[
  {
    "id": "hs-ke",
    "name": "HS Kempten",
    "endpoint": "https://ke.lrs.example.com/xapi",
    "timeoutMs": 10000,
    "auth": {
      "type": "basic",
      "username": "api-key-1",
      "password": "api-secret-1"
    }
  },
  {
    "id": "hs-rv",
    "name": "HS Ravensburg",
    "endpoint": "https://rv.lrs.example.com/xapi",
    "timeoutMs": 10000,
    "auth": {
      "type": "basic",
      "username": "api-key-2",
      "password": "api-secret-2"
    }
  }
]'
```

**When to use:**

- Production deployments with multiple LRS
- Each instance has its own ID, endpoint, and credentials
- Full control over timeouts and authentication per instance

---

### Method 2: Single-Instance Configuration (Simple)

For development, testing, or single-LRS deployments.

**Environment Variables:**

```bash
LRS_DOMAIN=https://lrs.example.com/xapi
LRS_USER=your-api-key
LRS_SECRET=your-api-secret
```

**When to use:**

- Local development
- CI/CD testing
- Single LRS deployments
- Backward compatibility with older configs

**Note:** If `LRS_INSTANCES` is not set, the application automatically converts these three variables into a single-instance configuration internally.

---

## 🔐 GitHub Secrets for CI/CD

### Secret Names (Repository Settings)

Configure these in your GitHub repository under **Settings** → **Secrets and variables** → **Actions**:

| GitHub Secret Name | Purpose                 | Example Value                  |
| ------------------ | ----------------------- | ------------------------------ |
| `LRS_DOMAIN`       | LRS endpoint URL        | `https://lrs.example.com/xapi` |
| `LRS_USER`         | LRS API username/key    | `4876c54d1677...`              |
| `LRS_SECRET`       | LRS API password/secret | `61d14e51a4a6...`              |

### Why Different Names?

GitHub secrets use `LRS_DOMAIN` and `LRS_USER` instead of `LRS_DOMAIN` and `LRS_USER` to:

1. **Avoid confusion** with local environment variables
2. **Clearly identify** these as repository-level secrets
3. **Distinguish** between secret names (in GitHub UI) and runtime environment variables

### Mapping in Workflows

Workflows automatically map GitHub secrets to standard environment variables:

```yaml
# .github/workflows/ci-cd.yml
env:
  LRS_DOMAIN: ${{ secrets.LRS_DOMAIN }} # Secret → Env var
  LRS_USER: ${{ secrets.LRS_USER }} # Secret → Env var
  LRS_SECRET: ${{ secrets.LRS_SECRET }} # Same name
```

**Result:** Application code always uses `LRS_DOMAIN`, `LRS_USER`, `LRS_SECRET` regardless of source.

---

## 🏗️ Configuration Priority

The application resolves LRS configuration in this order:

1. **`LRS_INSTANCES`** (highest priority)
   - If set, used directly for multi-instance configuration
   - Ignores `LRS_DOMAIN`, `LRS_USER`, etc.

2. **Single-instance variables** (`LRS_DOMAIN` + `LRS_USER`)
   - Converted internally to single-instance `LRS_INSTANCES`
   - Used if `LRS_INSTANCES` is not set

3. **Prefixed variables** (lowest priority)
   - Pattern: `LRS_<ID>_ENDPOINT`, `LRS_<ID>_USERNAME`, etc.
   - Auto-discovered if neither above method is used

---

## 📝 Examples

### Example 1: Local Development (Single Instance)

**.env file:**

```bash
LRS_DOMAIN=http://localhost:8090/xapi
LRS_USER=test-api-key
LRS_SECRET=test-api-secret
```

**What happens:**

- Test setup converts to single-instance `LRS_INSTANCES`
- Instance ID: `local-dev`
- Instance name: `Local Development LRS`

---

### Example 2: CI/CD (Single Instance via Secrets)

**GitHub Secrets:**

- `LRS_DOMAIN`: `https://test.lrs.example.com/xapi`
- `LRS_USER`: `ci-test-key`
- `LRS_SECRET`: `ci-test-secret`

**Workflow:**

```yaml
env:
  LRS_DOMAIN: ${{ secrets.LRS_DOMAIN }}
  LRS_USER: ${{ secrets.LRS_USER }}
  LRS_SECRET: ${{ secrets.LRS_SECRET }}
```

**What happens:**

- Secrets mapped to standard env vars
- Test setup detects non-localhost URL
- Instance ID: `ci-external`
- Instance name: `External LRS (CI/CD)`

---

### Example 3: Production (Multi-Instance)

**Docker Compose / Environment:**

```bash
LRS_INSTANCES='[
  {"id":"hs-ke","name":"HS Kempten","endpoint":"https://ke.lrs.haski.app/xapi","timeoutMs":10000,"auth":{"type":"basic","username":"key1","password":"secret1"}},
  {"id":"hs-ab","name":"HS Aschaffenburg","endpoint":"https://ab.lrs.haski.app/xapi","timeoutMs":10000,"auth":{"type":"basic","username":"key2","password":"secret2"}}
]'
```

**What happens:**

- Used directly as-is
- Two LRS instances available
- `/api/v1/instances` endpoint returns both
- Metrics can query either instance by ID

---

## 🔍 Verification

### Check Current Configuration

```bash
# View loaded instances (in application logs)
# Look for: "LRS instances configured: [...]"

# Test endpoints
curl http://localhost:3000/api/v1/instances
```

### Common Issues

**Issue:** Tests fail with "No LRS instances configured"

- **Cause:** Neither `LRS_INSTANCES` nor `LRS_DOMAIN`+`LRS_USER` set
- **Fix:** Set `LRS_DOMAIN`, `LRS_USER`, `LRS_SECRET` for single-instance

**Issue:** CI/CD fails with connection errors

- **Cause:** GitHub secrets not configured or incorrect
- **Fix:** Verify `LRS_DOMAIN`, `LRS_USER`, `LRS_SECRET` in repository settings

**Issue:** Local tests fail but CI passes

- **Cause:** Local LRS container not running
- **Fix:** `docker-compose -f docker-compose.test.yml up -d`

---

## 📚 Related Documentation

- [Multi-Instance LRS Setup](./LOCAL-LRS-SETUP.md) - Detailed multi-LRS configuration
- [CI/CD Testing with LRS](./CI-TESTING-WITH-LRS.md) - Testing infrastructure
- [Environment Configuration](./.env.example) - Complete env var reference
- [Architecture: LRS Client](./architecture/ARCHITECTURE.md#lrs-client) - Technical implementation

---

## ⚠️ Security Best Practices

1. **Never commit credentials** to `.env` files
2. **Use GitHub secrets** for CI/CD credentials
3. **Use Docker secrets** or environment injection for production
4. **Rotate credentials** regularly
5. **Use unique credentials** per environment (dev, test, prod)
6. **Audit access** to LRS instances regularly

---

## 🆘 Getting Help

If you encounter configuration issues:

1. Check application logs for LRS instance detection
2. Verify environment variables are set: `echo $LRS_DOMAIN`
3. Test LRS connectivity: `curl -u "$LRS_USER:$LRS_SECRET" "$LRS_DOMAIN/statements"`
4. Review this documentation
5. Check related issues in the repository
