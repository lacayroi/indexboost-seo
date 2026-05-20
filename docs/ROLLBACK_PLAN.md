# Rollback Plan — IndexBoost SEO

## 1. When to Trigger a Rollback

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Health check failing | Container `UNHEALTHY` for >2 minutes | Immediate rollback |
| Billing errors | Any merchant cannot complete subscription | Immediate rollback |
| Error rate spike | >10% of requests returning 5xx | Immediate rollback |
| Data loss detected | Any shop data missing unexpectedly | Immediate rollback + DB restore |
| Webhook delivery failure | All webhooks failing HMAC or returning 500 | Immediate rollback |
| Startup crash loop | Container exits within 60s of start | Immediate rollback |

---

## 2. Pre-Deploy Requirements (enables safe rollback)

Before every production deploy:

```bash
# 1. Tag the current running image
docker tag indexboost-seo:current indexboost-seo:stable-$(date +%Y%m%d-%H%M)

# 2. Take a database backup
pg_dump $DATABASE_URL -Fc -f backup-pre-deploy-$(date +%Y%m%d-%H%M).dump

# 3. Note the current git commit
git -C /path/to/app rev-parse HEAD > deploy-$(date +%Y%m%d).sha
```

---

## 3. App Rollback Procedure

### Step 1 — Identify previous stable image
```bash
docker images indexboost-seo --format "{{.Tag}}\t{{.CreatedAt}}" | sort -r | head -5
```

### Step 2 — Stop current container
```bash
docker stop indexboost-seo && docker rm indexboost-seo
```

### Step 3 — Start previous stable container
```bash
docker run -d \
  --name indexboost-seo \
  --env-file /etc/indexboost/.env.production \
  --restart unless-stopped \
  -p 3000:3000 \
  indexboost-seo:PREVIOUS_TAG
```

### Step 4 — Verify health
```bash
sleep 65
docker inspect indexboost-seo --format='{{.State.Health.Status}}'
# Expected: healthy
curl -sf http://localhost:3000/
# Expected: 200
```

### Step 5 — Verify webhooks and billing on test store

---

## 4. Database Rollback

> ⚠️ WARNING: Prisma migrations are forward-only. Manual SQL required to undo data changes.

### Scenario A — Migration not applied (safest)
No DB rollback needed. Roll back app container only.

### Scenario B — Migration applied, no data corruption
Roll back app only. DB stays on new schema (backward-compatible schema changes are safe).

### Scenario C — Data corruption detected
```bash
docker stop indexboost-seo
pg_restore --clean --if-exists -d $DATABASE_URL backup-pre-deploy-TIMESTAMP.dump
# Verify row counts
psql $DATABASE_URL -c 'SELECT COUNT(*) FROM "Shop";'
psql $DATABASE_URL -c 'SELECT COUNT(*) FROM "Session";'
docker run -d --name indexboost-seo --env-file /etc/indexboost/.env.production -p 3000:3000 indexboost-seo:PREVIOUS_TAG
```

---

## 5. Shopify App Config Rollback

```bash
git checkout PREVIOUS_COMMIT -- shopify.app.toml
shopify app deploy --force
```

> Note: Scope changes require merchant re-auth. Avoid scope changes in patch releases.

---

## 6. Post-Rollback Verification

- [ ] `curl -sf http://localhost:3000/` returns 200
- [ ] `docker inspect indexboost-seo --format='{{.State.Health.Status}}'` returns `healthy`
- [ ] Webhook delivery succeeds (check Partner Dashboard)
- [ ] Billing upgrade/cancel works on test store
- [ ] Queue processes successfully
- [ ] Error rate returned to baseline

---

## 7. Recovery Commands — Copy-Paste Ready

```bash
# === QUICK APP ROLLBACK ===
docker stop indexboost-seo && docker rm indexboost-seo
docker run -d --name indexboost-seo --env-file /etc/indexboost/.env.production -p 3000:3000 indexboost-seo:PREVIOUS_TAG
sleep 65 && curl -sf http://localhost:3000/ && echo "HEALTHY" || echo "STILL FAILING"

# === FULL DB RESTORE ===
docker stop indexboost-seo
pg_restore --clean --if-exists -d $DATABASE_URL backup-pre-deploy-TIMESTAMP.dump
docker run -d --name indexboost-seo --env-file /etc/indexboost/.env.production -p 3000:3000 indexboost-seo:PREVIOUS_TAG

# === CHECK QUEUE ===
psql $DATABASE_URL -c 'SELECT engine, COUNT(*) FROM "QueueItem" GROUP BY engine;'

# === CHECK RECENT ERRORS ===
docker logs indexboost-seo --since 10m 2>&1 | grep '"level":"error"'
```

*Last updated: 2026-05-20*
