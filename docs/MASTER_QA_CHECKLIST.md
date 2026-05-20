# IndexBoost SEO — Master QA Checklist

**App:** IndexBoost SEO (Shopify Embedded App)  
**Stack:** Shopify Remix + Prisma + PostgreSQL + Anthropic Claude  
**Last Updated:** 2026-05-20  
**Version:** ___  
**Tester:** ___  
**Environment:** Production / Staging / Development (circle one)  
**Test Store:** ___.myshopify.com  

---

## How to Use This Checklist

- Mark each item `[x]` when verified and passing.
- Mark `[F]` when the item fails — open a bug report (see `BUG_REPORT_TEMPLATE.md`).
- Mark `[N/A]` when an item is not applicable to the current release scope.
- Add the bug ID (e.g. `BR-20260520-001`) next to any failing item.

---

## 1. Install Flow

### 1.1 Fresh Install
- [ ] App install URL (`/auth?shop=xxx.myshopify.com`) redirects to Shopify OAuth consent screen
- [ ] Merchant is shown the correct permission scopes requested
- [ ] After approval, merchant is redirected back to the embedded app inside Shopify Admin
- [ ] A new `Session` record is created in the database for the shop
- [ ] A new `Shop` record is created in the database with `plan = FREE`
- [ ] Default settings are created (IndexNow key auto-generated, empty Google credentials)
- [ ] IndexNow key file is accessible at `/apps/indexboost/{key}.txt` and returns the key value
- [ ] Onboarding / welcome screen is shown on first install
- [ ] All mandatory webhooks are registered automatically at install time
- [ ] App nav menu renders correctly on first load

### 1.2 Re-install After Uninstall
- [ ] Merchant who previously uninstalled can re-install via the App Store
- [ ] OAuth flow completes without error
- [ ] Previous shop data (if not redacted) is restored or a fresh record is created (confirm expected behavior)
- [ ] New session token is stored; old/invalid session is replaced
- [ ] Webhooks are re-registered successfully
- [ ] IndexNow key is re-generated or previous key is restored (confirm expected behavior)
- [ ] Plan resets to FREE on re-install (or restores last active plan — confirm expected behavior)

---

## 2. OAuth Flow

### 2.1 New Merchant
- [ ] `GET /auth` with valid `shop` query param initiates OAuth
- [ ] Missing or malformed `shop` param returns a meaningful error
- [ ] Invalid shop domain (non-.myshopify.com) is rejected
- [ ] OAuth state parameter is used and validated to prevent CSRF
- [ ] Callback at `/auth/callback` validates the HMAC signature from Shopify
- [ ] Access token is stored securely in the database (not in a cookie or localStorage)
- [ ] Merchant is not prompted to re-authenticate on subsequent page loads within the same session

### 2.2 Token Refresh / Session Expiry
- [ ] An expired or invalid session triggers a redirect to `/auth` (not a blank page or 500 error)
- [ ] After re-auth, merchant is returned to the page they were on (or app home)
- [ ] Concurrent requests during re-auth do not create duplicate session records

### 2.3 Re-Auth Flow
- [ ] Simulating a revoked token (delete session from DB) causes graceful redirect to OAuth
- [ ] Re-auth completes without duplicate shop records being created
- [ ] Post re-auth, all features (billing, webhooks, AI) function normally

---

## 3. Billing Flow

### 3.1 Upgrade Free → Pro
- [ ] "Upgrade to Pro" button is visible on Free plan
- [ ] Clicking upgrade initiates a Shopify subscription charge (redirects to Shopify billing confirmation)
- [ ] Merchant approves the charge on the Shopify billing confirmation page
- [ ] Billing return URL is called by Shopify after approval
- [ ] Shop plan in DB is updated to `PRO` after successful charge
- [ ] Pro features are immediately unlocked after upgrade (no page reload required beyond redirect)
- [ ] Monthly price shown to merchant matches $9.95/mo
- [ ] Test mode works correctly (`SHOPIFY_BILLING_TEST=true` in staging)

### 3.2 Upgrade Pro → Business
- [ ] Merchant on Pro plan can see "Upgrade to Business" option
- [ ] Upgrading creates a new Shopify subscription (or upgrades existing — confirm expected behavior)
- [ ] Previous Pro subscription is cancelled on upgrade
- [ ] Shop plan in DB is updated to `BUSINESS`
- [ ] Business-only features unlock immediately (Image Alt AI, Index Health Check, Email Alerts)
- [ ] Monthly price shown matches $19.95/mo

### 3.3 Downgrade
- [ ] Merchant on Business can downgrade to Pro
- [ ] Merchant on Pro can downgrade to Free
- [ ] Business-only features are gated after downgrade to Pro
- [ ] Pro features are gated after downgrade to Free
- [ ] Downgrade takes effect at the end of the current billing cycle (or immediately — confirm expected behavior)
- [ ] Data created under a higher plan is not deleted (only access is restricted)

### 3.4 Cancel Subscription
- [ ] Merchant can cancel their subscription from the billing settings
- [ ] Cancellation triggers the Shopify subscription cancellation API
- [ ] Shop plan in DB is set back to `FREE` after cancellation
- [ ] Free plan feature limits are enforced after cancellation

### 3.5 Billing Callback
- [ ] Billing return URL (`/billing/callback` or equivalent) handles `charge_id` parameter
- [ ] Invalid or tampered `charge_id` is rejected
- [ ] Successful callback updates plan in DB atomically
- [ ] Failed payment (declined card) is handled gracefully — merchant sees error, plan stays unchanged

---

## 4. Product / Collection / Page / Article Sync via Webhooks

### 4.1 Products
- [ ] `products/create` webhook is received, HMAC validated, and a queue job is created
- [ ] `products/update` webhook triggers a queue job for re-indexing
- [ ] `products/delete` webhook triggers de-indexing or queue job cancellation
- [ ] Duplicate webhook deliveries (same event ID) are handled idempotently

### 4.2 Collections
- [ ] `collections/create` webhook creates a queue job
- [ ] `collections/update` webhook creates a queue job
- [ ] `collections/delete` webhook handles de-indexing

### 4.3 Pages
- [ ] `pages/create` webhook creates a queue job
- [ ] `pages/update` webhook creates a queue job
- [ ] `pages/delete` webhook handles de-indexing

### 4.4 Articles
- [ ] `articles/create` webhook creates a queue job
- [ ] `articles/update` webhook creates a queue job
- [ ] `articles/delete` webhook handles de-indexing

### 4.5 General Webhook Behavior
- [ ] All webhooks return HTTP 200 within 5 seconds (Shopify timeout requirement)
- [ ] Webhook processing is async (job is queued, not processed synchronously in the webhook handler)
- [ ] HMAC validation failure returns 401 and does not create a queue job
- [ ] Webhook handler does not crash on malformed payload

---

## 5. AI SEO Generation

### 5.1 Single Resource Generation
- [ ] "Generate SEO" button works on a single product/page/article
- [ ] Request is sent to Anthropic Claude (claude-haiku-4-5-20251001)
- [ ] Generated title and description are displayed in a preview before applying
- [ ] Merchant can edit the generated content before saving
- [ ] Saving applies the meta title and description to the resource via Shopify API
- [ ] Success toast/notification shown after applying
- [ ] Error state shown if Anthropic API call fails

### 5.2 Bulk Preview
- [ ] Bulk AI SEO generation works for multiple resources simultaneously (Pro/Business plans)
- [ ] Progress indicator shown during bulk generation
- [ ] Results displayed as a preview list before applying
- [ ] Merchant can select/deselect individual items before bulk apply
- [ ] Partial failures (some items fail, others succeed) are handled gracefully

### 5.3 Apply
- [ ] Applying bulk results saves each item via Shopify API
- [ ] Applied items are marked as completed
- [ ] Failed items remain in a retry state
- [ ] Already-applied items cannot be re-applied without regenerating

### 5.4 Plan Gating
- [ ] Free plan: AI SEO generation is limited or blocked (confirm expected limit)
- [ ] Pro plan: AI SEO generation is available
- [ ] Business plan: AI SEO generation is available with additional features

---

## 6. Queue Jobs

### 6.1 Process Queue
- [ ] Queue worker processes pending jobs
- [ ] Jobs are dequeued in the correct order (FIFO or priority — confirm expected behavior)
- [ ] Completed jobs are marked with status `DONE` or equivalent
- [ ] Queue status is visible on the logs/queue page in the app

### 6.2 Retry Logic
- [ ] Failed jobs are retried with exponential backoff
- [ ] Retry intervals increase correctly (e.g. 1m, 5m, 15m, 60m)
- [ ] Maximum retry attempts are enforced (after max attempts, job is marked `FAILED_PERMANENT`)
- [ ] Permanently failed jobs appear in the logs with failure reason

### 6.3 Daily Quota Reset
- [ ] Google Indexing API daily quota counter resets at midnight UTC (or per-shop — confirm)
- [ ] After quota reset, queued jobs resume processing automatically
- [ ] Quota exhaustion is logged clearly and visible in the app logs page

### 6.4 Concurrency
- [ ] Multiple shops' queues do not interfere with each other
- [ ] Concurrent job processing does not cause duplicate indexing submissions

---

## 7. Multi-language / Internationalization

- [N/A] **No explicit i18n implementation exists in the current version.** App UI is English-only.
- [N/A] Shopify admin locale is not forwarded to change app UI language.
- [ ] **TODO (future):** Add i18n support. Document as a known limitation in the app store listing if required by Shopify review.

---

## 8. Embedded App UX

### 8.1 Polaris Consistency
- [ ] All pages use Polaris components (no custom unstyled HTML elements)
- [ ] Page layouts follow Shopify Polaris design guidelines
- [ ] Loading states use Polaris `Spinner` or `SkeletonPage`
- [ ] Error states use Polaris `Banner` with `status="critical"`
- [ ] Success feedback uses Polaris `Toast` or `Banner` with `status="success"`
- [ ] Forms use Polaris `Form`, `FormLayout`, `TextField`, etc.

### 8.2 App Bridge
- [ ] App Bridge is initialized correctly with the correct API key and host
- [ ] Navigation does not cause a full page reload (uses App Bridge routing)
- [ ] Modal dialogs use App Bridge `Modal` (not browser `alert`/`confirm`)
- [ ] Redirect to Shopify Admin sections uses App Bridge `Redirect`
- [ ] Session token is fetched via App Bridge and sent with API requests

### 8.3 NavMenu
- [ ] Navigation menu renders all expected links (Dashboard, Products, Settings, Logs, etc.)
- [ ] Active nav item is highlighted correctly based on current route
- [ ] Navigation links work correctly (no 404s)
- [ ] NavMenu is accessible (keyboard navigation works)

---

## 9. Mobile Shopify Admin Usability

- [ ] App loads correctly in Shopify mobile admin (iOS and Android)
- [ ] All pages are scrollable without horizontal overflow
- [ ] Buttons and tap targets are at least 44x44px (touch-friendly)
- [ ] Tables/lists adapt to narrow screens (no critical content clipped)
- [ ] Forms are usable on mobile (keyboard does not obscure inputs)
- [ ] Bulk actions are usable on mobile (checkboxes/select-all reachable)
- [ ] No critical features are inaccessible on mobile (all navigation items reachable)

---

## 10. Uninstall Flow

- [ ] `app/uninstalled` webhook is received and HMAC validated
- [ ] Shop session is deleted from the database
- [ ] Active Shopify subscription is cancelled on uninstall
- [ ] Queue jobs for the shop are cancelled or cleaned up
- [ ] Shop data cleanup is complete (confirm what is deleted vs. retained per privacy policy)
- [ ] After uninstall, the shop cannot make authenticated API calls (session rejected)
- [ ] Re-install after uninstall works correctly (see section 1.2)

---

## 11. GDPR Flow

### 11.1 customers/data_request
- [ ] `customers/data_request` webhook is registered in `shopify.app.toml`
- [ ] Webhook receives POST, validates HMAC, returns HTTP 200
- [ ] App responds with a confirmation that no customer PII is stored (or exports the data if it is)
- [ ] Handler does not throw an unhandled exception

### 11.2 customers/redact
- [ ] `customers/redact` webhook is registered in `shopify.app.toml`
- [ ] Webhook receives POST, validates HMAC, returns HTTP 200
- [ ] Any customer-associated data is deleted from the database
- [ ] Handler completes within Shopify's timeout requirement

### 11.3 shop/redact
- [ ] `shop/redact` webhook is registered in `shopify.app.toml`
- [ ] Webhook receives POST, validates HMAC, returns HTTP 200
- [ ] All shop data is deleted from the database (sessions, settings, queue jobs, logs, credentials)
- [ ] Handler completes within Shopify's timeout requirement
- [ ] Redacted shop cannot re-authenticate without a fresh install

---

## 12. Webhook Flow

### 12.1 HMAC Validation
- [ ] All webhook handlers validate the `X-Shopify-Hmac-Sha256` header using the Shopify library
- [ ] Requests with missing HMAC header are rejected (HTTP 401)
- [ ] Requests with invalid HMAC signature are rejected (HTTP 401)
- [ ] Valid requests are processed correctly

### 12.2 Idempotency
- [ ] Shopify may deliver the same webhook event more than once; duplicate deliveries do not create duplicate queue jobs
- [ ] Idempotency key or event ID is checked before processing
- [ ] Already-processed events are acknowledged with HTTP 200 without re-processing

### 12.3 Retry / Failure Handling
- [ ] Webhook handler returns HTTP 200 within 5 seconds (Shopify will retry if not)
- [ ] Heavy processing is offloaded to the async queue (not done inline in the webhook handler)
- [ ] If the queue is unavailable, the webhook still returns 200 and logs the failure for later recovery

---

## 13. Error Handling

### 13.1 Network Errors
- [ ] Network timeout when calling Shopify API is caught and retried
- [ ] Network timeout when calling Google Indexing API is caught and the job is re-queued
- [ ] Network timeout when calling Anthropic API shows a user-friendly error in the UI

### 13.2 Invalid / Expired Credentials
- [ ] Expired Google credentials trigger re-auth prompt (or show a clear error with a fix link)
- [ ] Missing Google credentials show a clear setup prompt, not a raw error
- [ ] Invalid Anthropic API key (if configurable) shows a clear error

### 13.3 API Failures
- [ ] Shopify API rate limit (429) is handled with backoff and retry
- [ ] Google Indexing API quota exhaustion (429) is logged and queue is paused for that shop
- [ ] Anthropic API 5xx errors are retried; persistent failures show a user-facing error
- [ ] Database connection failure shows a 503 page, not a 500 stack trace

### 13.4 Error Boundaries
- [ ] React error boundary is in place for the embedded app
- [ ] Unexpected JS errors show a Polaris-styled error page, not a blank white screen
- [ ] Error details are logged server-side (not exposed to the merchant)

---

## 14. Large Store Testing

- [ ] Store with 100+ products can initiate bulk indexing without timeout
- [ ] Bulk indexing jobs are queued correctly (not processed synchronously)
- [ ] Queue processes large batches without memory issues
- [ ] Logs page loads and paginates correctly with 1000+ log entries
- [ ] Dashboard metrics (total indexed, pending, failed) are correct for large stores
- [ ] Webhook volume from a large store (many rapid product updates) does not overwhelm the queue

---

## 15. Retry Testing

- [ ] First retry occurs after the expected delay (e.g. ~1 minute)
- [ ] Second retry occurs after double the delay (exponential backoff)
- [ ] After maximum retry attempts, job status is set to permanent failure (no further retries)
- [ ] Permanent failures are visible in the logs with the failure reason and attempt count
- [ ] Manual retry of a permanently failed job is possible from the UI (if supported — confirm)

---

## 16. Failure Recovery

### 16.1 Google Quota Exhaustion
- [ ] When the Google Indexing API daily quota is exhausted, remaining queue jobs are paused (not dropped)
- [ ] A clear warning is shown in the app logs/dashboard that quota is exhausted
- [ ] Jobs resume automatically after quota resets (next UTC day)
- [ ] No jobs are permanently lost due to quota exhaustion

### 16.2 IndexNow Key Verification Failure
- [ ] If IndexNow key verification fails, the failure is logged clearly
- [ ] Merchant is shown a clear error message explaining the key file must be accessible
- [ ] Merchant can regenerate a new IndexNow key from settings
- [ ] After regeneration, the new key file is served at `/apps/indexboost/{newkey}.txt`
- [ ] The old key file URL stops serving after key regeneration

---

## 17. Settings Page

- [ ] Settings page loads without errors
- [ ] Google credentials (client ID, client secret, refresh token or service account JSON) can be saved
- [ ] Saving Google credentials validates the input format before storing
- [ ] Saved credentials are not displayed in plaintext after saving (masked)
- [ ] Google credentials can be cleared/reset
- [ ] IndexNow key is displayed on the settings page
- [ ] "Regenerate IndexNow Key" action works and updates the key in DB and the key file URL
- [ ] Changes to settings are persisted across page reloads
- [ ] Invalid inputs show inline validation errors (not just a generic toast)

---

## 18. Logs Page

- [ ] Logs page loads and displays recent indexing activity
- [ ] Logs can be filtered by status (pending, success, failed, all)
- [ ] Logs can be filtered by resource type (product, collection, page, article)
- [ ] Logs are paginated (not loading all records at once)
- [ ] Pagination controls (next/previous) work correctly
- [ ] Log entry shows: URL indexed, submission engine (Google/IndexNow), status, timestamp, attempt count
- [ ] Failed logs show the error reason
- [ ] Logs page handles 0 entries gracefully (empty state with a helpful message)

---

## 19. Plan Feature Gating

### 19.1 Free Plan
- [ ] Bulk indexing is limited or blocked on Free plan
- [ ] AI SEO generation is limited or blocked on Free plan
- [ ] Broken link scanner is available or restricted (confirm expected limit per plan)
- [ ] An upgrade prompt is shown when a gated feature is accessed

### 19.2 Pro Plan ($9.95/mo)
- [ ] All Pro features are accessible
- [ ] Business-only features (Image Alt AI, Index Health Check, Email Alerts) are blocked with an upgrade prompt

### 19.3 Business Plan ($19.95/mo)
- [ ] Image Alt Text AI suggestions are available and functional
- [ ] Index Health Check is available and functional
- [ ] Email Alerts are available and configurable
- [ ] No features are blocked (full access)

### 19.4 Server-Side Enforcement
- [ ] Plan checks are enforced on the server/API side (not only in the UI)
- [ ] A Free plan merchant cannot trigger Pro/Business actions by calling the API directly
- [ ] A Pro plan merchant cannot trigger Business-only actions by calling the API directly

---

## 20. Security

### 20.1 HMAC Validation
- [ ] All Shopify webhook endpoints validate HMAC before processing
- [ ] All OAuth callback endpoints validate HMAC/state before trusting parameters
- [ ] Webhook endpoints are not publicly triggerable without a valid Shopify signature

### 20.2 Plan Enforcement on Actions
- [ ] Every server-side action checks the shop's current plan from the database (not from a client-sent parameter)
- [ ] Plan parameter is never accepted from the client/request body for authorization decisions
- [ ] Downgraded merchants cannot access higher-tier features even if they retain UI state from a previous session

### 20.3 Credential Security
- [ ] Google OAuth credentials are stored in PostgreSQL, not in environment variables or flat files per-shop
- [ ] Credentials are not logged to stdout/stderr
- [ ] No secrets are committed to the git repository (verify with `git grep`)

### 20.4 Session Security
- [ ] Session tokens are validated on every authenticated request
- [ ] Cross-shop session leakage is not possible (one shop's session cannot access another shop's data)
- [ ] App does not trust `shop` parameter from query string for data access — uses authenticated session

---

## Sign-off

| Area                        | Tester | Date       | Status (Pass/Fail/Partial) | Notes |
|-----------------------------|--------|------------|----------------------------|-------|
| Install Flow                |        |            |                            |       |
| OAuth Flow                  |        |            |                            |       |
| Billing Flow                |        |            |                            |       |
| Webhook Sync                |        |            |                            |       |
| AI SEO Generation           |        |            |                            |       |
| Queue Jobs                  |        |            |                            |       |
| Embedded App UX             |        |            |                            |       |
| Mobile Usability            |        |            |                            |       |
| Uninstall Flow              |        |            |                            |       |
| GDPR Flow                   |        |            |                            |       |
| Webhook Flow                |        |            |                            |       |
| Error Handling              |        |            |                            |       |
| Large Store Testing         |        |            |                            |       |
| Retry Testing               |        |            |                            |       |
| Failure Recovery            |        |            |                            |       |
| Settings Page               |        |            |                            |       |
| Logs Page                   |        |            |                            |       |
| Plan Feature Gating         |        |            |                            |       |
| Security                    |        |            |                            |       |

**Overall QA Sign-off:** ___  
**Release Approved By:** ___  
**Date:** ___
