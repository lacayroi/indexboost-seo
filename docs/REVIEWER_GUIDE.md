# IndexBoost SEO - Shopify App Review Guide

## What the App Does

IndexBoost SEO helps Shopify merchants submit store URLs to search engines and manage lightweight technical SEO workflows.

Core workflows:

- Submit eligible URLs to Google Indexing API using merchant-provided Google credentials.
- Submit URLs to IndexNow.
- Automatically enqueue product, collection, page, and blog post updates from Shopify webhooks for enabled submission engines.
- Show submission logs and queue status.
- Provide Pro SEO tools such as meta tags, schema, sitemap tools, robots.txt, redirects, broken link scanning, SEO audit, and LLMs.txt.
- Provide Business tools such as image SEO, email alerts, and index health views.

The app does not guarantee that URLs will be indexed or ranked. Search engines control crawling, indexing, and ranking.

Google Indexing API eligibility, quota, and approval are controlled by Google. Google documents the API for pages with `JobPosting` or `BroadcastEvent` in a `VideoObject`; review testing should treat non-eligible Shopify product, collection, page, and blog URLs as submission attempts that may be rejected or ignored by Google.

## What the App Does Not Do

- It does not guarantee instant indexing.
- It does not guarantee rankings or traffic growth.
- It does not inject storefront JavaScript for core indexing.
- It does not modify a theme for basic indexing and submission workflows.
- It does not sell merchant data.
- It does not provide Google credentials. Merchants must connect their own Google Service Account.
- It does not override Google Indexing API eligibility, quota, approval, or Search Console ownership requirements.

## How to Install the App

1. Open the app install URL from Shopify Admin or Shopify CLI dev preview.
2. Approve the requested Shopify scopes.
3. The app opens inside Shopify Admin as an embedded app.
4. On first load, the dashboard creates a shop record and shows the onboarding checklist.

## How to Test the Free Plan

1. Install the app on a test store.
2. Open the dashboard.
3. Confirm the current plan badge shows `Free`.
4. Open `Settings`.
5. Confirm IndexNow key is generated.
6. Optionally upload valid Google Service Account JSON.
7. Open `Submit URLs`.
8. Submit a product, collection, page, or blog URL.
9. Open dashboard or logs and confirm a submission record is created.
10. Open Pro or Business feature routes and confirm upgrade messaging is shown.

Expected Free restrictions:

- Bulk indexing requires Pro.
- Meta tags, schema, sitemap, robots.txt, broken links, redirects, SEO audit, and LLMs.txt require Pro.
- Image SEO, alerts, and index health require Business.

## How to Test Pro Billing With Test Charge

Before testing billing in development, set:

```bash
SHOPIFY_BILLING_TEST=true
```

Steps:

1. Open `Plans`.
2. Click `Upgrade to Pro`.
3. Shopify should redirect to the subscription confirmation page.
4. Approve the test charge.
5. Shopify should redirect back to `/app/billing?billing_callback=1&plan=pro`.
6. Confirm the billing page shows success messaging.
7. Confirm database state:
   - `shop.plan = pro`
   - `shop.billingStatus = active`
   - `shop.subscriptionId` is not empty
8. Open Pro feature routes and confirm they unlock.

## How to Test Business Billing

1. From Free or Pro, open `Plans`.
2. Click `Upgrade to Business`.
3. Approve the Shopify test charge.
4. Confirm redirect back to billing.
5. Confirm database state:
   - `shop.plan = business`
   - `shop.billingStatus = active`
   - `shop.subscriptionId` is not empty
6. Open Business feature routes:
   - Image SEO
   - Alerts
   - Index Health
7. Confirm those routes unlock.

## How to Test Cancel / Downgrade

1. Open `Plans`.
2. Click `Cancel subscription`.
3. Confirm the subscription is cancelled through Shopify Billing API.
4. Confirm app state returns to Free.
5. Confirm Pro and Business routes show upgrade messaging.
6. Confirm existing logs are not deleted immediately.

## How to Test IndexNow

1. Make sure the storefront is publicly accessible.
2. Development stores with storefront password enabled may block IndexNow verification.
3. Open `Settings` and copy the IndexNow verification URL:

```text
https://{shop-domain}/apps/indexboost/{key}.txt
```

4. Confirm the URL returns plain text key content and does not redirect to `/password`.
5. Submit a real product or page URL.
6. Check submission logs.

If IndexNow fails, logs include:

- `keyLocation`
- `urlList`
- `statusCode`
- `responseBody`

## How to Test Google Indexing API

Google Indexing API requires merchant-owned credentials.

Setup and eligibility:

1. Create or select a Google Cloud project.
2. Enable the Google Indexing API.
3. Create a Service Account.
4. Download the JSON key.
5. In Google Search Console, add the service account email as an owner for the property.
6. Upload the JSON key in app `Settings`.
7. Confirm the submitted URL type is eligible under Google's current Indexing API policy before expecting Google acceptance.

Expected behavior:

- The app validates the JSON format.
- The app validates Google authentication before saving credentials.
- Invalid credentials show a clear error.
- Valid credentials are stored and Google submission can be attempted.
- Google permission, API, or quota errors are shown in submission logs.
- Google may reject, ignore, or limit non-eligible URLs even when credentials are valid.

## How to Test app/uninstalled Cleanup

1. Install the app.
2. Confirm a `Shop` record exists.
3. Confirm an offline `Session` exists.
4. Trigger uninstall from Shopify Admin.
5. Confirm the `app/uninstalled` webhook is received.
6. Confirm cleanup:
   - Session deleted.
   - Shop data deleted.
   - Queue items deleted.
   - Submission records deleted.
   - Google credentials removed with the shop record.

## Shopify Scopes and Reasons

| Scope | Reason |
| --- | --- |
| `read_products` | Read product handles, titles, SEO fields, and images for indexing and SEO tools. |
| `write_products` | Update product SEO fields and image alt text where supported. |
| `read_content` | Read pages and blog content for indexing, sitemaps, and LLMs.txt. |
| `write_content` | Update content SEO fields where supported. |
| `read_online_store_navigation` | Read navigation and links for sitemap and broken link workflows. |
| `write_online_store_navigation` | Support navigation-related SEO workflows where needed. |
| `read_themes` | Read theme/storefront files when needed for robots.txt and storefront checks. |
| `write_themes` | Update robots.txt template when the merchant uses the robots.txt editor. |

The app should keep scopes limited to features that are actually enabled in the submitted version.

## Support and Privacy Review Notes

- Support email: [Insert monitored support email before submission]
- Privacy policy URL: [Insert live privacy policy URL before submission]
- Support URL: [Insert live support URL before submission]
- Billing, Google credential, and IndexNow troubleshooting should route to the support email above.
