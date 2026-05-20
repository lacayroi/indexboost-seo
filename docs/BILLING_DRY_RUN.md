# Billing API Dry Run Checklist

## Plan configuration

| Plan | Price | Interval | Trial |
| --- | ---: | --- | ---: |
| Free | $0 | none | 0 days |
| Pro | $9.95 | every 30 days | 0 days |
| Business | $19.95 | every 30 days | 0 days |

Source of truth: `app/services/billing.server.ts`.

Set `SHOPIFY_BILLING_TEST=true` for dev store dry runs. Set `SHOPIFY_BILLING_TEST=false` in production before launch.

## Manual dry run

1. Install app on a Shopify dev store.
2. Open `/app/billing` and confirm current plan is Free.
3. Click `Upgrade to Pro`.
4. Confirm Shopify redirects to the hosted confirmation URL.
5. Approve the test charge.
6. Confirm callback returns to `/app/billing?billing_callback=1&plan=pro`.
7. Confirm success banner appears and dashboard shows Pro.
8. Open `/app/submit` and confirm Bulk Indexing is unlocked.
9. Open `/app/meta-tags`, `/app/schema`, `/app/sitemap`, `/app/robots-txt`, `/app/broken-links`, `/app/redirects`, and `/app/llms-txt`.
10. Cancel the subscription from `/app/billing`.
11. Confirm shop returns to Free and paid features show upgrade banners.
12. Upgrade from Free to Business and verify `/app/image-seo`, `/app/alerts`, and `/app/index-health` unlock.
13. Downgrade/cancel Business and confirm Business features lock again.
14. Uninstall the app.
15. Confirm the `app/uninstalled` webhook deletes sessions, queue items, submissions, and the shop record.

## Automated static dry run

```bash
npm run dry-run:billing
```

This script does not call Shopify. It verifies local billing configuration, callback sync, route/action gating, cancel handling, and uninstall cleanup.
