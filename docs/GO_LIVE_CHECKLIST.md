# IndexBoost SEO — Go-Live Checklist

**Version:** 1.0.0  
**Date:** 2026-05-20

Tick every item before submitting to the Shopify App Store and before directing real merchants to the app.

---

## Pre-Deployment (Infrastructure)

- [ ] Production `.env` has no placeholder values (validated by `validateServerEnv()` at startup)
- [ ] `SHOPIFY_BILLING_TEST` is set to `false` (or absent) in production
- [ ] `DATABASE_URL` points to production PostgreSQL (not local dev DB)
- [ ] `ANTHROPIC_API_KEY` is set and has sufficient credit for launch day
- [ ] `NODE_ENV=production` is set in the container
- [ ] `SHOPIFY_APP_URL` matches `https://app.indexboostseo.com` exactly
- [ ] Docker image built from main branch with `NODE_ENV=production`
- [ ] `docker run` exposes port 3000 and the HEALTHCHECK is green
- [ ] `npm run setup:prod` (prisma migrate deploy) run against production DB
- [ ] All 2 Prisma migrations confirmed applied (`prisma migrate status`)
- [ ] SSL/TLS certificate valid for `app.indexboostseo.com`
- [ ] HTTPS redirect in place (HTTP → HTTPS)

## Shopify Partner Dashboard

- [ ] App URL set to `https://app.indexboostseo.com`
- [ ] Allowed redirect URL: `https://app.indexboostseo.com/auth/callback`
- [ ] App proxy: `subpath=indexboost`, `prefix=apps`, `url=https://app.indexboostseo.com/app-proxy`
- [ ] Webhook API version set to `2026-04`
- [ ] All 9 webhooks registered (app/uninstalled, app/scopes_update, products/create, products/update, products/delete, collections/create, collections/update, collections/delete, 3 GDPR)
- [ ] App icon uploaded (1200×1200 PNG)
- [ ] Screenshots uploaded (at least 3)
- [ ] Privacy policy URL set
- [ ] App name: "IndexBoost SEO"

## Billing

- [ ] All 3 billing plans configured in Partner Dashboard (Free, Pro $9.95, Business $19.95)
- [ ] `SHOPIFY_BILLING_TEST=false` confirmed in production
- [ ] Billing flow tested on Development Store with test mode (upgrade, cancel)
- [ ] Downgrade to Free correctly removes Pro/Business features
- [ ] Cancellation via "Cancel subscription" button works
- [ ] Cancellation via Shopify Admin > Apps > {App} > Cancel also reflected on next load

## Auth & Installation

- [ ] Fresh install tested on Development Store: OAuth completes, shop record created
- [ ] Reinstall tested: old sessions cleaned up, new session created, no orphaned data
- [ ] App uninstall tested: all shop data deleted (sessions, queue items, submissions, shop record)
- [ ] Embedded app loads correctly in Shopify Admin iframe
- [ ] App loads on mobile Shopify Admin

## Feature Smoke Tests (Free Plan)

- [ ] Dashboard loads with correct stats
- [ ] Auto-indexing settings toggle saves
- [ ] Manual URL submit works (if Google credentials configured)
- [ ] IndexNow key displayed and verifiable at `/apps/indexboost/.well-known/indexnow-{key}.txt`
- [ ] LLMs.txt accessible via app proxy
- [ ] Submission logs display

## Feature Smoke Tests (Pro Plan)

- [ ] Upgrade to Pro succeeds (Shopify billing confirmation screen → active status)
- [ ] Meta tags editor loads products/collections/pages
- [ ] Meta tag edit saves to Shopify (verify in Shopify Admin > Product > SEO section)
- [ ] Redirects manager: create redirect, verify in Shopify Admin > Online Store > Navigation > URL Redirects
- [ ] Robots.txt editor: save robots.txt, verify at `https://{store}/robots.txt`
- [ ] HTML sitemap generates correctly
- [ ] LLMs.txt generates with product/page content
- [ ] SEO audit runs and returns findings
- [ ] Broken links scanner runs

## Feature Smoke Tests (Business Plan)

- [ ] Upgrade to Business succeeds
- [ ] Image SEO page loads with products and images
- [ ] Bulk alt text apply works (verify in Shopify Admin > Product > Media)
- [ ] AI SEO generate single product works
- [ ] AI credits decrement correctly
- [ ] Email alerts settings (if configured) functional

## GDPR Webhooks

- [ ] `customers/data_request` webhook: returns 200 (check Partner Dashboard > Webhooks > Test)
- [ ] `customers/redact` webhook: returns 200
- [ ] `shop/redact` webhook: returns 200

## Monitoring

- [ ] Log aggregator connected (Logtail/Papertrail/Grafana Logs)
- [ ] Health endpoint responding: `curl https://app.indexboostseo.com/` returns 200
- [ ] HEALTHCHECK in Docker passing (`docker inspect --format='{{.State.Health.Status}}' <container>`)
- [ ] At least one test submission logged in structured format
- [ ] Error logs visible (trigger a test error if needed)

## Post-Launch Immediate Actions (First 24h)

- [ ] Watch error logs for any unexpected crashes
- [ ] Verify first real merchant install completes correctly
- [ ] Check queue is processing (QueueItem rows should decrease after webhooks fire)
- [ ] Confirm Google quota reset runs at midnight UTC
- [ ] Check Shopify Partner Dashboard for any webhook delivery failures

---

## Emergency Contacts

- Shopify Partner Support: partners.shopify.com > Help
- Shopify API Status: shopifystatus.com
- App support email: thuanvd@syn-gr.com
- Rollback procedure: see `docs/ROLLBACK_PLAN.md`
- Incident response: see `docs/INCIDENT_RESPONSE.md`
