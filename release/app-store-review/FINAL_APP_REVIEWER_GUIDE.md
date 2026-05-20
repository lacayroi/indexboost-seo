# IndexBoost SEO — Shopify App Store Reviewer Guide

**App:** IndexBoost SEO
**App URL:** https://app.indexboostseo.com
**API Version:** 2026-04
**Support:** thuanvd@syn-gr.com

---

## What This App Does

IndexBoost SEO helps Shopify merchants submit store URLs to Google and other search engines, and provides a suite of technical SEO tools. Core capabilities:

- Submit product, collection, page, and blog URLs to Google Indexing API and IndexNow (Bing/Yandex)
- Automatically queue URL submissions when store content changes (via Shopify webhooks)
- Edit meta tags, schema markup, robots.txt, redirects, and sitemaps
- Run SEO audits and broken link scans
- Generate AI SEO suggestions using Anthropic Claude
- Manage image alt text (Business plan)

The app does **not** guarantee indexing or rankings. It submits URLs to search engine APIs — search engines decide whether and when to index.

---

## Before You Begin

- The app is an **embedded Shopify app**. All testing is done from within Shopify Admin — the app should never be opened as a standalone URL.
- Billing test mode is enabled via `SHOPIFY_BILLING_TEST=true` on the server. No real charges are created during review.
- The app requires a Shopify store (development store is fine). A Google Service Account is optional for basic feature testing.

---

## Step 1: Installation

1. Navigate to the app install URL or click the listing in the Shopify App Store.
2. You are redirected to Shopify Admin for scope authorization.
3. Review the requested scopes (all 8 are described in `FINAL_PERMISSION_JUSTIFICATION.md`) and click **Install**.
4. After install, Shopify redirects to the app dashboard inside Shopify Admin.
5. The dashboard displays an onboarding checklist and shows the current plan as **Free**.

**Expected result:** App opens embedded in Shopify Admin. Plan badge shows `Free`. Onboarding checklist is visible.

---

## Step 2: Testing the Free Plan

All Free plan features are available immediately after install with no billing required.

### Settings

1. Open **Settings** in the app sidebar.
2. Confirm an **IndexNow key** has been auto-generated.
3. Optionally upload a Google Service Account JSON. The app validates format and authenticates with Google before saving.
4. Invalid JSON or credentials show a clear inline error.

### Manual URL Submission

1. Open **Submit URLs**.
2. Select a product, collection, page, or blog post URL from your store.
3. Click **Submit**.
4. Open **Submission Logs** — confirm a log entry is created with status (success, pending, or error).

**Free plan limits:** 7-day log retention. Auto-indexing via webhooks is included.

### Free Plan Feature Gate Check

Navigate to any of these pages and confirm an **upgrade prompt** is shown — they are not accessible on Free:

- Bulk Indexing
- Meta Tags Editor
- Schema Markup
- Sitemap
- Robots.txt Editor
- Broken Links Scanner
- Redirect Manager
- LLMs.txt Generator
- SEO Audit
- Image SEO (Business)
- Alerts (Business)
- Index Health (Business)

---

## Step 3: Testing Pro Plan Billing

Test billing uses Shopify's hosted confirmation flow. No real charge is created (`SHOPIFY_BILLING_TEST=true` is active).

1. Open **Plans** in the app sidebar.
2. Click **Upgrade to Pro** ($9.95/mo).
3. Shopify redirects to a hosted subscription confirmation page.
4. Click **Approve** on Shopify's page.
5. Shopify redirects back to the app at `/app/billing?billing_callback=1&plan=pro`.
6. The app displays a success message. Plan badge updates to **Pro**.

**Verify post-upgrade state:**
- Dashboard shows `Pro` plan badge.
- The following features are now accessible:
  - Bulk Indexing
  - Meta Tags Editor (products, collections, and pages)
  - Schema Markup Generator
  - Sitemap Generator
  - Robots.txt Editor
  - Broken Links Scanner
  - Redirect Manager
  - LLMs.txt Generator
  - SEO Audit
  - 30-day submission log retention

**Business-only features (Image SEO, Alerts, Index Health) still show upgrade prompts.**

### Testing Pro Features

**Meta Tags Editor**
1. Open **Meta Tags**.
2. Select a product. Confirm current SEO title and description are loaded.
3. Edit the SEO title and click **Save**.
4. Confirm the update is reflected. (The app writes back to Shopify via `productUpdate` mutation.)

**Redirect Manager**
1. Open **Redirects**.
2. Add a redirect from `/old-page` to `/new-page`.
3. Confirm it appears in the list.
4. Delete the redirect. Confirm it is removed.

**Robots.txt Editor**
1. Open **Robots.txt**.
2. View the current `robots.txt.liquid` content from the active theme.
3. Make a minor edit and click **Save to Theme**.
4. Confirm the change is saved. (The app writes to `templates/robots.txt.liquid` in the active theme.)

**SEO Audit**
1. Open **SEO Audit**.
2. Confirm the audit scans products and pages for missing SEO fields.
3. Review flagged issues.

---

## Step 4: Testing Business Plan Billing

1. From Pro (or Free), open **Plans**.
2. Click **Upgrade to Business** ($19.95/mo).
3. Approve the Shopify-hosted test charge.
4. Confirm redirect back to the app. Plan badge updates to **Business**.

**Business-exclusive features now accessible:**
- Image SEO (manage and AI-generate alt text for product images)
- Index Health dashboard
- Email alerts for submission failures

**Testing Image SEO:**
1. Open **Image SEO**.
2. Confirm the app loads product images with missing alt text highlighted.
3. Generate an AI alt text suggestion and confirm the result is returned.
4. Save the alt text. (The app writes to Shopify via `productUpdate` with `images` field.)

---

## Step 5: Testing Downgrade / Cancel

1. Open **Plans**.
2. Click **Cancel subscription**.
3. Confirm the subscription is cancelled immediately.
4. Plan badge returns to **Free**.
5. Pro and Business features are locked and show upgrade prompts.
6. Free plan features (manual submit, auto-indexing, settings, logs within Free limits) continue working.

There is no penalty or waiting period for cancellation.

---

## Step 6: Testing Uninstall Cleanup

1. While the app is installed, note that a Shop record and session exist.
2. Uninstall the app from **Shopify Admin > Settings > Apps**.
3. Shopify fires the `app/uninstalled` webhook.
4. All shop data is deleted from the app database:
   - Shopify session and access token
   - Shop record (plan, settings, Google credentials, IndexNow key)
   - Queue items
   - Submission logs

After uninstall, if the app is reinstalled, it starts fresh with a new onboarding checklist and Free plan.

---

## Step 7: Testing AI SEO Generation

1. Open **AI SEO** (available on all plans with credit limits).
2. Select a product.
3. Click **Generate SEO Suggestions**.
4. Confirm an AI-generated meta title and description are returned.
5. Click **Apply** to save the generated content to the product.

AI generation uses Anthropic Claude. Only product title and description are sent — no customer data or PII.

---

## Step 8: Webhook Testing Notes

The following Shopify webhooks are registered and active:

| Webhook | Trigger | App Action |
|---|---|---|
| `products/create` | New product published | Enqueues product URL for indexing |
| `products/update` | Product updated | Enqueues product URL for indexing |
| `collections/update` | Collection updated | Enqueues collection URL for indexing |
| `pages/create` | New page published | Enqueues page URL for indexing |
| `pages/update` | Page updated | Enqueues page URL for indexing |
| `app/uninstalled` | Merchant uninstalls | Deletes all shop data |
| `customers/data_request` | GDPR request | Returns HTTP 200 — no PII stored |
| `customers/redact` | GDPR redact | Returns HTTP 200 — no PII stored |
| `shop/redact` | GDPR shop delete | Deletes all remaining shop data |

To verify auto-indexing: update a product in Shopify Admin, then check **Submission Logs** in the app — a new queue entry should appear.

---

## Embedded App Navigation Notes

- All app pages are accessible from the left sidebar inside Shopify Admin.
- The app does not open in a new tab or a separate browser window — it is fully embedded.
- Back navigation within the app uses Shopify App Bridge. The browser Back button may navigate away from the app back to Shopify Admin; this is expected Shopify behavior.
- Deep links (e.g., direct URL to `/app/meta-tags`) redirect to the Shopify OAuth flow if the session has expired — this is expected.

---

## Test Mode Notes

| Setting | Development | Production |
|---|---|---|
| `SHOPIFY_BILLING_TEST` | `true` — no real charges | `false` — real charges |
| Google API | Requires real credentials (optional for review) | Requires real credentials |
| IndexNow | Requires live storefront URL | Requires live storefront URL |

For testing IndexNow: the storefront must be publicly accessible (no storefront password). Development stores with password-protected storefronts will cause IndexNow key verification to fail — this is a search engine limitation, not an app bug. Submission logs capture the full error response when this occurs.

---

## Support

For questions during review: thuanvd@syn-gr.com
