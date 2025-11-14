# Local LRS Development Setup

This guide explains how to run LAAC against a local LRS instance with restored production data.

## Overview

The local LRS setup provides:

- **Yetanalytics LRSQL** running on `http://localhost:8090`
- **PostgreSQL database** on port `5433` (to avoid conflicts)
- **pgAdmin** web UI on `http://localhost:5050`
- Isolated Docker network for all services

## Quick Start

### 1. Start Local LRS

```bash
# Start LRS services
docker compose -f docker-compose.lrs-local.yml up -d

# Verify services are healthy
docker compose -f docker-compose.lrs-local.yml ps

# View logs
docker compose -f docker-compose.lrs-local.yml logs -f
```

**Expected services:**

- `laac-lrs-db` - PostgreSQL database
- `laac-lrs` - LRSQL xAPI server
- `laac-lrs-pgadmin` - Database management UI

### 2. Restore Production Backup

#### Option A: Via pgAdmin (Recommended)

1. **Open pgAdmin**: http://localhost:5050
   - Email: `dev@laac.local`
   - Password: `admin123`

2. **Add Server Connection**:
   - Right-click "Servers" → "Register" → "Server"
   - **General Tab**:
     - Name: `Local LRS DB`
   - **Connection Tab**:
     - Host: `lrs-db` (Docker network) or `localhost` (from host)
     - Port: `5432` (internal) or `5433` (from host)
     - Database: `lrsql_db`
     - Username: `lrsql_user`
     - Password: `lrsql_password`

3. **Restore Backup**:
   - Right-click database `lrsql_db` → "Restore"
   - Select your backup file (`.dump`, `.sql`, or `.tar`)
   - Click "Restore"

#### Option B: Via Command Line

```bash
# Copy backup file to container
docker cp /path/to/your-backup.sql laac-lrs-db:/tmp/backup.sql

# Restore database
docker exec -i laac-lrs-db psql -U lrsql_user -d lrsql_db < /path/to/your-backup.sql

# Or if using pg_restore (custom format)
docker exec laac-lrs-db pg_restore -U lrsql_user -d lrsql_db /tmp/backup.dump
```

### 3. Verify LRS is Working

```bash
# Check LRS health
curl http://localhost:8090/health

# Check xAPI About endpoint
curl -u dev-api-key-change-me:dev-api-secret-change-me \
  http://localhost:8090/xapi/about

# Query statements (should return your restored data)
curl -u dev-api-key-change-me:dev-api-secret-change-me \
  "http://localhost:8090/xapi/statements?limit=10"
```

### 4. Configure LAAC

```bash
# Copy local environment configuration
cp .env.local .env

# Or use .env.local directly
export NODE_ENV=development
```

**Key configuration** (already in `.env.local`):

```bash
LRS_INSTANCES='[
  {
    "id": "local-dev",
    "name": "Local Development LRS",
    "endpoint": "http://localhost:8090/xapi",
    "auth": {
      "type": "basic",
      "username": "dev-api-key-change-me",
      "password": "dev-api-secret-change-me"
    }
  }
]'
```

### 5. Run LAAC

```bash
# Start Redis (if not already running)
docker compose -f docker-compose.dev.yml up redis -d

# Start LAAC in development mode
yarn start:dev

# Or run tests
yarn test:e2e

# Swagger UI
open http://localhost:3000/api/v1/docs
```

## Configuration Details

### LRS Credentials

**Default credentials** (change in `docker-compose.lrs-local.yml` if needed):

| Component  | Username/Key            | Password/Secret            |
| ---------- | ----------------------- | -------------------------- |
| LRS API    | `dev-api-key-change-me` | `dev-api-secret-change-me` |
| LRS Admin  | `admin`                 | `admin123`                 |
| pgAdmin    | `dev@laac.local`        | `admin123`                 |
| PostgreSQL | `lrsql_user`            | `lrsql_password`           |

### Port Mapping

| Service     | Internal Port | External Port | URL                    |
| ----------- | ------------- | ------------- | ---------------------- |
| LRS (HTTP)  | 8080          | 8090          | http://localhost:8090  |
| LRS (HTTPS) | 8443          | 8093          | https://localhost:8093 |
| PostgreSQL  | 5432          | 5433          | localhost:5433         |
| pgAdmin     | 80            | 5050          | http://localhost:5050  |

### Volume Persistence

Data is persisted in Docker volumes:

- `laac-lrs-db-data` - PostgreSQL database
- `laac-lrs-pgadmin-data` - pgAdmin configuration

**Backup volumes** (optional):

```bash
docker run --rm -v laac-lrs-db-data:/data -v $(pwd):/backup \
  busybox tar czf /backup/lrs-db-backup.tar.gz /data
```

## Troubleshooting

### LRS Won't Start

```bash
# Check logs
docker compose -f docker-compose.lrs-local.yml logs lrs

# Common issue: Database not ready
# Wait for health check to pass:
docker compose -f docker-compose.lrs-local.yml ps
```

### Database Connection Failed

```bash
# Verify PostgreSQL is accessible
docker exec -it laac-lrs-db psql -U lrsql_user -d lrsql_db -c "\dt"

# Check database exists
docker exec -it laac-lrs-db psql -U lrsql_user -l
```

### Can't Access LRS API

```bash
# Check LRS is listening
docker exec laac-lrs curl -f http://localhost:8080/health

# Check from host
curl http://localhost:8090/health

# Verify credentials
curl -u dev-api-key-change-me:dev-api-secret-change-me \
  http://localhost:8090/xapi/about
```

### LAAC Can't Connect to LRS

1. **Check network connectivity**:

   ```bash
   # From host
   curl http://localhost:8090/xapi/about
   ```

2. **Verify credentials in `.env.local`** match Docker Compose

3. **Check LAAC logs**:

   ```bash
   yarn start:dev
   # Look for LRS connection errors
   ```

4. **Test circuit breaker isn't open**:
   ```bash
   curl http://localhost:3000/health/readiness
   # Should show LRS status
   ```

## Data Management

### Reset Database

```bash
# Stop services
docker compose -f docker-compose.lrs-local.yml down

# Remove volumes (CAUTION: Deletes all data!)
docker volume rm laac-lrs-db-data

# Restart fresh
docker compose -f docker-compose.lrs-local.yml up -d
```

### Export Data

```bash
# Export via pg_dump
docker exec laac-lrs-db pg_dump -U lrsql_user lrsql_db > backup-$(date +%Y%m%d).sql

# Or via pgAdmin: Right-click database → Backup
```

### Seed Test Data

```bash
# Use LAAC test fixtures or xAPI statement generator
# Example: Load statements via LRS API
curl -X POST http://localhost:8090/xapi/statements \
  -u dev-api-key-change-me:dev-api-secret-change-me \
  -H "Content-Type: application/json" \
  -H "X-Experience-API-Version: 1.0.3" \
  -d @test/fixtures/xapi-statements.json
```

## Development Workflow

### Recommended Setup

1. **Terminal 1**: LRS services

   ```bash
   docker compose -f docker-compose.lrs-local.yml up
   ```

2. **Terminal 2**: Redis (if needed)

   ```bash
   docker compose -f docker-compose.dev.yml up redis
   ```

3. **Terminal 3**: LAAC development server

   ```bash
   yarn start:dev
   ```

4. **Terminal 4**: Run tests as needed
   ```bash
   yarn test:e2e
   ```

### Testing Against Real Data

With restored production data, you can:

✅ **Test metric computations** with realistic xAPI statements  
✅ **Validate query performance** with production data volumes  
✅ **Debug statement parsing** issues from real Moodle/Frontend data  
✅ **Test multi-course scenarios** with actual course hierarchies  
✅ **Verify actor handling** with real student pseudonyms

## Security Notes

⚠️ **This setup is for LOCAL DEVELOPMENT ONLY**

- Default credentials are intentionally weak
- All services exposed on localhost
- No TLS/HTTPS on LRS (use HTTP)
- Database accessible on host (port 5433)
- CORS set to allow all origins

🔒 **Never use these configurations in production!**

## Clean Up

```bash
# Stop services
docker compose -f docker-compose.lrs-local.yml down

# Remove volumes (delete all data)
docker compose -f docker-compose.lrs-local.yml down -v

# Remove images (optional)
docker rmi yetanalytics/lrsql postgres dpage/pgadmin4
```

## References

- [Yetanalytics LRSQL Documentation](https://github.com/yetanalytics/lrsql)
- [xAPI Specification](https://github.com/adlnet/xAPI-Spec)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)

## Support

For issues with:

- **LRS setup**: Check Yetanalytics LRSQL GitHub issues
- **LAAC configuration**: See `docs/architecture/ARCHITECTURE.md`
- **xAPI queries**: See `docs/resources/xapi/API-lrs-documentation.md`
