# IndexBoost SEO - Privacy Policy Draft

Last updated: May 15, 2026

IndexBoost SEO helps Shopify merchants submit store URLs to search engines and manage lightweight technical SEO workflows. This draft explains what data the app collects, how it is used, and how it is deleted.

## Data We Collect

### Shopify Store Information

We collect basic Shopify store information required to install and operate the app, including:

- Shop domain.
- Shopify shop identifier.
- App installation/session information.
- Selected app settings.
- Current app plan and billing status.

### Shopify Access Token

When a merchant installs the app, Shopify provides an access token. We use this token to call Shopify Admin APIs for app features such as reading products, reading pages, reading collections, updating SEO fields, managing redirects, and processing webhooks.

We do not sell or share Shopify access tokens.

### Google Service Account JSON

If a merchant chooses to connect Google Indexing API, the merchant may upload a Google Service Account JSON key.

We use this credential only to authenticate with Google Indexing API for that merchant's store. The credential is required for Google URL submission workflows.

Merchants are responsible for creating the Google Service Account, enabling the required Google API, and adding the service account email to the relevant Google Search Console property.

Google controls Indexing API eligibility, quota, approval, and acceptance. Connecting credentials does not guarantee that Google will accept, crawl, index, or rank any submitted URL.

### URLs and Submission Logs

We store URL submission activity, including:

- Submitted URL.
- Content type, such as product, collection, page, or blog post.
- Search engine target, such as Google or IndexNow.
- Submission action, such as update or delete.
- Submission status.
- Error messages returned by Google, IndexNow, or other services.
- Timestamp.

These logs help merchants understand what was submitted and troubleshoot failed submissions.

### Billing Status

We store app plan and billing status, including:

- Current plan: Free, Pro, or Business.
- Billing status.
- Shopify subscription ID, when applicable.

Billing is processed through Shopify Billing API.

### AI Provider Data

If AI SEO generation is enabled, product titles and product descriptions may be sent to the configured AI provider only to generate merchant-requested SEO text. The current app code uses `ANTHROPIC_API_KEY` for AI SEO generation. Image SEO alt text suggestions are generated from product metadata unless the app is later configured to use an external AI provider for that workflow.

## How We Use Data

We use collected data to:

- Authenticate the app with Shopify.
- Provide dashboard, settings, and app functionality.
- Submit URLs to Google Indexing API and IndexNow.
- Process indexing queues and retries.
- Display submission logs and error messages.
- Enforce plan limits and feature access.
- Provide technical SEO tools requested by the merchant.
- Generate AI SEO text when requested by the merchant and when an AI provider key is configured.
- Support app troubleshooting and merchant support.

## Data Sharing

We do not sell merchant data.

We may send URL submission data to search engines as part of app functionality:

- Google Indexing API, when the merchant connects Google credentials.
- IndexNow-compatible endpoints, when IndexNow submission is enabled.

We may use infrastructure providers for hosting, database storage, monitoring, and email alerts. These providers process data only as needed to operate the app.

If AI SEO generation is enabled, relevant product text may be sent to the configured AI provider to return generated SEO copy.

## Data Deletion on Uninstall

When a merchant uninstalls the app, Shopify sends an `app/uninstalled` webhook. After receiving this webhook, IndexBoost SEO deletes the shop record and related app data, including:

- Shopify session data.
- Stored Shopify access token.
- Google Service Account JSON.
- App settings.
- Queue items.
- Submission logs.

Some limited records may be retained only if required for legal, billing, fraud prevention, or compliance reasons.

## Security

We use reasonable technical safeguards to protect stored data and credentials. Merchants should protect their Google Service Account JSON and revoke it in Google Cloud Console if they believe it has been exposed.

## Merchant Responsibilities

Merchants are responsible for:

- Ensuring they have permission to connect Google Search Console properties.
- Managing Google Cloud credentials.
- Removing or rotating Google Service Account keys when needed.
- Reviewing app permissions before installation.

## Contact

For privacy or support requests, contact:

Support email: [Insert support email]

Privacy contact: [Insert privacy contact email]
