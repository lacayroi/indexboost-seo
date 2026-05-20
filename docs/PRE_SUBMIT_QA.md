# IndexBoost SEO - Pre-Submit QA

Mark each item `Pass`, `Fail`, or `N/A` before Shopify App Store submission.

| Area | Result | Notes |
| --- | --- | --- |
| Install app from the production or review install URL. |  |  |
| Approve OAuth scopes and complete OAuth callback. |  |  |
| Embedded dashboard loads inside Shopify Admin. |  |  |
| Shop record and offline session are created. |  |  |
| IndexNow public key file loads as plain text at `/apps/indexboost/{key}.txt`. |  |  |
| IndexNow key file does not redirect to storefront password page. |  |  |
| Google Indexing credential upload rejects invalid JSON. |  |  |
| Google Indexing credential upload rejects missing `client_email` or `private_key`. |  |  |
| Google Indexing credential upload validates real Service Account auth before saving. |  |  |
| Google Indexing docs/copy state Google controls eligibility, quota, crawling, indexing, and ranking. |  |  |
| Manual submit creates submission records for enabled engines. |  |  |
| Manual submit shows Google or IndexNow errors clearly when an engine rejects the URL. |  |  |
| Product create/update webhook enqueues indexing work. |  |  |
| Product delete webhook enqueues delete work. |  |  |
| Collection create/update webhook enqueues indexing work. |  |  |
| Collection delete webhook enqueues delete work. |  |  |
| Page create/update webhook enqueues indexing work. |  |  |
| Page delete webhook enqueues delete work. |  |  |
| Article create/update webhook enqueues blog post indexing work. |  |  |
| Article delete webhook enqueues blog post delete work. |  |  |
| Queue retry and max-attempt behavior works. |  |  |
| Billing Free to Pro redirects to Shopify subscription confirmation. |  |  |
| Billing Free to Pro callback sets `plan=pro`, `billingStatus=active`, and saves `subscriptionId`. |  |  |
| Billing Pro to Business redirects to Shopify subscription confirmation. |  |  |
| Billing Pro to Business callback sets `plan=business`, `billingStatus=active`, and saves `subscriptionId`. |  |  |
| Pro routes unlock only for active Pro or Business subscription. |  |  |
| Business routes unlock only for active Business subscription. |  |  |
| Cancel subscription through the app. |  |  |
| Cancel returns shop access to Free and locks paid routes. |  |  |
| App uninstall sends `app/uninstalled` webhook. |  |  |
| App uninstall cleanup deletes sessions, shop data, queue items, submissions, and Google credentials. |  |  |
| `npm run dry-run:billing` passes. |  |  |
| `npx prisma validate` passes. |  |  |
| `npx tsc --noEmit` passes. |  |  |
| `npm run lint` passes. |  |  |

## Known QA Notes

- Run billing tests with `SHOPIFY_BILLING_TEST=true` only on development or review stores.
- Production must use `SHOPIFY_BILLING_TEST=false`.
- Google Indexing API acceptance is not proof of indexing or ranking. Review logs as API submission results only.
- Current code uses `ANTHROPIC_API_KEY` for AI SEO text generation. `OPENAI_API_KEY` is not required unless the provider implementation changes.
