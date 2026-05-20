# IndexBoost SEO — GDPR & Data Privacy Guide

**App:** IndexBoost SEO
**Privacy contact:** thuanvd@syn-gr.com

---

## What Data Is Stored

IndexBoost SEO operates entirely at the merchant/store level. It does **not** access customer orders, customer profiles, or any shopper personal information.

### Data stored per merchant installation

| Data | Purpose |
|---|---|
| Shop domain | Identifies the merchant's store across all app operations |
| Shopify access token | Authenticates Shopify Admin API calls on behalf of the merchant |
| Subscription plan and billing status | Enforces feature access per plan tier |
| Shopify subscription ID | Links the app record to the Shopify Billing API |
| Google Service Account JSON | Authenticates Google Indexing API calls (see security note below) |
| IndexNow key | Authenticates IndexNow submissions; served via app proxy for search engine verification |
| App settings | Merchant-configured options (enabled engines, email alert address, etc.) |
| Submission log records | URL submitted, content type, target engine, status, error message, timestamp |
| Queue items | Pending URL submission tasks: URL, content type, scheduled time |

### Data NOT stored

The app does not collect, store, or process:

- Customer names, email addresses, or physical addresses
- Order details or order history
- Payment or financial data
- Customer browsing sessions or analytics
- Any personally identifiable information (PII) about shoppers

---

## Where Data Is Stored

All data is stored in a **PostgreSQL database** managed by the developer on dedicated infrastructure. The database is not shared with other applications and is not sold or disclosed to third parties for any purpose outside of operating the app.

---

## Security Note: Google Credentials Storage

As of v1.0.0, Google Service Account JSON credentials are stored as plaintext in the PostgreSQL database. This credential contains a private key granting access to the merchant's Google Cloud project.

Merchants are advised to:
- Create a dedicated Google Service Account with minimum permissions (Google Indexing API only).
- Rotate or revoke the service account key via Google Cloud Console on uninstall or if they suspect exposure.
- Not reuse service account keys across multiple applications.

Encryption at rest for this field is planned for v1.1.

---

## Data Retention

| Data Type | Free Plan | Pro Plan | Business Plan |
|---|---|---|---|
| Submission logs | 7 days | 30 days | 90 days |
| All other data (shop record, settings, session, queue) | Lifetime of installation | Lifetime of installation | Lifetime of installation |

Log records older than the plan limit are deleted on a scheduled cleanup cycle. All data is deleted immediately when the app is uninstalled (see below).

---

## Third-Party Data Sharing

The app shares limited data with three external services. No customer PII is sent to any of them.

### Google Indexing API

When the merchant enables Google submissions, the app sends:
- Store page URLs (e.g., `https://store.com/products/product-handle`)
- Notification type (`URL_UPDATED` or `URL_DELETED`)

Submitting store URLs to Google Search is the primary, disclosed purpose of the app. Merchants consent to this when installing and providing Google credentials.

### IndexNow (Bing / Yandex)

When IndexNow is enabled, the app sends:
- The store page URL(s) being submitted
- The IndexNow key (for authentication)
- The key location URL (for verification)

No customer data is included. Submitting store URLs to search engines is the disclosed purpose of the app.

### Anthropic API (AI SEO Generation)

When a merchant uses AI SEO generation, the following data is sent to the Anthropic API:
- Product title
- Product description (body HTML)
- Existing SEO fields (meta title, meta description, if present)

No customer PII is sent. Only merchant-controlled product content is included. AI generation is triggered only by explicit merchant action from within the app.

### Infrastructure Providers

The app uses third-party hosting and database infrastructure. These providers process data only to operate the application infrastructure and are bound by data processing agreements.

---

## GDPR Webhook Handlers

Shopify requires all public apps to implement three GDPR compliance webhooks. IndexBoost SEO implements all three.

### `customers/data_request`

**Purpose:** A customer has requested access to their data.

**Response:** HTTP 200. Message: "No customer data stored."

**Why:** IndexBoost SEO stores no customer PII. The app does not access customer records, orders, browsing history, or any shopper-level data. There is no customer data to return.

---

### `customers/redact`

**Purpose:** A customer has requested deletion of their data.

**Response:** HTTP 200. Message: "No customer data stored."

**Why:** Because the app stores no customer PII, there is no customer data to redact or delete.

---

### `shop/redact`

**Purpose:** The app has been uninstalled and the mandatory waiting period has elapsed. Shopify requests final deletion of all shop data.

**Response:** HTTP 200. Deletes all remaining data for the shop.

**Records deleted:**
- `Shop` record (plan, settings, Google credentials, IndexNow key, billing status)
- `Session` records (Shopify access token)
- `QueueItem` records (all pending and processed queue items)
- `Submission` records (all submission log entries)

**Timing:** Shopify sends this webhook approximately 48 hours after uninstall. The `app/uninstalled` webhook handles immediate cleanup (see below); `shop/redact` is the GDPR-mandated final confirmation.

---

## Deletion on Uninstall

The `app/uninstalled` webhook fires immediately when a merchant uninstalls the app.

On receipt, the app deletes:

- All Shopify session records for the shop domain
- The Shop record and all associated settings, credentials, and keys
- All queue items for the shop
- All submission log records for the shop

This deletion happens within seconds of the webhook being received. After processing, no data for that store remains in the app database. The subsequent `shop/redact` webhook (sent ~48 hours later by Shopify) serves as the GDPR-compliant backstop to confirm all data is cleared.

If the merchant reinstalls the app after uninstalling, it starts as a new installation with no prior data.

---

## Merchant Data Rights

Merchants can delete all their app data at any time by uninstalling the app from Shopify Admin. This triggers immediate deletion of all associated records.

For data privacy requests, GDPR inquiries, or to request a Data Processing Agreement (DPA):

**Email:** thuanvd@syn-gr.com

Requests are processed within 30 days.
