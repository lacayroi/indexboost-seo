# Monitoring & Alerts — IndexBoost SEO

**Stack:** Node.js/Remix · PostgreSQL (Prisma) · Docker  
**Log format:** Structured JSON in production via `app/services/logger.server.ts`  
**Fields:** `{ level, msg, ts, ...context }`  
**Recommended log aggregators:** Logtail, Papertrail, Grafana Cloud Logs, Datadog Logs

All alert queries target the JSON log stream. In Logtail/Grafana, filter by `level:"error"` or `level:"warn"` and match `msg` or context fields as shown per alert.

---

## Alert Definitions

### 1. Dead-Letter Queue Growth

| Field | Value |
|-------|-------|
| **Alert Name** | `DLQ_GROWTH` |
| **Metric / Signal** | DB query: `SELECT COUNT(*) FROM "QueueItem" WHERE attempts >= "maxAttempts"` — OR — log pattern: `level:"error"` + `msg` contains `"max attempts"` or `"dead.letter"` |
| **Threshold** | > 10 rows (P2) · > 50 rows (P1) |
| **Severity** | P2 → P1 |
| **Recommended Action** | 1. Identify which `engine` (google/indexnow) and `shopId` dominate the dead rows via `SELECT engine, shopId, COUNT(*) FROM "QueueItem" WHERE attempts >= "maxAttempts" GROUP BY engine, shopId`. 2. Check corresponding API error logs for that engine. 3. If external API outage: wait and manually reset `attempts = 0, nextRetryAt = NOW()` after service recovers. 4. If a single shop: investigate their credentials/plan limits. |

---

### 2. Google Indexing API Error Spike

| Field | Value |
|-------|-------|
| **Alert Name** | `GOOGLE_SUBMISSION_FAILURE_SPIKE` |
| **Metric / Signal** | Log pattern: `level:"error"` + `msg` contains `"google"` OR DB query: `SELECT COUNT(*) FROM "Submission" WHERE status='failed' AND engine='google' AND "createdAt" > NOW() - INTERVAL '15 minutes'` |
| **Threshold** | > 5 failures in 15 min (P2) · > 20 failures in 15 min or error rate > 50% of Google submissions (P1) |
| **Severity** | P2 → P1 |
| **Recommended Action** | 1. Check [Google Indexing API status](https://status.cloud.google.com/). 2. Inspect log context for HTTP status codes (401 = credential issue; 403 = quota; 429 = rate limit; 5xx = Google outage). 3. If credential issue: verify `GOOGLE_SERVICE_ACCOUNT_KEY` env var is intact in container. 4. If quota: check daily quota in Google Cloud Console. 5. Queue items will self-retry up to `maxAttempts`; if Google is down, pause queue or let items exhaust retries. |

---

### 3. AI Generation Failure Spike

| Field | Value |
|-------|-------|
| **Alert Name** | `AI_GENERATION_FAILURE_SPIKE` |
| **Metric / Signal** | Log pattern: `level:"error"` + `msg` contains `"anthropic"` or `"claude"` or `"ai generation"` |
| **Threshold** | > 3 errors in 10 min (P2) · > 10 errors in 10 min or complete AI feature unavailability (P1) |
| **Severity** | P2 → P1 |
| **Recommended Action** | 1. Check [Anthropic status page](https://status.anthropic.com/). 2. Verify `ANTHROPIC_API_KEY` is set and valid — look for `401` in log context. 3. Check for model deprecation if error references model `claude-haiku-4-5`. 4. AI failures are non-blocking for core indexing; notify merchants only if outage exceeds 1 hour. 5. AI routes (`/app/ai-seo`, `/app/image-seo`) will surface errors to users gracefully; no queue impact. |

---

### 4. Prisma / DB Connection Exhaustion

| Field | Value |
|-------|-------|
| **Alert Name** | `DB_CONNECTION_EXHAUSTION` |
| **Metric / Signal** | Log pattern: `level:"error"` + `msg` contains `"prisma"` or `"connection"` or `"P1001"` or `"P1017"` or `"pool"` |
| **Threshold** | Any occurrence of Prisma error codes P1001/P1017/P2024 (P1) · Repeated `warn` logs about connection wait time > 2s (P2) |
| **Severity** | P1 (connection lost) · P2 (pool pressure) |
| **Recommended Action** | 1. Check `DATABASE_URL` connection string for `connection_limit` parameter (e.g., `?connection_limit=5`). 2. Run `SELECT count(*), state FROM pg_stat_activity GROUP BY state;` on the DB to inspect live connections. 3. If pool saturated: restart the Docker container to release stale connections. 4. If DB unreachable: see INCIDENT_RESPONSE.md → "Database is unreachable" runbook. 5. Long-term: add `?connection_limit=5&pool_timeout=10` to `DATABASE_URL` if not already set. |

---

### 5. Webhook Retry Spike

| Field | Value |
|-------|-------|
| **Alert Name** | `WEBHOOK_RETRY_SPIKE` |
| **Metric / Signal** | Log pattern: `level:"error"` or `level:"warn"` + `msg` contains `"webhook"` · Also monitor Shopify Partner Dashboard → Notifications → Webhook delivery failures |
| **Threshold** | > 5 webhook errors in 15 min (P2) · Shopify reports delivery failure rate > 20% (P1) |
| **Severity** | P2 → P1 |
| **Recommended Action** | 1. Verify app container is reachable at `https://app.indexboostseo.com`. 2. Check HMAC validation logs — repeated `401` on webhook routes means key mismatch or replay; verify `SHOPIFY_API_SECRET` env var. 3. If container is up but returning 500: check recent deploys. 4. If webhooks are queued by Shopify (they retry for 48 h): once app is healthy, missed events will replay. 5. Manually trigger a test webhook from Shopify Partner Dashboard to confirm recovery. |

---

### 6. Billing Sync Failure

| Field | Value |
|-------|-------|
| **Alert Name** | `BILLING_SYNC_FAILURE` |
| **Metric / Signal** | Log pattern: `level:"error"` + `msg` contains `"syncShopBillingStatus"` or `"billing"` |
| **Threshold** | Any single occurrence (P2) · Merchant cannot access paid feature (P1) |
| **Severity** | P2 → P1 |
| **Recommended Action** | 1. Check Shopify Billing API status — `admin.graphql` errors often accompany these. 2. Inspect log context for `shopDomain` to identify affected merchant. 3. Manually query `SELECT plan, "billingStatus" FROM "Shop" WHERE domain = '<shop>'` to see current DB state. 4. If subscription shows `PENDING` for > 5 min: merchant may need to re-approve via the billing page (`/app/billing`). 5. If `ACTIVE` in Shopify but `free` in DB: run a forced sync by having merchant visit `/app/billing`. |

---

### 7. API Latency > 5s

| Field | Value |
|-------|-------|
| **Alert Name** | `API_SLOW_RESPONSE` |
| **Metric / Signal** | Log pattern: `level:"warn"` + `msg` contains `"slow"` or `"latency"` — OR — monitor via uptime tool (Better Uptime, UptimeRobot) for response time > 5000 ms on `https://app.indexboostseo.com` |
| **Threshold** | Single loader/action > 5s (P3) · Median latency > 3s over 5 min (P2) |
| **Severity** | P3 → P2 |
| **Recommended Action** | 1. Check DB query latency: `SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;`. 2. Verify indexes exist on `QueueItem(shopId, nextRetryAt)` and `Submission(shopId, status)`. 3. Check if the queue processor loop (`/app/queue-processor` or equivalent cron) is blocking request threads. 4. Review Remix loaders that call Shopify admin API — these add external latency. 5. Restart container if memory pressure is suspected (`docker stats`). |

---

### 8. Queue Processing Lag

| Field | Value |
|-------|-------|
| **Alert Name** | `QUEUE_PROCESSING_LAG` |
| **Metric / Signal** | DB query: `SELECT COUNT(*) FROM "QueueItem" WHERE "nextRetryAt" < NOW() - INTERVAL '30 minutes' AND attempts < "maxAttempts"` |
| **Threshold** | > 20 overdue items (P2) · > 100 overdue items or lag > 2 hours (P1) |
| **Severity** | P2 → P1 |
| **Recommended Action** | 1. Verify queue worker process is running (`docker logs indexboost-seo --tail 50 \| grep "queue"`). 2. Check for app restart loops that interrupt queue processing. 3. If worker is stuck: restart the container to resume processing. 4. If item count keeps growing post-restart: check for DB deadlocks (`SELECT * FROM pg_locks WHERE NOT granted`). 5. Alert merchants via status page only if lag exceeds 4 hours on Pro/Business plans. |

---

### 9. App Health Endpoint Failing

| Field | Value |
|-------|-------|
| **Alert Name** | `HEALTH_CHECK_FAILING` |
| **Metric / Signal** | Docker HEALTHCHECK: `curl -sf http://localhost:3000/` exits non-zero · External uptime monitor: `https://app.indexboostseo.com` returns non-2xx or times out |
| **Threshold** | Container `UNHEALTHY` for > 2 minutes (P1) · External monitor down for > 1 minute (P1) |
| **Severity** | P1 |
| **Recommended Action** | 1. Check container state: `docker ps` — if `(unhealthy)`, run `docker logs indexboost-seo --tail 100`. 2. If crash-loop: check startup logs for Prisma migration errors or missing env vars. 3. If OOM killed: `docker inspect indexboost-seo \| grep OOMKilled`. 4. Immediate: restore from last stable image (see `ROLLBACK_PLAN.md`). 5. Do not wait — escalate to P1 immediately and follow the "App is completely down" runbook in `INCIDENT_RESPONSE.md`. |

---

### 10. Shopify API Rate Limiting (429)

| Field | Value |
|-------|-------|
| **Alert Name** | `SHOPIFY_RATE_LIMIT_429` |
| **Metric / Signal** | Log pattern: `level:"warn"` or `level:"error"` + `msg` contains `"429"` or `"rate limit"` or `"throttled"` or `"THROTTLED"` |
| **Threshold** | > 5 occurrences in 5 min (P3) · > 20 occurrences in 5 min or blocking core feature (P2) |
| **Severity** | P3 → P2 |
| **Recommended Action** | 1. Identify which route/loader is generating the 429s from log context (`shopDomain`, `query`). 2. Shopify GraphQL Admin API uses leaky-bucket: 1000 points, 50 points/s restore. Heavy loaders (image SEO, bulk product fetch) may burst. 3. Short-term: add `await new Promise(r => setTimeout(r, 500))` back-off in the affected service. 4. Long-term: batch Shopify queries (already done in image-seo — ensure pattern is followed). 5. If a single merchant is triggering all 429s: check if they have an unusually large catalog. |

---

## Log Aggregator Setup (Quick Reference)

### Logtail (recommended)
```bash
# Ship Docker logs to Logtail via Fluent Bit or Docker log driver
docker run --log-driver=fluentd --log-opt fluentd-address=localhost:24224 indexboost-seo
```
Create alerts in Logtail UI: **Alerts → New Alert → JSON filter → `level` = `error`**.

### Grafana Cloud Logs (Loki)
```logql
# Dead-letter queue errors
{container="indexboost-seo"} | json | level="error" | msg=~".*max attempts.*"

# Google API failures
{container="indexboost-seo"} | json | level="error" | msg=~".*google.*"

# Billing sync errors
{container="indexboost-seo"} | json | level="error" | msg=~".*syncShopBillingStatus.*|.*billing.*"
```

### Papertrail
Use saved searches with filters on `"level":"error"` and keyword match, then enable email/Slack alerts on search hits.

---

## Severity Reference

| Severity | Response Time | Definition |
|----------|--------------|------------|
| P1 | Immediate (< 15 min) | Revenue impact or complete outage |
| P2 | < 2 hours | Degraded service for subset of merchants |
| P3 | Next business day | Minor issue, workaround available |
