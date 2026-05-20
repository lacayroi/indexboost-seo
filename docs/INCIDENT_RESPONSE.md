# Incident Response — IndexBoost SEO

**App:** https://app.indexboostseo.com  
**Stack:** Node.js/Remix · PostgreSQL · Docker  
**Team size:** 1 person (solo SaaS)

---

## 1. Severity Definitions

| Level | Definition | Example | Target Response |
|-------|------------|---------|-----------------|
| **P1** | Complete outage or active revenue loss | App down, DB unreachable, billing broken | Immediate — drop everything, < 15 min |
| **P2** | Significant degradation, core feature broken for subset of merchants | All Google submissions failing, queue stuck | Respond within 2 hours |
| **P3** | Minor issue, workaround exists, no merchant impact yet | Slow responses, one-off error, cosmetic | Next working session |

---

## 2. On-Call Escalation Path (Solo SaaS)

This is a 1-person operation. The escalation path is practical, not corporate.

```
1. YOU (primary)
   └── Check phone/email alert from uptime monitor
   └── Log into server / VPN within 15 min for P1

2. If YOU are unreachable or unable to resolve in 1 hour:
   └── Shopify infrastructure (app hosting)? → Shopify Partner Support
   └── DB / VPS hosting issue? → VPS provider support (e.g., DigitalOcean, Hetzner)
   └── Google Indexing API down? → https://status.cloud.google.com/
   └── Anthropic API down? → https://status.anthropic.com/

3. Merchant communication:
   └── Post to status page (e.g., Statuspage.io free tier)
   └── Send email to affected merchants for outages > 1 hour (template in §6)
```

**Uptime monitor:** Configure Better Uptime or UptimeRobot to alert via SMS + email for `https://app.indexboostseo.com` down > 1 min.

---

## 3. P1 Runbooks

---

### Runbook P1-A: App is Completely Down (Docker Container Crash)

**Symptoms:** Uptime monitor fires · `https://app.indexboostseo.com` returns connection refused or 5xx · Docker container shows `unhealthy` or `exited`

**Steps:**

```bash
# 1. Check container state
docker ps -a | grep indexboost-seo

# 2. Read the last 100 lines of logs before crash
docker logs indexboost-seo --tail 100

# 3a. If crash-looping (exits within 60s of start) — check for startup errors:
#     - Missing env vars (Prisma/DB env, SHOPIFY_API_KEY, etc.)
#     - Prisma migration failure on startup
docker logs indexboost-seo 2>&1 | grep -i "error\|prisma\|migrate\|env"

# 3b. If OOM killed:
docker inspect indexboost-seo | grep -i oom

# 4. Attempt restart with current image
docker restart indexboost-seo

# 5. Watch health check recovery (wait up to 90s start period)
docker ps --format "table {{.Names}}\t{{.Status}}" --filter name=indexboost-seo

# 6. If restart does not stabilize — ROLLBACK immediately (see §4)
```

**Decision tree:**

| Log signal | Action |
|------------|--------|
| Missing env var | Restore env var, restart |
| Prisma `P1001` or migration error | See Runbook P1-B |
| OOM killed | Increase container memory limit; restart stable image |
| Crash loop with no clear error | Rollback to last stable image |
| No error — container just stopped | Restart; monitor for 5 min |

**Resolution check:** `curl -sf https://app.indexboostseo.com` returns 200.

---

### Runbook P1-B: Database is Unreachable

**Symptoms:** Logs show Prisma error codes `P1001` (DB unreachable), `P1017` (server closed connection), `P2024` (pool timeout) · App returns 500 on all authenticated pages

**Steps:**

```bash
# 1. Test DB connectivity from the app host
psql $DATABASE_URL -c "SELECT 1;"

# 2. If psql fails — DB host is down or network issue:
#    a. Check VPS/managed DB provider status page
#    b. Check firewall rules — ensure app container IP is allowed
#    c. If self-hosted DB: check the Postgres container/service
docker ps | grep postgres
docker logs <postgres-container> --tail 50

# 3. If psql succeeds but app still fails — pool exhaustion:
psql $DATABASE_URL -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
# If many 'idle' connections from app: restart app container to release pool
docker restart indexboost-seo

# 4. Check for long-running locks blocking queries:
psql $DATABASE_URL -c "SELECT pid, query, state, wait_event_type, wait_event FROM pg_stat_activity WHERE state != 'idle';"
# Kill blocking PID if needed:
# psql $DATABASE_URL -c "SELECT pg_terminate_backend(<pid>);"

# 5. If DB data files are corrupted (rare): restore from backup
#    See ROLLBACK_PLAN.md §3 for pg_restore procedure
```

**While DB is down:**
- App will serve 500 errors to merchants — post to status page immediately
- Queue processing is halted; no data is lost as QueueItems are persisted in DB
- Once DB recovers, queue auto-resumes on next worker tick

**Resolution check:**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Shop\";"
curl -sf https://app.indexboostseo.com
```

---

### Runbook P1-C: All Queue Items Failing (Google / IndexNow API Outage)

**Symptoms:** Logs flood with submission errors for one or both engines · `QueueItem.attempts` incrementing rapidly toward `maxAttempts` · Merchants seeing "failed" status in dashboard

**Steps:**

```bash
# 1. Identify which engine is failing
psql $DATABASE_URL -c "
  SELECT engine, status, COUNT(*)
  FROM \"Submission\"
  WHERE \"createdAt\" > NOW() - INTERVAL '30 minutes'
  GROUP BY engine, status
  ORDER BY engine, status;"

# 2. Check error detail in logs
docker logs indexboost-seo --tail 200 | grep -i "error" | grep -i "google\|indexnow"

# 3. Check external status pages:
#    Google Indexing API: https://status.cloud.google.com/
#    IndexNow: https://www.indexnow.org/ (no formal status page — test manually)

# 4. Test Google API credential validity (if only Google failing)
#    Decode GOOGLE_SERVICE_ACCOUNT_KEY and check expiry in Google Cloud Console

# 5. If external API is confirmed DOWN — pause retries to preserve maxAttempts budget:
psql $DATABASE_URL -c "
  UPDATE \"QueueItem\"
  SET \"nextRetryAt\" = NOW() + INTERVAL '4 hours'
  WHERE attempts < \"maxAttempts\"
  AND engine = 'google';  -- or 'indexnow'"

# 6. Once API recovers — reset nextRetryAt to resume:
psql $DATABASE_URL -c "
  UPDATE \"QueueItem\"
  SET \"nextRetryAt\" = NOW()
  WHERE attempts < \"maxAttempts\"
  AND engine = 'google';"

# 7. If items have exhausted maxAttempts during the outage — reset dead items:
psql $DATABASE_URL -c "
  UPDATE \"QueueItem\"
  SET attempts = 0, \"nextRetryAt\" = NOW()
  WHERE attempts >= \"maxAttempts\"
  AND \"updatedAt\" > NOW() - INTERVAL '24 hours';"
```

**Note:** This is a P2 if only one engine fails (IndexNow still works as fallback). Escalate to P1 only if both engines are down simultaneously for > 30 min.

**Resolution check:**
```bash
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM \"QueueItem\"
  WHERE \"nextRetryAt\" < NOW() AND attempts < \"maxAttempts\";"
# Should decrease over next 10 minutes as queue drains
```

---

### Runbook P1-D: Merchant Billing Stuck in Pending

**Symptoms:** Merchant reports they approved the subscription but still see Free plan · `billingStatus = PENDING` in DB · `syncShopBillingStatus` error in logs

**Steps:**

```bash
# 1. Check current DB state for the merchant
psql $DATABASE_URL -c "
  SELECT domain, plan, \"billingStatus\", \"updatedAt\"
  FROM \"Shop\"
  WHERE domain = '<merchant-shop>.myshopify.com';"

# 2. Check recent billing errors in logs
docker logs indexboost-seo --tail 200 | grep -i "billing\|syncShopBilling"

# 3. Check Shopify Billing status directly via Partner Dashboard:
#    Partners → Apps → IndexBoost SEO → Stores → <store> → Charges

# 4. If Shopify shows charge as ACTIVE but DB shows PENDING:
#    Force a sync — have the merchant visit https://app.indexboostseo.com/app/billing
#    This triggers syncShopBillingStatus in the loader

# 5. If Shopify shows charge as DECLINED or EXPIRED:
#    The merchant's payment method failed; they need to re-subscribe
#    Merchant can retry at https://app.indexboostseo.com/app/billing

# 6. If Shopify shows PENDING > 5 min (rare — usually resolves in 60s):
#    This is on Shopify's side; wait up to 10 min then ask merchant to reload billing page

# 7. Manual DB fix (only if Shopify confirms ACTIVE but DB is wrong):
psql $DATABASE_URL -c "
  UPDATE \"Shop\"
  SET plan = 'pro',  -- or 'business'
      \"billingStatus\" = 'ACTIVE',
      \"updatedAt\" = NOW()
  WHERE domain = '<merchant-shop>.myshopify.com';"
# Always confirm with Shopify Partners before manual update
```

**Resolution check:** Merchant can access Pro/Business features without upgrade prompt.

---

### Runbook P1-E: Shopify Webhooks Not Being Received

**Symptoms:** App not responding to product updates, shop uninstall, or billing events · Logs show no incoming webhook activity · Shopify Partner Dashboard shows webhook delivery failures

**Steps:**

```bash
# 1. Verify app is reachable from outside
curl -sf -o /dev/null -w "%{http_code}" https://app.indexboostseo.com

# 2. Check webhook endpoint health
curl -sf -o /dev/null -w "%{http_code}" https://app.indexboostseo.com/webhooks
# Expected: 405 (method not allowed for GET) or 200 — NOT 502/503/timeout

# 3. Check logs for HMAC validation failures (wrong secret)
docker logs indexboost-seo --tail 200 | grep -i "hmac\|webhook\|invalid"
# If HMAC failures: verify SHOPIFY_API_SECRET matches what's in Shopify Partner Dashboard

# 4. Check Shopify Partner Dashboard for webhook queue status:
#    Partners → Apps → IndexBoost SEO → Notifications → Webhooks
#    Shopify retries failed webhooks for 48 hours

# 5. If webhook secret is wrong — update env var and restart:
docker stop indexboost-seo
# Update SHOPIFY_API_SECRET in docker-compose.yml or .env
docker start indexboost-seo

# 6. If app was unreachable and webhooks were missed:
#    Shopify does NOT replay missed webhooks beyond retry window
#    For critical missed events (e.g., APP_UNINSTALLED):
psql $DATABASE_URL -c "
  SELECT domain, \"installedAt\", \"uninstalledAt\"
  FROM \"Shop\"
  ORDER BY \"updatedAt\" DESC LIMIT 20;"
#    Manually reconcile any shops that uninstalled during the outage

# 7. To verify webhook registration is current (re-register if needed):
#    In Shopify App Bridge, webhooks are registered at app install time
#    New installs will get fresh webhooks; existing shops retain registration
```

**Resolution check:** Send a test webhook from Shopify Partner Dashboard → Notifications → Send test. Confirm it appears in app logs.

---

## 4. Rollback Procedure

Refer to **`ROLLBACK_PLAN.md`** for the complete rollback procedure including:
- Tagged image restore (`docker tag indexboost-seo:stable-YYYYMMDD-HHMM`)
- Database backup restoration (`pg_restore`)
- Verification steps post-rollback

**Quick rollback command (30-second recovery if pre-deploy tag exists):**
```bash
docker stop indexboost-seo
docker tag indexboost-seo:stable-<YYYYMMDD-HHMM> indexboost-seo:current
docker start indexboost-seo
```

Trigger rollback when:
- Container is crash-looping after a deploy
- Error rate > 10% after deploy
- Any P1 that started within 30 min of a deploy

---

## 5. Post-Incident Checklist

Complete this within 24 hours of resolving any P1 or significant P2.

- [ ] **Timeline documented** — when alert fired, when investigation started, when resolved
- [ ] **Root cause identified** — what actually caused the incident
- [ ] **Affected merchants listed** — query `Shop` table for impacted `shopId`s if relevant
- [ ] **Data integrity verified** — confirm no `QueueItem` or `Submission` rows were lost or corrupted
- [ ] **Dead queue items reset** — any items that exhausted `maxAttempts` during outage have been reset
- [ ] **Monitoring gap closed** — if the incident was not caught by an existing alert, add one (see `MONITORING_ALERTS.md`)
- [ ] **Runbook updated** — if the resolution steps differed from the runbook, update this file
- [ ] **ROLLBACK_PLAN.md current** — confirm stable image tag and DB backup from before the incident are noted
- [ ] **Merchant communication sent** — if outage was > 30 min or affected billing (see §6)
- [ ] **Preventive action scheduled** — add a task for any longer-term fix that couldn't be done during the incident

---

## 6. Merchant-Facing Communication Template

Use for outages > 30 minutes or any incident affecting billing or data.

### Email Subject
```
[IndexBoost SEO] Service Disruption — [Brief Description] — Resolved
```

### Email Body
```
Hi [Merchant name / "IndexBoost SEO merchant"],

We experienced a service disruption affecting IndexBoost SEO between
[START TIME UTC] and [END TIME UTC] (approximately [DURATION]).

What happened:
[1-2 sentence plain-English description. Example: "Our queue processor
stopped running due to a database connection issue, which delayed URL
submissions to Google and IndexNow."]

Who was affected:
[Example: "All merchants on Pro and Business plans had URL submissions
delayed. No submission data was lost."]

What we did:
[Example: "We restarted the affected service and reprocessed all queued
submissions. All pending URLs have now been resubmitted."]

What you need to do:
[Either "Nothing — your submissions are back on track." OR specific action
if merchant needs to do something, e.g., resubmit manually.]

We're sorry for the disruption. If you have questions or notice anything
unusual, reply to this email directly.

— Thuan
IndexBoost SEO
https://app.indexboostseo.com
```

### For Billing Incidents (add this section)
```
Billing note:
If you were charged for a period during which the service was unavailable,
please reply to this email and we will arrange a credit or refund via
Shopify Billing.
```

---

## Quick Reference: Useful DB Queries

```sql
-- Queue health overview
SELECT engine, attempts, COUNT(*)
FROM "QueueItem"
GROUP BY engine, attempts
ORDER BY engine, attempts;

-- Dead-letter items
SELECT id, "shopId", engine, url, attempts, "updatedAt"
FROM "QueueItem"
WHERE attempts >= "maxAttempts"
ORDER BY "updatedAt" DESC
LIMIT 20;

-- Overdue queue items (processing lag)
SELECT COUNT(*), engine
FROM "QueueItem"
WHERE "nextRetryAt" < NOW() - INTERVAL '30 minutes'
  AND attempts < "maxAttempts"
GROUP BY engine;

-- Recent submission failures by engine
SELECT engine, COUNT(*) AS failures
FROM "Submission"
WHERE status = 'failed'
  AND "createdAt" > NOW() - INTERVAL '1 hour'
GROUP BY engine;

-- Shops with pending billing
SELECT domain, plan, "billingStatus", "updatedAt"
FROM "Shop"
WHERE "billingStatus" = 'PENDING'
ORDER BY "updatedAt" DESC;

-- Active DB connections
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
```
