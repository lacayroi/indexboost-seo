# IndexBoost SEO - Production Smoke Test

Run this after deploying a production-like build with PostgreSQL.

| Area | Result | Notes |
| --- | --- | --- |
| Open `https://app.indexboostseo.com` and confirm it responds over HTTPS. |  |  |
| Install app on a Shopify development or review store. |  |  |
| OAuth redirects to `https://app.indexboostseo.com/auth/callback`. |  |  |
| Embedded dashboard loads in Shopify Admin. |  |  |
| Shop record is created in PostgreSQL. |  |  |
| Offline session is stored in PostgreSQL. |  |  |
| Open Settings and confirm IndexNow key exists. |  |  |
| Open `https://{shop-domain}/apps/indexboost/{key}.txt`. |  |  |
| App proxy key file returns plain text and does not redirect to `/password`. |  |  |
| Submit one URL to IndexNow. |  |  |
| Submission log is created with IndexNow status or readable error. |  |  |
| Confirm `SHOPIFY_BILLING_TEST=false` in production env. |  |  |
| Open Plans and verify live billing mode is not test mode. |  |  |
| Create or update a product and confirm webhook enqueues indexing work. |  |  |
| Delete a product and confirm delete webhook behavior is logged or queued. |  |  |
| Uninstall app from Shopify Admin. |  |  |
| Confirm `app/uninstalled` webhook is received. |  |  |
| Confirm uninstall cleanup deletes sessions, shop data, queue items, submissions, and Google credentials. |  |  |

## Notes

- Google Indexing API acceptance is not required for the smoke test because Google controls eligibility, quota, crawling, indexing, and ranking.
- Use IndexNow and internal submission logs as the primary production smoke signal.
- Do not run live billing tests on an unintended merchant store.
