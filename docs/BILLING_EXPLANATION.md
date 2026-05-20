# IndexBoost SEO - Billing Explanation

This document covers the billing model for IndexBoost SEO, how Shopify processes payments, how to upgrade or cancel, and what happens to data when a subscription ends or the app is uninstalled. This document is intended for both Shopify App Store reviewers and merchants.

---

## Plans

### Free — $0/month

No credit card required. Free plan is available immediately on install.

**Included on Free:**

- Manual URL submission (products, collections, pages, blog posts) via Google Indexing API and IndexNow
- Auto-indexing via webhooks (automatic submission when content changes)
- Settings: Google Service Account connection, IndexNow key management
- Submission logs (7-day retention)
- Dashboard with submission stats and onboarding checklist
- AI SEO generation with a starter credit allowance

**Not included on Free (require upgrade):**

- Bulk indexing (submit all URLs at once)
- Meta tags editor
- Schema markup generator
- Sitemap generator
- Robots.txt editor
- Broken links scanner
- Redirect manager
- LLMs.txt generator
- SEO Audit
- Image alt text management
- Index health monitoring
- Email alerts

---

### Pro — $9.95/month

Billed every 30 days through Shopify. No free trial. No setup fee.

**Everything in Free, plus:**

- Bulk indexing (submit all products, collections, pages, blog posts in one action)
- Meta tags editor (edit SEO title and description for any product, collection, or page)
- Schema markup generator
- Sitemap generator
- Robots.txt editor
- Broken links scanner
- Redirect manager
- LLMs.txt generator
- SEO Audit
- Submission log retention: 30 days
- Increased AI SEO generation credits

---

### Business — $19.95/month

Billed every 30 days through Shopify. No free trial. No setup fee.

**Everything in Pro, plus:**

- Image alt text management with AI suggestions (Business exclusive)
- Index health monitoring dashboard (Business exclusive)
- Email alerts for submission failures and queue issues (Business exclusive)
- Submission log retention: 90 days
- Maximum AI SEO generation credits

---

## How Billing Works

IndexBoost SEO billing is managed entirely by Shopify through the **Shopify Billing API**. The app does not collect payment information directly, does not store credit card numbers or billing addresses, and does not charge merchants outside of Shopify.

When a merchant upgrades to Pro or Business:

1. The app initiates a subscription via the Shopify Billing API.
2. Shopify redirects the merchant to a hosted Shopify confirmation page.
3. The merchant reviews and approves the charge on Shopify's page.
4. Shopify redirects back to the app with a confirmation token.
5. The app verifies the token, activates the subscription, and updates the merchant's plan.

Recurring charges are processed by Shopify automatically on the 30-day billing cycle. IndexBoost SEO does not issue invoices directly — all billing history is available in the merchant's Shopify Admin under **Settings > Billing > App charges**.

---

## No Hidden Fees

- No usage-based charges
- No per-submission fees
- No overage charges if submission volume exceeds a threshold
- No charges for features being developed
- No fee to install or use the Free plan
- No charge when cancelling

---

## How to Upgrade

1. Open the app in Shopify Admin.
2. Navigate to **Plans** in the app sidebar.
3. Click **Upgrade to Pro** or **Upgrade to Business**.
4. Review the subscription details on the Shopify-hosted confirmation page.
5. Click **Approve** to activate the subscription.
6. The app redirects back and the new plan is active immediately.

---

## How to Cancel

1. Open the app in Shopify Admin.
2. Navigate to **Plans**.
3. Click **Cancel subscription**.
4. The subscription is cancelled immediately via the Shopify Billing API.
5. The app returns to the Free plan instantly — no waiting period.
6. Paid features (bulk indexing, meta tags, robots.txt, etc.) become locked and show upgrade prompts.
7. The Free plan features continue to work without interruption.

There is no penalty for cancelling. Merchants are not billed a cancellation fee.

---

## What Happens to Data After Cancellation

When a subscription is cancelled and the plan returns to Free:

- Submission logs are retained but truncated to the Free plan limit (7 days) on the next log cleanup cycle.
- Pro and Business features are locked and no longer accessible.
- Free plan features (manual submit, auto-indexing, settings, logs within Free limits) continue to work.
- No data is immediately deleted. The shop record and submission history remain intact.

If a merchant resubscribes to Pro or Business, their data and settings are restored and paid features unlock immediately.

---

## What Happens to Data After Uninstall

When a merchant uninstalls the app from Shopify Admin:

1. Shopify fires an `app/uninstalled` webhook to the app.
2. The app receives this webhook and deletes all data associated with the store:
   - Shopify session and access token
   - Shop record (plan, settings, Google credentials, IndexNow key)
   - All queue items
   - All submission log records
3. This deletion happens within seconds of the uninstall webhook being received.
4. Any remaining data is deleted within 30 days per GDPR compliance requirements.

After uninstall, no data remains in the app database for that store. If the merchant reinstalls the app later, it starts fresh as a new install.

---

## Development and Testing Mode

In development environments, the environment variable `SHOPIFY_BILLING_TEST=true` enables Shopify's test billing mode. In this mode:

- Subscription confirmation flows through Shopify's hosted page as normal.
- No real charge is created.
- The subscription activates and the app plan updates exactly as in production.
- This is used for testing the full billing flow on development stores without incurring real charges.

**In production, `SHOPIFY_BILLING_TEST=false` is always set.** Live merchant subscriptions create real charges.

---

## Refund Policy

IndexBoost SEO follows the **Shopify App Store standard refund policy**. Refund requests are handled through Shopify's standard partner billing dispute process. Merchants can contact Shopify Support for billing disputes related to app charges.

For billing questions or support, contact: thuanvd@syn-gr.com
