# IndexBoost SEO - Final Launch Checklist

## Technical Checks

- [ ] `npm run lint` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npx prisma validate` passes.
- [ ] `npx prisma migrate deploy` works in production.
- [ ] App installs successfully on a Shopify test store.
- [ ] OAuth callback completes successfully.
- [ ] Offline session is stored.
- [ ] Shop record is created.
- [ ] Dashboard loads without errors.
- [ ] Webhooks are registered.
- [ ] Webhook API version is a stable Shopify version, not a release candidate.
- [ ] Webhook HMAC validation works.
- [ ] Product create/update/delete webhooks enqueue indexing work.
- [ ] Collection create/update/delete webhooks enqueue indexing work.
- [ ] Page create/update/delete webhooks enqueue indexing work.
- [ ] Blog post create/update/delete webhooks enqueue indexing work.
- [ ] Queue retry behavior works.
- [ ] Submission logs are written for success and failure.
- [ ] `app/uninstalled` webhook deletes sensitive shop data.

## Billing Checks

- [ ] `SHOPIFY_BILLING_TEST=true` in development.
- [ ] `SHOPIFY_BILLING_TEST=false` in production.
- [ ] Free plan shows current plan correctly.
- [ ] Free to Pro upgrade redirects to Shopify confirmation.
- [ ] Pro test charge approval returns to billing callback.
- [ ] Database updates to `plan=pro`.
- [ ] Database updates to `billingStatus=active`.
- [ ] `subscriptionId` is saved.
- [ ] Pro features unlock after active billing.
- [ ] Free or pending subscription does not unlock Pro features.
- [ ] Pro to Business upgrade works.
- [ ] Business features unlock after active billing.
- [ ] Cancel subscription returns app to Free access.
- [ ] Pro/Business routes are locked after cancel.
- [ ] Existing logs are not deleted immediately after cancel.

## Storefront Password / IndexNow Checks

- [ ] Test store storefront is public.
- [ ] Storefront app proxy URL does not redirect to `/password`.
- [ ] IndexNow key file returns plain text key:

```text
https://{shop-domain}/apps/indexboost/{key}.txt
```

- [ ] IndexNow submission uses the correct `keyLocation`.
- [ ] IndexNow submission uses URLs from the same verified host.
- [ ] IndexNow success or failure is logged.
- [ ] Failure logs include status code, keyLocation, urlList, and response body.

## Google Indexing Checks

- [ ] Merchant-facing copy states Google credentials are required.
- [ ] Google Cloud project has Web Search Indexing API enabled.
- [ ] Service Account JSON is created.
- [ ] Service Account email is added as owner in Google Search Console.
- [ ] JSON upload rejects invalid JSON.
- [ ] JSON upload rejects missing `client_email` or `private_key`.
- [ ] App validates Google auth before saving credentials.
- [ ] A test URL can be submitted.
- [ ] Google API errors are visible and understandable in logs.
- [ ] Quota limit is enforced by plan.
- [ ] Merchant-facing copy states Google's Indexing API eligibility and quota are controlled by Google.
- [ ] Merchant-facing copy does not imply Google will accept general Shopify product, collection, page, or blog URLs.

## App Store Assets

- [ ] App icon prepared.
- [ ] App listing name finalized.
- [ ] Tagline finalized.
- [ ] Short description finalized.
- [ ] Full description finalized.
- [ ] Pricing copy finalized.
- [ ] Feature list matches implemented app.
- [ ] No copy guarantees indexing or rankings.
- [ ] No copy implies Google Indexing API eligibility beyond Google's documented supported URL types.
- [ ] Demo video recorded.
- [ ] Support email created.
- [ ] Privacy policy URL live.
- [ ] Terms/support page live if required.

## Screenshots

- [ ] Dashboard onboarding screenshot.
- [ ] Engine status screenshot.
- [ ] Manual URL submission screenshot.
- [ ] Submission logs screenshot.
- [ ] Billing plans screenshot.
- [ ] Pro SEO tools screenshot.
- [ ] Business Image SEO screenshot.
- [ ] Settings / Google setup screenshot.

## Privacy Policy

- [ ] Explains Shopify access token storage.
- [ ] Explains Google Service Account JSON storage.
- [ ] Explains URL and submission log storage.
- [ ] Explains billing status storage.
- [ ] Explains uninstall data deletion.
- [ ] States data is not sold.
- [ ] Lists support contact.

## Support

- [ ] Support email is monitored.
- [ ] Basic troubleshooting article for Google credentials exists.
- [ ] Basic troubleshooting article for IndexNow/storefront password exists.
- [ ] Billing support flow is documented.

## Production Environment

- [ ] `SHOPIFY_API_KEY` set.
- [ ] `SHOPIFY_API_SECRET` set.
- [ ] `SCOPES` set to required scopes only.
- [ ] `SHOPIFY_APP_URL` set to production URL.
- [ ] `DATABASE_URL` set to production PostgreSQL.
- [ ] PostgreSQL production schema and migrations are tested before switching away from SQLite.
- [ ] SQLite is used only for single-instance MVP deployment, not multi-instance production.
- [ ] `SHOPIFY_BILLING_TEST=false`.
- [ ] `ANTHROPIC_API_KEY` set only if AI SEO generation is enabled.
- [ ] `OPENAI_API_KEY` is not required by current code unless the AI provider implementation changes.
- [ ] App proxy URL set to production app URL.
- [ ] App proxy prefix/subpath resolves storefront URLs under `/apps/indexboost/*`.
- [ ] Redirect URLs set to production app URL.
- [ ] `shopify.app.toml` production `application_url`, `redirect_urls`, and `[app_proxy].url` do not contain placeholder Shopify/dev URLs.

## Monitoring and Logging

- [ ] App server logs available.
- [ ] Webhook failures monitored.
- [ ] Billing errors monitored.
- [ ] Queue backlog monitored.
- [ ] Google API failures monitored.
- [ ] IndexNow failures monitored.
- [ ] Error alerts configured.

## Pre-Submit Final Command Checklist

Run before submitting to Shopify App Store:

```bash
npm run dry-run:billing
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
npm run build
```

All commands should pass before app review submission.
