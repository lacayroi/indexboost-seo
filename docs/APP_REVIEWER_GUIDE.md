# IndexBoost SEO - App Reviewer Guide

## App Purpose and Value Proposition

IndexBoost SEO helps Shopify merchants accelerate search engine discovery of their store content by automatically submitting URLs to Google Search via the Google Indexing API and to Bing, Yandex, and other search engines via the IndexNow protocol whenever products, collections, pages, or blog posts are created, updated, or deleted. Without this app, newly published or updated content can sit undiscovered for days or weeks until a search engine's crawler happens to revisit the store. IndexBoost SEO closes that gap by pushing URL notifications directly to search engine APIs at the moment content changes, reducing the window between publication and potential discovery.

Beyond URL submission, IndexBoost SEO includes a suite of lightweight technical SEO tools available on paid plans: a meta tags editor, schema markup generator, sitemap generator, robots.txt editor, broken link scanner, redirect manager, AI-generated SEO content using Anthropic, an LLMs.txt generator, SEO audit, image alt text management, index health monitoring, and email alerts for submission failures. These tools let merchants manage common on-page and technical SEO tasks without leaving Shopify Admin. The app earns revenue through Shopify Billing API subscriptions (Free, Pro at $9.95/month, Business at $19.95/month) and does not sell merchant data or share it with third parties beyond the search engine APIs that are the explicit purpose of the app.

---

## How to Install for Testing

1. Open the Shopify Partner Dashboard and navigate to **Apps > All apps**.
2. Locate **IndexBoost SEO** in your partner account or use the install link provided with your review request.
3. Select a development store or the store designated for review.
4. Click **Install** (or open the install URL) and review the requested permission scopes.
5. Click **Install app** in Shopify Admin to approve the scopes.
6. The app opens embedded inside Shopify Admin at `https://app.indexboostseo.com`.
7. The onboarding checklist loads automatically on the dashboard for new installs.

If you need a fresh install to re-test the onboarding flow: uninstall via **Shopify Admin > Settings > Apps and sales channels**, then reinstall using the same install URL.

---

## Development Store Credentials / Test Account Instructions

- Use a **Shopify development store** — test charges will not bill real money as long as `SHOPIFY_BILLING_TEST=true` is set in the development environment.
- The app does not require a separate login. Authentication is handled entirely through Shopify OAuth. If you can access the Shopify Admin for the development store, you can access the app.
- For testing **Google Indexing API** features, you will need a Google Service Account JSON with the Google Indexing API enabled. See the [How to Test Settings](#settings-google-credentials--indexnow-key) section below for setup steps.
- For testing **AI SEO generation**, credits are available on all plans. The feature uses the Anthropic API on the backend; no API key is required from the reviewer.
- If you encounter an authentication or session issue, uninstall and reinstall the app to reset the OAuth session.

---

## Feature-by-Feature Testing Instructions

### Dashboard (Stats and Onboarding)

1. Open the app. The dashboard loads at `/app`.
2. Verify the **onboarding checklist** is shown on a fresh install (steps include: connect Google credentials, configure IndexNow, submit first URL).
3. Verify **submission stats** (total submitted, pending queue, recent errors) display correctly after at least one submission has been made.
4. Verify the **current plan badge** shows `Free` on a new install.
5. Verify the dashboard updates stats after running a test submission.

---

### Auto-Indexing (Product Webhook → Queue → Submission)

Auto-indexing uses Shopify webhooks (`products/create`, `products/update`, `products/delete`, `collections/create`, `collections/update`, `collections/delete`) to enqueue URLs automatically when content changes.

**To test:**

1. Open **Settings** and confirm **Auto-index** is enabled for at least one submission engine (Google or IndexNow).
2. Go to **Shopify Admin > Products**.
3. Open any product and make a minor change (e.g., update the description by one character). Save.
4. Return to the app and open **Logs** or the **Dashboard**.
5. Within a few seconds, a new submission record should appear for the product URL with status `success`, `pending`, or an error if credentials are not configured.
6. Repeat with a collection update to confirm collection webhooks also enqueue URLs.

**What the flow looks like internally:**
- Shopify fires a `products/update` webhook to `/webhooks/products/create-update`.
- The app creates a `QueueItem` record.
- The queue worker picks up the item and calls the enabled submission engines.
- A `Submission` record is written with the result.

---

### Manual URL Submit

1. Navigate to **Submit URLs** (`/app/submit`).
2. Enter a valid store URL (e.g., `https://your-store.myshopify.com/products/your-product`).
3. Select submission engine(s): Google and/or IndexNow.
4. Click **Submit**.
5. Open **Logs** and confirm a submission record appears with the URL, engine, status, and timestamp.
6. If credentials are not configured, the submission should fail gracefully with a clear error message (not a 500 error).

---

### Bulk Indexing (Pro and above)

1. Upgrade to Pro or Business (see Billing section below).
2. Navigate to **Bulk Index** (`/app/bulk-index`).
3. Select content types to bulk-submit (products, collections, pages, blog posts).
4. Click **Submit All** or submit a filtered subset.
5. Confirm queue items are created for each URL.
6. Open **Logs** and confirm submission records appear.
7. On the Free plan, confirm this route shows an upgrade prompt instead of the bulk index form.

---

### AI SEO Generation (All Plans with Credits)

1. Navigate to **AI SEO** (`/app/ai-seo`).
2. Select a product from the list.
3. Click **Generate SEO** to generate a meta title and meta description.
4. Review the AI-generated content in the preview.
5. Click **Save** to write the SEO fields back to the product via the Shopify Admin API.
6. Confirm the product's SEO fields are updated in **Shopify Admin > Products > [Product] > Search engine listing**.
7. Confirm credit usage is tracked and displayed.

---

### Billing — Upgrade and Downgrade

**Prerequisites:** Confirm `SHOPIFY_BILLING_TEST=true` is set in the development environment.

**Upgrade Free → Pro:**

1. Open **Plans** (`/app/billing`).
2. Confirm the current plan shows `Free`.
3. Click **Upgrade to Pro**.
4. Shopify redirects to the hosted subscription confirmation page.
5. Approve the test charge.
6. Shopify redirects back to `/app/billing?billing_callback=1&plan=pro`.
7. Confirm success messaging appears and the plan badge updates to `Pro`.
8. Confirm Pro-only features (Bulk Index, Meta Tags, Schema, Sitemap, Robots.txt, Broken Links, Redirects, SEO Audit, LLMs.txt) are now accessible.

**Upgrade Pro → Business:**

1. From Pro, open **Plans** and click **Upgrade to Business**.
2. Approve the test charge and confirm redirect back to billing.
3. Confirm Business-only features (Image SEO, Alerts, Index Health) unlock.

**Downgrade / Cancel:**

1. Open **Plans** and click **Cancel subscription**.
2. Confirm the subscription is cancelled via Shopify Billing API.
3. Confirm the app immediately returns to the Free plan.
4. Confirm Pro and Business routes show upgrade prompts.
5. Confirm existing submission logs are not deleted.

---

### Settings — Google Credentials and IndexNow Key

**Google Indexing API setup:**

1. Open **Settings** (`/app/settings`).
2. In the **Google Indexing API** section, click **Upload Service Account JSON**.
3. Provide a valid Google Service Account JSON file (see [Google's documentation](https://developers.google.com/search/apis/indexing-api/v3/quickstart) for setup).
4. The app validates the JSON format and authenticates with Google before saving.
5. Invalid JSON or an unauthenticated service account shows a clear error message.
6. Valid credentials are saved and Google submission is enabled.

**Reviewer note on Google Indexing API limitations:** Google officially supports the Indexing API for pages with `JobPosting` or `BroadcastEvent` schema. Standard Shopify product/collection/page URLs may be submitted but Google may reject or silently ignore them. Submission attempts still produce log records regardless of Google's acceptance.

**IndexNow key:**

1. Open **Settings**. An IndexNow key is generated automatically on install.
2. Copy the verification URL shown: `https://{shop-domain}/apps/indexboost/{key}.txt`.
3. Open the verification URL in a browser.
4. Confirm it returns a plain text response containing the key value.
5. Confirm the storefront does not redirect to a password page (this would block IndexNow verification).

---

### Meta Tags Editor

1. Upgrade to Pro or Business.
2. Navigate to **Meta Tags** (`/app/meta-tags`).
3. Select a product, collection, or page.
4. Edit the SEO title and meta description.
5. Click **Save**.
6. Confirm the updated meta fields are reflected in the Shopify Admin product/page SEO section.

---

### Schema Generator

1. Upgrade to Pro or Business.
2. Navigate to **Schema** (`/app/schema`).
3. Select a product or page.
4. Choose a schema type (e.g., Product, Article, Organization).
5. Generate and review the schema JSON-LD output.
6. Save the schema to the applicable resource.

---

### Sitemap

1. Upgrade to Pro or Business.
2. Navigate to **Sitemap** (`/app/sitemap`).
3. Confirm the sitemap generator lists store URLs (products, collections, pages, blog posts).
4. Generate the sitemap and review the XML output.
5. Confirm the sitemap URL is displayed and accessible.

---

### Robots.txt Editor

1. Upgrade to Pro or Business.
2. Navigate to **Robots.txt** (`/app/robots-txt`).
3. Review the current `robots.txt.liquid` content from the active theme.
4. Make an edit (e.g., add a `Disallow` or comment line).
5. Click **Save**.
6. Confirm the change is written to the active theme's `robots.txt.liquid` file via the Shopify Theme API.
7. Open `https://{shop-domain}/robots.txt` in a browser to confirm the live robots.txt reflects the change.

---

### Broken Links Scanner

1. Upgrade to Pro or Business.
2. Navigate to **Broken Links** (`/app/broken-links`).
3. Click **Scan**.
4. The scanner checks store navigation links and content URLs for 404 responses.
5. Review the results list. Each entry should show the URL, HTTP status, and the source location.
6. For any broken link found, confirm a **Fix** or **Redirect** option is available.

---

### Redirect Manager

1. Upgrade to Pro or Business.
2. Navigate to **Redirects** (`/app/redirects`).
3. Click **Add Redirect**.
4. Enter a source path (e.g., `/old-product`) and target URL (e.g., `/products/new-product`).
5. Save. Confirm the redirect appears in the list.
6. Test the redirect in a browser (note: Shopify online store redirects apply to the storefront domain, not the app URL).
7. Delete a redirect and confirm it is removed.

---

### LLMs.txt

1. Upgrade to Pro or Business.
2. Navigate to **LLMs.txt** (`/app/llms-txt`).
3. The app generates an `llms.txt` file describing store content for LLM crawlers.
4. Review the generated content and confirm it reflects store products, pages, and collections.
5. Confirm the file is accessible at the expected storefront path.

---

### SEO Audit

1. Upgrade to Pro or Business.
2. Navigate to **SEO Audit** (`/app/seo-audit`).
3. Click **Run Audit**.
4. The audit checks for common issues: missing meta descriptions, short titles, missing image alt text, broken navigation links, missing schema, etc.
5. Review the audit report. Each issue should list the affected resource and a recommended fix.
6. Address one issue via the recommended tool and re-run the audit to confirm the issue clears.

---

### Image Alt Text (Business Plan)

1. Upgrade to Business.
2. Navigate to **Image SEO** (`/app/image-seo`).
3. Products with images that have missing or empty alt text are listed.
4. Select a product and click **Generate Alt Text** to produce an AI-suggested alt text from product metadata.
5. Review and edit the suggestion if needed.
6. Click **Save** to write the alt text back to the product image via the Shopify Admin API.
7. On Free or Pro, confirm this route shows a Business upgrade prompt.

---

### Index Health (Business Plan)

1. Upgrade to Business.
2. Navigate to **Index Health** (`/app/index-health`).
3. The dashboard shows submission success rates, error breakdown by engine, and recent submission history.
4. Confirm data displays correctly after at least one submission has been logged.
5. On Free or Pro, confirm this route shows a Business upgrade prompt.

---

### Alerts

1. Upgrade to Business.
2. Navigate to **Alerts** (`/app/alerts`).
3. Configure an alert email address and select alert conditions (e.g., submission failures, queue backlog).
4. Save. Confirm the alert configuration is stored.
5. Trigger a submission failure by providing an invalid URL or revoking Google credentials temporarily, then submit a URL.
6. Confirm an alert email is sent to the configured address.
7. On Free or Pro, confirm this route shows a Business upgrade prompt.

---

### Logs

1. Navigate to **Logs** (`/app/logs`).
2. Confirm submission records are listed with: URL, content type, search engine, status (success/error), and timestamp.
3. Confirm the log retention limit matches the plan:
   - Free: 7 days
   - Pro: 30 days
   - Business: 90 days
4. Filter by status or engine and confirm filters work correctly.
5. Confirm that error entries include the error message returned by the search engine API.

---

## Webhook Testing Instructions

The app registers these webhooks automatically on install (configured in `shopify.app.toml`, API version `2026-04`):

| Topic | Endpoint |
|---|---|
| `app/uninstalled` | `/webhooks/app/uninstalled` |
| `app/scopes_update` | `/webhooks/app/scopes_update` |
| `products/create` | `/webhooks/products/create-update` |
| `products/update` | `/webhooks/products/create-update` |
| `products/delete` | `/webhooks/products/delete` |
| `collections/create` | `/webhooks/collections/create-update` |
| `collections/update` | `/webhooks/collections/create-update` |
| `collections/delete` | `/webhooks/collections/delete` |
| `customers/data_request` (compliance) | `/webhooks/customers/data_request` |
| `customers/redact` (compliance) | `/webhooks/customers/redact` |
| `shop/redact` (compliance) | `/webhooks/shop/redact` |

**To verify webhooks are registered:**

1. Open **Shopify Partner Dashboard > Apps > [IndexBoost SEO] > Webhooks**.
2. Confirm the above topics are registered against `https://app.indexboostseo.com/webhooks/*`.

**To test `products/update` webhook:**

1. Edit and save any product in Shopify Admin.
2. Open the app **Logs** and confirm a new queue item and submission record appear within seconds.

**To test `app/uninstalled` cleanup:**

1. Confirm the shop has submission records and queue items.
2. Uninstall the app from **Shopify Admin > Settings > Apps and sales channels**.
3. Inspect the database (or ask the developer to confirm): `Session`, `QueueItem`, `Submission`, and `Shop` records for the store domain must be deleted.

---

## GDPR Compliance Verification

The app implements all three Shopify mandatory GDPR compliance webhooks:

| Webhook | Endpoint | Expected Behavior |
|---|---|---|
| `customers/data_request` | `/webhooks/customers/data_request` | Returns HTTP 200. Message: "No customer data stored." The app stores no customer PII. |
| `customers/redact` | `/webhooks/customers/redact` | Returns HTTP 200. Message: "No customer data stored." No customer records to delete. |
| `shop/redact` | `/webhooks/shop/redact` | Deletes all records for the shop: Shop, Session, QueueItem, Submission. |

**To verify GDPR webhooks:**

1. Open **Shopify Partner Dashboard > Apps > [IndexBoost SEO] > GDPR webhooks**.
2. Use Shopify's built-in compliance webhook tester to send a test payload to each endpoint.
3. Confirm each returns HTTP 200.
4. For `shop/redact`, confirm the app deletes all associated shop data from the database.

**What the app stores (merchant/shop data only — no customer PII):**

- Shop domain and Shopify shop identifier
- Shopify access token (offline session)
- App settings (plan, IndexNow key, Google credentials)
- Submission log records (URL, timestamp, engine, status)
- Queue items (URL, content type)

**What the app does NOT store:** customer names, email addresses, physical addresses, order details, payment information, or any other customer PII.

---

## Known Limitations

1. **Google Indexing API requires merchant-provided credentials.** The app does not include a shared Google OAuth client for merchant submissions. Each merchant must create their own Google Cloud project, enable the Google Indexing API, create a Service Account, download the JSON key, add the service account email as a Search Console property owner, and upload the JSON to the app Settings page. Google officially supports the Indexing API only for pages with `JobPosting` or `BroadcastEvent` schema; submissions for standard Shopify URLs (products, collections, pages, blog posts) may be accepted, rejected, or silently ignored by Google.

2. **IndexNow key verification requires an accessible storefront.** The IndexNow key file is served via the Shopify App Proxy at `https://{shop-domain}/apps/indexboost/{key}.txt`. Development stores with storefront password protection enabled will block this URL from returning the key file, which will cause IndexNow verification to fail. Disable the storefront password during IndexNow testing.

3. **Bulk indexing and Pro/Business tools are locked on the Free plan.** These features show an upgrade prompt rather than an error.

4. **Log retention varies by plan.** Logs older than the plan limit (7 days Free, 30 days Pro, 90 days Business) are purged automatically.

5. **Google Service Account JSON is stored in the database.** At the time of submission, credentials are stored as plaintext in the database column. Encryption at rest is on the roadmap. Merchants should be aware of this limitation and revoke/rotate their service account key if they uninstall or suspect exposure.

---

## Reviewer Contact

For questions about this app or the review process, contact:

**Developer email:** thuanvd@syn-gr.com

Please include your store domain or review ID in the subject line so questions can be answered quickly.
