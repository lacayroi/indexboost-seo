# IndexBoost SEO — Post-Launch Monitoring Plan

**Version:** 1.0.0  
**Date:** 2026-05-20

---

## Daily Monitoring Routine (First 30 Days)

Check these every morning. Takes < 5 minutes once set up.

| Check | Where to look | Healthy signal |
|---|---|---|
| App health | `curl https://app.indexboostseo.com/` | HTTP 200 |
| Error log count | Log aggregator (last 24h) | 0 errors, or known/expected errors only |
| Queue backlog | `SELECT COUNT(*) FROM "QueueItem" WHERE "nextRetryAt" < NOW() - INTERVAL '1 hour'` | 0 (stale items are a sign queue stopped processing) |
| Failed submissions | `SELECT COUNT(*) FROM "Submission" WHERE status='failed' AND "createdAt" > NOW() - INTERVAL '24h'` | Low (< 5% of total) |
| New installs | Shopify Partner Dashboard > Analytics | Growing or stable |
| Webhook delivery failures | Shopify Partner Dashboard > Notifications > Failed deliveries | 0 |

---

## Weekly Checks (Weeks 1–8)

- [ ] Review error logs for new error patterns
- [ ] Check Google API quota usage per shop (from Submission table)
- [ ] Review AI credit usage vs plan limits — prevent over-provision
- [ ] Check DB table sizes: `SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC`
- [ ] Check for shops with billing status `pending` > 7 days (likely approval abandoned)
- [ ] Review Shopify App Store reviews if app is listed publicly

---

## Key Metrics to Track

### Business Metrics
- Daily Active Installs
- Plan distribution (Free / Pro / Business)
- Monthly Recurring Revenue (MRR)
- Churn rate (uninstalls / total installs)
- Billing conversion rate (Free → Pro)

### Technical Metrics
- Google submission success rate (`Submission` table: success vs failed for engine=google)
- IndexNow submission success rate
- AI generation success rate
- Average queue processing latency
- P95 loader response time (from logs)
- Error rate (error logs / total requests)

---

## Useful SQL Queries

```sql
-- Daily submission stats (last 7 days)
SELECT DATE("createdAt") as day, engine, status, COUNT(*) 
FROM "Submission"
WHERE "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY 1, 2, 3
ORDER BY 1 DESC;

-- Shops by plan
SELECT plan, COUNT(*) FROM "Shop" GROUP BY plan;

-- Stale queue items (potential stuck items)
SELECT id, "shopId", url, engine, attempts, "nextRetryAt"
FROM "QueueItem"
WHERE "nextRetryAt" < NOW() - INTERVAL '2 hours'
ORDER BY "nextRetryAt";

-- Top failing shops (Google quota exceeded often)
SELECT "shopId", COUNT(*) as failures
FROM "Submission"
WHERE status = 'failed' AND engine = 'google'
  AND "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY "shopId"
ORDER BY failures DESC
LIMIT 10;

-- Billing status summary
SELECT "billingStatus", COUNT(*) FROM "Shop" GROUP BY "billingStatus";

-- Pending billing > 7 days (abandoned approvals)
SELECT domain, "billingStatus", "updatedAt"
FROM "Shop"
WHERE "billingStatus" = 'pending'
  AND "updatedAt" < NOW() - INTERVAL '7 days';
```

---

## Alerting Setup (Recommended)

See `docs/MONITORING_ALERTS.md` for full alert definitions.

**Minimum viable alerting for launch:**
1. App health endpoint down → PagerDuty/email (P1)
2. Error log spike > 10 errors/min → email (P2)
3. Queue stale items > 1 hour old → daily digest email (P2)

**Recommended log aggregator:** Logtail (simple Docker log driver integration, cheap).

```bash
# Docker run with Logtail log driver
docker run -d \
  --log-driver=json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  ...other flags...
  indexboost-seo:latest
```

Then ship JSON logs via `docker logs` piped to Logtail agent, or use Logtail's Docker integration.

---

## Escalation Path

For production incidents, follow `docs/INCIDENT_RESPONSE.md`.

| Severity | Response Time | Who |
|---|---|---|
| P1 — App down | Immediate | Solo: drop everything |
| P2 — Degraded service | < 4 hours | Same day |
| P3 — Minor issue | < 48 hours | Next sprint |

---

## 30-Day Post-Launch Review Checklist

- [ ] Error rate < 1% of total requests
- [ ] No P1 incidents in last 7 days
- [ ] Billing reconciliation: DB plan matches Shopify active subscriptions for all shops
- [ ] No shops stuck in `pending` billing > 7 days
- [ ] Queue never had stale items > 2 hours old
- [ ] All 3 GDPR webhooks received at least one test delivery this month
- [ ] Google credentials encryption planned/scheduled for v1.1
- [ ] Rate limiting scheduled for v1.1
- [ ] Consider adding Sentry for error tracking before 100+ merchant installs

---

## Version Roadmap

| Version | Target | Key Items |
|---|---|---|
| 1.0.0 | Launch | Core features, production hardened |
| 1.1.0 | 4 weeks post-launch | Google credentials encryption, rate limiting, Sentry, dead-letter queue table |
| 1.2.0 | 8 weeks post-launch | Full cursor pagination, queue worker locking, automated billing reconciliation |
