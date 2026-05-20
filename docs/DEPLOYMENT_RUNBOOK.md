# IndexBoost SEO - Deployment Runbook

Use this for a production-like PostgreSQL deployment before Shopify App Store submission.

## 1. DNS

- [ ] Create DNS record for `app.indexboostseo.com`.
- [ ] Point it to the hosting provider target.
- [ ] Confirm DNS resolves publicly.

```bash
dig app.indexboostseo.com
```

## 2. SSL

- [ ] Enable HTTPS for `app.indexboostseo.com`.
- [ ] Confirm the certificate is valid and not self-signed.
- [ ] Confirm HTTP redirects to HTTPS if the host supports HTTP.

## 3. Production Env

Set these on the hosting provider:

```bash
SHOPIFY_API_KEY="prod_client_id"
SHOPIFY_API_SECRET="prod_client_secret"
SHOPIFY_APP_URL="https://app.indexboostseo.com"
SCOPES="read_products,write_products,read_content,write_content,read_online_store_navigation,write_online_store_navigation,read_themes,write_themes"
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/indexboost_seo?schema=public"
POSTGRES_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/indexboost_seo?schema=public"
SHOPIFY_BILLING_TEST=false
ANTHROPIC_API_KEY="optional_if_ai_seo_is_enabled"
```

`DATABASE_URL` is used by the app runtime. `POSTGRES_DATABASE_URL` is used by `prisma/schema.production.prisma` for production-like Prisma commands. Use the same PostgreSQL database URL unless you intentionally split runtime and migration credentials.

## 4. PostgreSQL Setup

- [ ] Provision PostgreSQL.
- [ ] Create database `indexboost_seo`.
- [ ] Enable backups.
- [ ] Confirm the app host can connect.
- [ ] Test against a disposable database first.

## 5. Prisma

Validate schemas:

```bash
npx prisma validate
npm run prisma:prod:validate
```

Generate the production Prisma client:

```bash
npm run prisma:prod:generate
```

Apply the production-like PostgreSQL schema:

```bash
npm run prisma:prod:migrate
```

Note: `prisma:prod:migrate` uses `prisma db push --schema prisma/schema.production.prisma` for production-like readiness testing. Before a long-lived production launch, generate and review a real PostgreSQL migration history from the PostgreSQL schema.

## 6. Build and Start

Build:

```bash
npm run build
```

Start:

```bash
npm run start:prod
```

The start command runs `scripts/validate-env.mjs` first and fails clearly if required env vars are missing or unsafe.

## 7. Shopify App Config

- [ ] Confirm `shopify.app.toml` uses `https://app.indexboostseo.com`.
- [ ] Confirm redirect URL is `https://app.indexboostseo.com/auth/callback`.
- [ ] Confirm app proxy URL is `https://app.indexboostseo.com/app-proxy`.
- [ ] Confirm app proxy prefix/subpath serves `/apps/indexboost/*`.
- [ ] Confirm webhooks use stable API version `2026-04`.

Deploy/push Shopify config:

```bash
npm run deploy
```

## 8. OAuth Test

- [ ] Install the app on a development or review store.
- [ ] Approve scopes.
- [ ] Confirm callback returns to embedded app.
- [ ] Confirm dashboard loads.

## 9. App Proxy Test

- [ ] Open app settings and copy the IndexNow key.
- [ ] Open `https://{shop-domain}/apps/indexboost/{key}.txt`.
- [ ] Confirm plain text key response.
- [ ] Confirm no storefront password redirect.

## 10. Billing Test

- [ ] Confirm production env has `SHOPIFY_BILLING_TEST=false`.
- [ ] Use a controlled review flow before live merchant testing.
- [ ] Confirm Free to Pro subscription flow.
- [ ] Confirm Pro to Business subscription flow.
- [ ] Confirm cancel returns the shop to Free access.

## 11. Rollback

- [ ] Keep the previous app image/build available.
- [ ] Keep previous env values available.
- [ ] Roll back app server first if OAuth, billing, or webhooks fail.
- [ ] Do not roll back database changes unless a tested restore or down-migration path exists.
- [ ] After rollback, retest install, OAuth, dashboard, app proxy, and billing callback.
