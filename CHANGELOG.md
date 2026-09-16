# Changelog — IndexBoost SEO

All notable changes to IndexBoost SEO are documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [1.0.0] — 2026-05-20

Initial v1.0.0 release of IndexBoost SEO.

### Features

**Free Plan**
- Auto-indexing: submit product, collection, page, and blog article URLs to Google Indexing API on create/update/delete webhooks
- IndexNow auto-indexing: submit URLs to Bing, Yandex, and other IndexNow-compatible search engines
- Configurable content type toggles (products, collections, pages, blogs)
- Submission log with 7-day retention
- Daily quota tracking (50 Google submissions/day)
- Basic SEO dashboard with quota and submission stats
- App Proxy: IndexNow key verification endpoint at `/apps/indexboost/.well-known/indexnow-{key}.txt`
- App Proxy: LLMs.txt endpoint at `/apps/indexboost/llms.txt`

**Pro Plan ($9.95/month)**
- 200 Google submissions/day
- Bulk URL submit: manually submit any URL immediately
- Meta tags editor: edit SEO title + meta description for products, collections, and pages
- Schema / JSON-LD generator: generate structured data markup for products
- XML sitemap viewer
- HTML sitemap generator
- Robots.txt editor: edit and save `templates/robots.txt.liquid` in active theme
- Broken links scanner: check all product/collection/page URLs for 404 errors
- 301 Redirect manager: create and delete URL redirects via Shopify API
- LLMs.txt generator: generate and publish AI-readable store content map
- SEO audit: scan store for missing SEO fields and common issues
- Submission logs with 30-day retention

**Business Plan ($19.95/month)**
- Everything in Pro
- AI SEO optimizer: generate SEO titles and meta descriptions using Anthropic Claude AI
- Image SEO: bulk alt text generation for product images using smart contextual suggestions
- Index health check: monitor indexing status of store URLs
- Email alerts for indexing events
- 200 AI credits/month for AI-generated content; 1,000 credits/month for Business

### Security Hardening

- Liquid template injection prevention: robots.txt content wrapped in `{%- raw -%}...{%- endraw -%}` before theme write
- URL validation on all submission inputs (http/https only, no SSRF vectors)
- Atomic daily quota enforcement using `updateMany` with conditional WHERE clause
- AI credit deduction in `db.$transaction` to prevent double-spend under concurrency
- 10-second fetch timeout on all external API calls (Google Indexing API, IndexNow)
- Non-root Docker user (`appuser`)
- Docker HEALTHCHECK on `/` endpoint
- Structured JSON logger in production with sensitive key masking (`[REDACTED]`)
- LOG_LEVEL environment variable for runtime log filtering
- Duplicate subscription guard in billing flow
- Uninstall webhook cleanup wrapped in `db.$transaction`

### Infrastructure

- PostgreSQL 16 database with Prisma ORM
- DB-backed queue (`QueueItem` table) with exponential backoff (1min → 5min → 30min)
- Prisma migrations (2 migrations applied)
- Docker production image: `node:22-alpine`, non-root user, HEALTHCHECK
- Environment variable validation at startup (`validateServerEnv`)
- Shopify Remix v2, embedded with `unstable_newEmbeddedAuthStrategy: true`
- Webhook API version: `2026-04`
- GDPR webhooks: `customers/data_request`, `customers/redact`, `shop/redact`

### Known Limitations (v1.1 targets)

- Google Service Account credentials stored as JSON string in PostgreSQL (encryption planned for v1.1)
- UI pages cap at 50–100 items per content type; pagination warning shown when exceeded
- No rate limiting on app API routes (planned for v1.1)
- No Sentry error tracking (manual log monitoring via structured JSON logs)
- Queue dedup has a very-low-probability race window for concurrent duplicate events
- Queue worker is single-instance only (no distributed locking)

---

## Template History (Shopify App Template — for reference only)

This app was bootstrapped from the Shopify App Template for Remix.
Template changelog entries have been moved to `docs/TEMPLATE_CHANGELOG.md`.
