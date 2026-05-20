# IndexBoost SEO - Production Deployment Guide

This guide covers the complete steps to deploy IndexBoost SEO to production at `https://app.indexboostseo.com`. Follow every step in order. Do not skip the verification steps — they catch configuration errors before merchants are affected.

---

## 1. Prerequisites

| Requirement | Version / Notes |
|---|---|
| Node.js | 22.x (LTS) |
| npm | Bundled with Node 22 |
| Docker | 24.x or later |
| Docker Compose | v2 (`docker compose` not `docker-compose`) |
| PostgreSQL | 16 (provided via `docker-compose.postgres.yml` or external managed instance) |
| Git | Any recent version |
| Shopify CLI | 3.x (`npm install -g @shopify/cli`) |
| A domain with HTTPS | `https://app.indexboostseo.com` with a valid TLS certificate |

The app runs on port `3000` inside the container. Your hosting environment or reverse proxy must route HTTPS traffic to this port.

---

## 2. Environment Variables

All required environment variables must be set before build and start. The app's startup script (`scripts/validate-env.mjs`) will fail fast if any required variable is missing or contains an unsafe placeholder value.

### Required

```bash
# Shopify app credentials (from Shopify Partner Dashboard)
SHOPIFY_API_KEY="your_production_client_id"
SHOPIFY_API_SECRET="your_production_client_secret"

# Must match the public app URL exactly — no trailing slash
SHOPIFY_APP_URL="https://app.indexboostseo.com"

# All scopes the app requests — must match shopify.app.toml exactly
SCOPES="read_products,write_products,read_content,write_content,read_online_store_navigation,write_online_store_navigation,read_themes,write_themes"

# PostgreSQL connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/indexboost_seo?schema=public"

# Anthropic API key for AI SEO generation feature
ANTHROPIC_API_KEY="your_anthropic_api_key"

# Must be "production" in production
NODE_ENV="production"

# Must be false in production — true only for development store testing
SHOPIFY_BILLING_TEST="false"
```

### Optional (used for production PostgreSQL schema management)

```bash
# Same value as DATABASE_URL unless you use separate migration credentials
POSTGRES_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/indexboost_seo?schema=public"
```

### Do Not Include

- Do not set `SHOPIFY_APP_URL` to an `admin.shopify.com` URL or `localhost`.
- Do not set `SHOPIFY_BILLING_TEST=true` in production.
- Do not commit `.env` files containing production secrets to version control.

---

## 3. Database Setup

### Option A: Docker Compose (local or self-hosted)

```bash
# Start the PostgreSQL container
docker compose -f docker-compose.postgres.yml up -d

# Verify the container is healthy
docker compose -f docker-compose.postgres.yml ps
```

The container uses:
- Database name: `indexboost_seo`
- User: `indexboost`
- Port: `5433` on host (maps to 5432 inside the container)

### Option B: Managed PostgreSQL (recommended for production)

Use your cloud provider's managed PostgreSQL 16 service (e.g., AWS RDS, Supabase, Railway, Render). Ensure the app host can reach the database host on port 5432.

### Apply Migrations

```bash
# Validate the schema
npx prisma validate

# Apply all pending migrations to the production database
npx prisma migrate deploy
```

For the production PostgreSQL schema (if using `prisma/schema.production.prisma`):

```bash
npm run prisma:prod:validate
npm run prisma:prod:generate
npm run prisma:prod:migrate
```

**Always run `pg_dump` (see step 7) before applying migrations to an existing production database.**

---

## 4. Build Steps

```bash
# Install exact dependency versions from package-lock.json
npm ci

# Build the Remix app (outputs to build/)
npm run build
```

The build step compiles the Remix app with Vite. It must complete without errors before proceeding. Common build failures: missing environment variables referenced at build time, TypeScript errors, or Prisma client not generated.

---

## 5. Docker Build and Run

### Build the image

```bash
docker build -t indexboost-seo:latest .
```

The `Dockerfile` uses `node:22-alpine`, installs dependencies, builds the app, prunes dev dependencies, and runs as a non-root user. Build tags should include the git commit SHA for traceability:

```bash
git_sha=$(git rev-parse --short HEAD)
docker build -t indexboost-seo:${git_sha} -t indexboost-seo:latest .
```

### Run the container

```bash
docker run -d \
  --name indexboost-seo \
  --restart unless-stopped \
  -p 3000:3000 \
  -e SHOPIFY_API_KEY="${SHOPIFY_API_KEY}" \
  -e SHOPIFY_API_SECRET="${SHOPIFY_API_SECRET}" \
  -e SHOPIFY_APP_URL="${SHOPIFY_APP_URL}" \
  -e SCOPES="${SCOPES}" \
  -e DATABASE_URL="${DATABASE_URL}" \
  -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
  -e NODE_ENV="production" \
  -e SHOPIFY_BILLING_TEST="false" \
  indexboost-seo:latest
```

**Use environment variable injection from your secrets manager** (e.g., AWS Secrets Manager, Doppler, Docker secrets) rather than hardcoding values in the run command.

### Verify the container started

```bash
docker ps --filter name=indexboost-seo
docker logs indexboost-seo --tail 50
```

Expected output: server listening on port 3000, no startup errors.

---

## 6. Shopify App Config Deploy

Before deploying config, verify `shopify.app.toml` contains production values:

```bash
grep "application_url" shopify.app.toml
# Expected: application_url = "https://app.indexboostseo.com"

grep "localhost\|shopify.dev\|YOUR_PRODUCTION" shopify.app.toml
# Expected: no output (these placeholder strings must not appear)
```

Deploy the app configuration to the Shopify Partner Dashboard:

```bash
npm run deploy
# or directly:
npx shopify app deploy
```

This command pushes `shopify.app.toml` settings to Shopify, including:
- App URL
- Redirect URLs
- App proxy configuration
- Webhook subscriptions (all topics and compliance webhooks)
- Access scopes

Confirm the deploy completes without errors. Shopify CLI will report any configuration validation failures.

---

## 7. Health Check Verification

The Docker container includes a health check:

```bash
# Check Docker health status
docker inspect --format='{{.State.Health.Status}}' indexboost-seo
# Expected: healthy
```

Manual HTTP health check:

```bash
curl -sf --max-time 10 https://app.indexboostseo.com/
# Expected: HTTP 200 or 302 (app loads or redirects to Shopify OAuth)
```

If the health check returns `unhealthy`:
1. Check container logs: `docker logs indexboost-seo --tail 100`
2. Verify environment variables are set correctly
3. Verify database is reachable from the container
4. Verify the port mapping is correct

---

## 8. Queue Worker Verification

The app runs a background queue worker that processes URL submission jobs. Verify it is running:

```bash
docker logs indexboost-seo 2>&1 | grep -i "queue\|worker"
# Expected: queue worker started log line
```

To verify end-to-end: install the app on a test store, update a product, and check that a submission log record appears within 30 seconds.

---

## 9. Webhook Verification

After deploying, verify webhooks are registered and reachable.

**Check webhook registration in Shopify Partner Dashboard:**

1. Open Partner Dashboard > Apps > IndexBoost SEO > Webhooks.
2. Confirm all webhooks from `shopify.app.toml` are listed.

**Verify GDPR compliance webhooks:**

1. Open Partner Dashboard > Apps > IndexBoost SEO > GDPR webhooks.
2. Use the built-in tester to send a test payload to each of the three compliance webhook endpoints.
3. All three must return HTTP 200.

**Verify product webhook:**

1. Install the app on a test store.
2. Edit and save any product in Shopify Admin.
3. Check app logs for the webhook receipt and queue item creation:

```bash
docker logs indexboost-seo --tail 50 | grep "webhook\|queue"
```

---

## 10. Smoke Test Procedure

Run this checklist after every production deployment before announcing the release.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Open `https://app.indexboostseo.com/` | Redirects to Shopify OAuth or loads the embedded app |
| 2 | Install app on a test development store | Scopes approval works, app loads dashboard |
| 3 | Dashboard loads | Onboarding checklist visible, plan shows Free, no JS errors |
| 4 | Open Settings | IndexNow key displayed, Google credentials upload form present |
| 5 | Test IndexNow key URL | `https://{test-store}/apps/indexboost/{key}.txt` returns the key as plain text |
| 6 | Submit a URL manually | Submission record appears in Logs with status |
| 7 | Update a product in Shopify Admin | Submission record appears in Logs within 30 seconds |
| 8 | Open Plans page | Shows Free plan, upgrade buttons visible |
| 9 | Start Pro upgrade flow | Shopify confirmation page loads |
| 10 | Approve test charge (requires `SHOPIFY_BILLING_TEST=false` in production — use dev store for this step) | Plan updates to Pro, Pro features unlock |
| 11 | Open `https://{test-store}/robots.txt` after editing Robots.txt | Updated content is live |
| 12 | Open GDPR webhook tester in Partner Dashboard | All 3 compliance webhooks return 200 |
| 13 | Uninstall app | `app/uninstalled` webhook fires, shop data deleted from database |

If any step fails, do not proceed. Roll back using the procedure in `ROLLBACK_PLAN.md`.

---

## Database Backup Before Every Deploy

Always create a database backup before deploying a new version:

```bash
pg_dump \
  --host=YOUR_DB_HOST \
  --port=5432 \
  --username=indexboost \
  --dbname=indexboost_seo \
  --format=custom \
  --file="backup_$(date +%Y%m%d_%H%M%S).dump"
```

Store the backup in a location separate from the database host. Verify the backup file is non-zero in size before proceeding with the deployment.
