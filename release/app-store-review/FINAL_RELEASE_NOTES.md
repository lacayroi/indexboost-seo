# IndexBoost SEO — Release Notes

---

## v1.0.0

**Release date:** 2026-05-20
**API version:** Shopify 2026-04
**Platform:** Shopify Remix v2

---

### Summary

v1.0.0 is the initial public release of IndexBoost SEO. This release includes the full feature set across all three plan tiers and passes the pre-release production audit completed 2026-05-20.

---

### Features by Plan

#### Free — $0/month

- Manual URL submission to Google Indexing API and IndexNow (Bing/Yandex)
- Auto-indexing: automatically queues product, collection, page, and blog URLs when content is updated via Shopify webhooks
- Google Service Account connection with format and authentication validation
- IndexNow key auto-generation and app-proxy key verification endpoint
- Submission logs with 7-day retention
- Dashboard with submission stats and onboarding checklist
- AI SEO generation with starter credit allowance (powered by Anthropic Claude)

#### Pro — $9.95/month (everything in Free, plus)

- Bulk indexing: submit all products, collections, pages, and blog posts in one action
- Meta tags editor: edit SEO title and description for products, collections, and pages; writes back to Shopify
- Schema markup generator: generates JSON-LD structured data for products
- Sitemap generator: builds an HTML sitemap from all products, collections, and pages
- Robots.txt editor: read and edit `robots.txt.liquid` directly in the active Shopify theme
- Broken links scanner: scans product, collection, and page URLs for 404 responses
- Redirect manager: create and delete Shopify URL redirects (301 redirects)
- LLMs.txt generator: produces a machine-readable content map for AI crawlers
- SEO Audit: scans store content for missing meta titles and meta descriptions
- Submission log retention: 30 days
- Increased AI SEO generation credits

#### Business — $19.95/month (everything in Pro, plus)

- Image SEO: identifies product images missing alt text; generates AI alt text suggestions; writes alt text back to Shopify
- Index health monitoring dashboard: visual overview of submission success rates and queue health
- Email alerts: notifications for submission failures and queue processing issues
- Submission log retention: 90 days
- Maximum AI SEO generation credits

---

### Security Hardening Applied in v1.0.0

The following security measures were implemented and verified before this release:

- **Liquid injection prevention:** Robots.txt editor wraps all merchant-entered content in `{%- raw -%}...{%- endraw -%}` before writing to `robots.txt.liquid`, preventing Liquid template injection.
- **URL validation:** All URLs submitted to Google Indexing API and IndexNow are validated against the merchant's own store domain before submission. Arbitrary or external URLs are rejected.
- **Timeout guards:** All outbound API calls (Google Indexing API, IndexNow, Anthropic) have explicit timeout limits. Hung requests do not block queue processing.
- **Atomic quota enforcement:** AI credit deduction and the AI API call are handled atomically to prevent credits from being double-spent or deducted without a corresponding API call completing.
- **AI credit transaction:** AI SEO credit usage is recorded in a database transaction alongside the API call result, ensuring the credit ledger stays consistent under concurrent requests.
- **Structured logging:** All submission attempts, errors, and webhook events are logged with structured fields (shop domain, URL, status, error message, timestamp) to support debugging and audit without logging sensitive data.

---

### Known Limitations

#### Pagination ceiling for large stores

The app fetches products and collections using a fixed page size (100 products, 50 collections per request). Stores with more items than these limits will see a warning in the UI ("Showing first 100 products — your store may have more"). Full cursor-based pagination across unlimited items is planned for v1.1.

**Impact:** Affects Bulk Indexing, Meta Tags editor, Sitemap generator, LLMs.txt generator, SEO Audit, and Broken Links scanner for stores with more than 100 products or 50 collections. The warning is shown in the UI so merchants are aware.

#### Google credentials stored without encryption

Google Service Account JSON is stored as plaintext in the PostgreSQL database. The credential contains a private key. Merchants are advised to use a dedicated, minimum-privilege service account and to rotate or revoke the key on uninstall.

**Planned remediation:** Column-level encryption for `googleCredentials` is on the roadmap for v1.1.

#### Google Indexing API eligibility

The Google Indexing API is officially documented for pages containing `JobPosting` or `BroadcastEvent (in VideoObject)` structured data. Shopify product, collection, and page URLs are submitted as best-effort — Google may reject, ignore, or rate-limit submissions for non-eligible URLs. This is a Google API limitation, not an app limitation, and is disclosed to merchants in the onboarding checklist.

---

### Minimum Requirements

- A Shopify store (development stores are supported)
- A modern web browser (Chrome, Firefox, Safari, or Edge — current or one prior major version)
- For Google Indexing API features: a Google Cloud project with the Indexing API enabled and a downloaded Service Account JSON key
- For IndexNow features: a publicly accessible storefront (stores with a Shopify storefront password cannot complete IndexNow key verification)

---

### Support

**Email:** thuanvd@syn-gr.com

Bug reports, feature requests, and billing questions are handled via the support email above.
