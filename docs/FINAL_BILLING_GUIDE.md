# IndexBoost SEO — Billing Guide

**App:** IndexBoost SEO
**Billing platform:** Shopify Recurring Charges (Shopify Billing API)
**Support:** thuanvd@syn-gr.com

---

## Plan Comparison

| Feature | Free | Pro ($9.95/mo) | Business ($19.95/mo) |
|---|:---:|:---:|:---:|
| Manual URL submission (Google + IndexNow) | Yes | Yes | Yes |
| Auto-indexing via webhooks | Yes | Yes | Yes |
| Google Service Account connection | Yes | Yes | Yes |
| IndexNow key management | Yes | Yes | Yes |
| AI SEO generation (starter credits) | Yes | Yes | Yes |
| Dashboard and submission logs | Yes | Yes | Yes |
| Log retention | 7 days | 30 days | 90 days |
| Bulk indexing | — | Yes | Yes |
| Meta tags editor (products, collections, pages) | — | Yes | Yes |
| Schema markup generator | — | Yes | Yes |
| Sitemap generator | — | Yes | Yes |
| Robots.txt editor | — | Yes | Yes |
| Broken links scanner | — | Yes | Yes |
| Redirect manager | — | Yes | Yes |
| LLMs.txt generator | — | Yes | Yes |
| SEO Audit | — | Yes | Yes |
| Increased AI SEO credits | — | Yes | Yes |
| Image alt text management (AI-assisted) | — | — | Yes |
| Index health monitoring dashboard | — | — | Yes |
| Email alerts for submission failures | — | — | Yes |
| Maximum AI SEO credits | — | — | Yes |

---

## How Billing Works

IndexBoost SEO uses **Shopify Recurring Charges** — all billing is handled by Shopify. The app does not collect payment information, store card numbers, or charge merchants outside of Shopify.

**Upgrade flow (step by step):**

1. Merchant opens **Plans** inside the app and clicks **Upgrade to Pro** or **Upgrade to Business**.
2. The app creates a subscription request via the Shopify Billing API.
3. Shopify redirects the merchant to a Shopify-hosted subscription confirmation page.
4. The merchant reviews the charge details and clicks **Approve** on Shopify's page.
5. Shopify redirects the merchant back to the app with a confirmation token.
6. The app verifies the token, activates the subscription, and the new plan is live immediately.

Recurring charges are automatically collected by Shopify every 30 days. Merchants can view all billing history in **Shopify Admin > Settings > Billing > App charges**.

---

## No Hidden Charges

- No setup fee
- No usage-based charges or per-submission fees
- No overage charges
- No charge to install or use the Free plan
- No fee to cancel
- No trial period — plans start billing immediately on approval

---

## Upgrade Behavior

- New features unlock immediately after the subscription is approved.
- The first billing cycle starts from the day of upgrade.
- Upgrading from Pro to Business cancels the Pro subscription and creates a new Business subscription in a single flow.

---

## Downgrade Behavior

When cancelling from Pro or Business back to Free:

- The subscription is cancelled immediately via the Shopify Billing API.
- The app returns to Free plan instantly — no waiting period.
- Paid features (bulk indexing, meta tags, robots.txt, etc.) are locked and show upgrade prompts.
- Free plan features continue working without interruption.
- Submission logs are retained but trimmed to the Free plan 7-day limit on the next scheduled cleanup.
- No data is immediately deleted when downgrading. The shop record and existing settings are preserved.

If the merchant resubscribes later, all settings and data within retention limits are restored immediately.

---

## How Merchants Can Cancel

**Option 1 — In-app:**
1. Open the app in Shopify Admin.
2. Navigate to **Plans**.
3. Click **Cancel subscription**.
4. The subscription is cancelled immediately and the plan returns to Free.

**Option 2 — Shopify Admin:**
1. Go to **Shopify Admin > Settings > Apps**.
2. Find IndexBoost SEO and click **Delete**.
3. Uninstalling the app automatically cancels the subscription and deletes all app data.

There is no cancellation fee and no minimum commitment period.

---

## What Happens on Uninstall

Uninstalling the app from Shopify Admin:

1. Cancels any active subscription.
2. Triggers the `app/uninstalled` webhook.
3. Deletes all data for that store from the app database:
   - Shopify session and access token
   - Shop record (plan, billing status, settings, Google credentials, IndexNow key)
   - All submission queue items
   - All submission log records

Data deletion happens within seconds of the webhook being received. A secondary GDPR `shop/redact` webhook (sent by Shopify ~48 hours later) confirms all remaining data is deleted.

If the merchant reinstalls the app at a later date, it starts fresh as a new installation.

---

## Test Billing Mode

The environment variable `SHOPIFY_BILLING_TEST=true` enables Shopify's test billing mode on the server side.

In test mode:
- The subscription flow goes through the Shopify-hosted confirmation page as normal.
- No real charge is created.
- The plan activates exactly as in production.
- This mode is used for development store testing and App Store review.

In production, `SHOPIFY_BILLING_TEST=false` is always set. Live merchant subscriptions create real charges.

---

## Refund Policy

IndexBoost SEO follows the **Shopify App Store standard refund policy**. Shopify handles refund requests for app charges. Merchants can contact Shopify Support for billing disputes or refund requests related to app charges.

For billing questions or support outside of Shopify's process: thuanvd@syn-gr.com
