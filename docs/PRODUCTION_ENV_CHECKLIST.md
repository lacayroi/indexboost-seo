# IndexBoost SEO - Production Environment Checklist

Use this before deploying the submitted Shopify App Store build.

## Required Env Vars

- [ ] `SHOPIFY_API_KEY` is set to the production Shopify app client ID.
- [ ] `SHOPIFY_API_SECRET` is set to the production Shopify app secret.
- [ ] `SHOPIFY_APP_URL` is set to the public production app origin, for example `https://app.indexboostseo.com`.
- [ ] `SCOPES` matches the submitted app scopes only.
- [ ] `DATABASE_URL` points to the production database.
- [ ] `POSTGRES_DATABASE_URL` points to the same production PostgreSQL database when using `prisma/schema.production.prisma`.
- [ ] `SHOPIFY_BILLING_TEST=false` in production.
- [ ] Support URL, privacy URL, and support email are set in the app listing and public support pages.

## Example Production Env

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

Do not use an `admin.shopify.com` URL for `SHOPIFY_APP_URL`. It must be the public URL that serves this Remix app.

Public app listing placeholders to replace:

- Support email: `support@indexboostseo.com`
- Support URL: `https://app.indexboostseo.com/support`
- Privacy policy URL: `https://app.indexboostseo.com/privacy`

## Shopify App URL

- [ ] Shopify Partner Dashboard app URL points to `SHOPIFY_APP_URL`.
- [ ] OAuth redirect URL is `https://app.indexboostseo.com/auth/callback`.
- [ ] App proxy URL is `https://app.indexboostseo.com/app-proxy`.
- [ ] App proxy prefix is `apps` and subpath is `indexboost`, which serves storefront URLs under `/apps/indexboost/*`.
- [ ] `shopify.app.toml` has production `application_url`, `redirect_urls`, and `[app_proxy].url` before deployment.
- [ ] `shopify.app.toml` does not contain `YOUR_PRODUCTION_APP_DOMAIN`, `shopify.dev`, `admin.shopify.com`, or `localhost`.

## Database URL

- [ ] Production database is provisioned and reachable from the app host.
- [ ] Recommended production database is PostgreSQL.
- [ ] Use `prisma/schema.production.prisma` as the PostgreSQL schema reference when preparing the production migration path.
- [ ] Set `DATABASE_URL` and `POSTGRES_DATABASE_URL` to the same PostgreSQL URL for production-like testing.
- [ ] Run `npm run prisma:prod:validate`.
- [ ] Run `npm run prisma:prod:generate`.
- [ ] Run `npm run prisma:prod:migrate` against a disposable PostgreSQL database before first production deploy.
- [ ] Current default `prisma/schema.prisma` uses SQLite for MVP/local operation. SQLite is only suitable for a single-instance MVP deployment and is not recommended for multi-instance production.
- [ ] Backups and restore access are configured.

## Billing

- [ ] `SHOPIFY_BILLING_TEST=false`.
- [ ] Pro subscription creates a live `$9.95` every-30-days charge.
- [ ] Business subscription creates a live `$19.95` every-30-days charge.
- [ ] No test billing flag is enabled through hosting dashboard secrets.

## Google OAuth/API Requirements

IndexBoost SEO does not use a shared Google OAuth client for merchant Google Indexing API submissions. Merchants upload their own Google Service Account JSON.

- [ ] Google Indexing API credential upload validates JSON shape.
- [ ] Service Account JSON must include `client_email` and `private_key`.
- [ ] Merchant must enable the Google Indexing API in their Google Cloud project.
- [ ] Merchant must add the service account email as an owner in Google Search Console for the relevant property.
- [ ] Merchant-facing docs state Google controls Indexing API eligibility, quota, approval, crawling, indexing, and ranking.
- [ ] Merchant-facing docs state Google documents the Indexing API for pages with `JobPosting` or `BroadcastEvent` in a `VideoObject`.

## AI Provider Key

- [ ] Current code uses `ANTHROPIC_API_KEY` for AI SEO text generation.
- [ ] `OPENAI_API_KEY` is not used by current code and is not required unless the implementation changes.
- [ ] Image SEO alt text suggestions currently use product metadata; if this workflow later calls an AI provider, add the provider key and privacy disclosure before launch.

## Logging and Monitoring

- [ ] App server errors are captured by the hosting provider or APM.
- [ ] Webhook failures are logged with topic, shop, and status.
- [ ] Queue backlog and retry failures are monitored.
- [ ] Billing callback and cancellation errors are monitored.
- [ ] Google Indexing API errors are logged without exposing full private keys.
- [ ] IndexNow failures log status code, `keyLocation`, URL list, and response body.
- [ ] Alerts are configured for elevated 5xx rate and database connectivity failures.

## Release Commands

Migration:

```bash
npx prisma migrate deploy
```

PostgreSQL production validation:

```bash
npm run prisma:prod:validate
npm run prisma:prod:generate
npm run prisma:prod:migrate
```

Build:

```bash
npm run build
```

Start:

```bash
npm run start
```

Container start, if using the included Docker flow:

```bash
npm run docker-start
```

## Rollback Note

Keep the previous deployment image and environment configuration available. If a production deploy breaks install, OAuth, billing, or webhook processing, roll back the app server first, confirm `SHOPIFY_APP_URL` still points to the restored deployment, and only roll back database migrations when a tested down-migration or backup restore path is available.
