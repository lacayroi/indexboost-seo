# IndexBoost SEO - GDPR Compliance Documentation

This document describes how IndexBoost SEO handles data collection, storage, retention, deletion, and third-party sharing in compliance with GDPR and Shopify's mandatory compliance webhook requirements.

---

## Data Collected

### What the App Stores

| Data | Purpose |
|---|---|
| Shop domain | Identifies the merchant's store for all app operations |
| Shopify shop identifier | Internal reference for session and billing association |
| Shopify offline access token | Authenticates Shopify Admin API calls on behalf of the merchant |
| Google Service Account JSON | Authenticates Google Indexing API calls for URL submission (see security note below) |
| IndexNow key | Authenticates IndexNow URL submission; served via app proxy for search engine verification |
| App plan and billing status | Enforces feature access based on subscription tier |
| Shopify subscription ID | Links the app subscription record to the Shopify Billing API |
| Submission log records | Tracks URL submission activity: URL, content type, search engine target, action, status, error message, timestamp |
| Queue items | Stores pending URL submission tasks: URL, content type, scheduled submission time |

### What the App Does NOT Store

The app does not collect, store, or process any of the following:

- Customer names
- Customer email addresses
- Customer physical addresses
- Order details or order history
- Payment information or financial data
- Customer browsing behavior or session data
- Any personally identifiable information (PII) about shoppers

**The app operates entirely at the merchant/store level.** It processes store URLs (product pages, collection pages, content pages) and merchant-configured settings. No shopper-level data is ever accessed or stored.

---

## Security Note: Google Service Account JSON Storage

**Important disclosure for reviewers and merchants:**

As of the current submitted version, Google Service Account JSON credentials are stored as plaintext in the PostgreSQL database. This credential contains a private key that grants access to the merchant's Google Indexing API and the associated Google Cloud project.

Planned remediation: Encryption at rest for the `googleCredentials` column is on the development roadmap. Until this is implemented, merchants are advised to:

1. Create a dedicated Google Service Account with minimum required permissions (Google Indexing API only).
2. Revoke and rotate the service account key via Google Cloud Console if they uninstall the app or suspect exposure.
3. Do not reuse service account keys across multiple applications.

This limitation is disclosed in the App Reviewer Guide and will be addressed before reaching a large merchant base.

---

## Data Storage

- All app data is stored in a **PostgreSQL database** managed by the developer.
- The database is hosted on dedicated infrastructure (not shared with other applications).
- Data is never sold to third parties.
- Data is never used for advertising, profiling, or analytics outside of operating the app.

---

## Data Retention

Submission log records are retained according to the merchant's plan:

| Plan | Log Retention |
|---|---|
| Free | 7 days |
| Pro | 30 days |
| Business | 90 days |

Log records older than the plan limit are purged on a scheduled cleanup cycle.

All other data (shop record, settings, session, queue items) is retained for the lifetime of the installation. On uninstall, all data is deleted (see Deletion on Uninstall below).

---

## GDPR Webhooks

Shopify requires all public apps to implement three mandatory GDPR compliance webhooks. IndexBoost SEO implements all three.

### `customers/data_request`

**Endpoint:** `POST /webhooks/customers/data_request`

**What it does:** Returns HTTP 200 with the message "No customer data stored."

**Reason:** IndexBoost SEO stores no customer PII. The app does not access customer records, orders, browsing history, or any shopper-level data. There is no customer data to return.

**Webhook configured in:** `shopify.app.toml` under `compliance_topics = ["customers/data_request"]`

---

### `customers/redact`

**Endpoint:** `POST /webhooks/customers/redact`

**What it does:** Returns HTTP 200 with the message "No customer data stored."

**Reason:** Because the app stores no customer PII, there is no customer data to redact or delete in response to this webhook.

**Webhook configured in:** `shopify.app.toml` under `compliance_topics = ["customers/redact"]`

---

### `shop/redact`

**Endpoint:** `POST /webhooks/shop/redact`

**What it does:** Deletes all data associated with the shop from the database.

**Records deleted:**

- `Shop` record (plan, settings, Google credentials, IndexNow key, billing status)
- `Session` records (Shopify access token and session data)
- `QueueItem` records (all pending and processed queue items for the shop)
- `Submission` records (all submission log entries for the shop)

**When this fires:** Shopify sends this webhook approximately 48 hours after a merchant uninstalls the app and after the mandatory waiting period. The `app/uninstalled` webhook (see below) handles immediate cleanup; `shop/redact` serves as the final GDPR-mandated deletion confirmation.

**Webhook configured in:** `shopify.app.toml` under `compliance_topics = ["shop/redact"]`

---

## Deletion on Uninstall

The `app/uninstalled` webhook fires immediately when a merchant uninstalls the app from Shopify Admin.

**Endpoint:** `POST /webhooks/app/uninstalled`

**What it deletes immediately:**

- All `Session` records for the shop domain
- The `Shop` record and all associated settings
- All `QueueItem` records
- All `Submission` records
- Google Service Account JSON (stored within the Shop record)
- IndexNow key (stored within the Shop record)

After this webhook is processed, no data for the uninstalled store remains in the app database. If any records are missed by the immediate cleanup, the `shop/redact` webhook provides a GDPR-compliant backstop. All remaining data is deleted within 30 days of uninstall.

---

## Third-Party Data Sharing

### Google Indexing API

When the merchant enables Google submissions and provides a Google Service Account, the app submits store URLs to the Google Indexing API. The data sent is:

- The URL of the store page being submitted (e.g., `https://store.com/products/product-handle`)
- The notification type (`URL_UPDATED` or `URL_DELETED`)

No customer PII, order data, or personal information is sent to Google. Sending store URLs to Google Search is the explicit, primary purpose of the app, and merchants consent to this when installing and configuring the Google credentials.

### IndexNow API

When IndexNow submission is enabled, the app submits store URLs to IndexNow-compatible endpoints (Bing, Yandex, and other participating search engines). The data sent is:

- The URL(s) being submitted
- The IndexNow key (for authentication)
- The key location URL (for verification)

No customer PII is sent. Submitting store URLs to search engines is the explicit purpose of the app.

### Anthropic API (AI SEO Generation)

When a merchant uses the AI SEO generation feature, the app sends the following data to the Anthropic API:

- Product title
- Product description (body HTML)
- Current SEO fields (meta title, meta description, if present)

No customer PII is sent. Only merchant-controlled product content is included in these API requests. AI generation is only triggered when a merchant explicitly requests it from within the app.

The Anthropic API is used on all plans (with credit limits). Merchants using AI SEO features consent to this data processing when they initiate a generation request.

### Infrastructure Providers

The app uses third-party infrastructure providers for hosting, database management, and application monitoring. These providers process data only to operate the app infrastructure and are bound by data processing agreements.

---

## Merchant Responsibilities

Merchants using IndexBoost SEO are responsible for:

- Ensuring they have authorization to connect the Google Search Console property associated with their Google Service Account.
- Managing their Google Cloud credentials, including revoking and rotating keys when needed.
- Reviewing Shopify access scopes when installing the app.
- Understanding that submitting URLs to Google via the Indexing API is subject to Google's eligibility requirements, quota limits, and approval processes.

---

## Data Processing Agreement

A Data Processing Agreement (DPA) is available on request for merchants who require one for GDPR compliance purposes.

**Contact:** thuanvd@syn-gr.com

---

## Contact

For data privacy requests, GDPR inquiries, or to request a Data Processing Agreement:

**Email:** thuanvd@syn-gr.com

Data subject access requests or deletion requests submitted via this email will be processed within 30 days.
