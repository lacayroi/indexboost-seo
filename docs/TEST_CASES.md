# IndexBoost SEO — Test Cases

**App:** IndexBoost SEO (Shopify Embedded App)  
**Last Updated:** 2026-05-20  
**Total Test Cases:** 30  
**Tester:** ___  
**Environment:** Production / Staging / Development (circle one)  
**Test Store:** ___.myshopify.com  

---

## Test Case Index

| ID | Title | Severity | Area |
|----|-------|----------|------|
| TC-001 | Fresh App Install via Shopify App Store | Critical | Install |
| TC-002 | OAuth Flow — New Merchant Authorization | Critical | OAuth |
| TC-003 | Re-Auth Flow After Session Expiry | Critical | OAuth |
| TC-004 | Billing Upgrade Free to Pro | Critical | Billing |
| TC-005 | Billing Upgrade Pro to Business | Critical | Billing |
| TC-006 | Billing Cancel Subscription | High | Billing |
| TC-007 | Webhook — Product Create Triggers Queue Job | Critical | Webhooks |
| TC-008 | Webhook — App Uninstalled Cleans Up Shop Data | Critical | Webhooks |
| TC-009 | Queue Processing — Job Executes Successfully | Critical | Queue |
| TC-010 | Queue Processing — Retry with Exponential Backoff | High | Queue |
| TC-011 | Bulk Indexing — 50+ Products | High | Queue |
| TC-012 | AI SEO Generation — Single Product | High | AI SEO |
| TC-013 | AI SEO Generation — Bulk Preview and Apply | High | AI SEO |
| TC-014 | Google Credentials Save in Settings | Critical | Settings |
| TC-015 | IndexNow Key Verification | High | Settings |
| TC-016 | Plan Guard — Free Plan Cannot Access Pro Feature | Critical | Plan Gating |
| TC-017 | Plan Guard — Pro Plan Cannot Access Business Feature | Critical | Plan Gating |
| TC-018 | GDPR — customers/data_request Webhook | Critical | GDPR |
| TC-019 | GDPR — shop/redact Webhook Deletes All Shop Data | Critical | GDPR |
| TC-020 | Robots.txt Editor — Save and Serve | High | Features |
| TC-021 | XML Sitemap Generation | High | Features |
| TC-022 | Broken Links Scanner | Medium | Features |
| TC-023 | Redirect Manager — Add and Verify Redirect | Medium | Features |
| TC-024 | Index Health Check (Business Plan) | High | Features |
| TC-025 | Email Alerts Configuration (Business Plan) | Medium | Features |
| TC-026 | Logs Page — Filtering and Pagination | Medium | Logs |
| TC-027 | Mobile Shopify Admin — Core Navigation | Medium | Mobile |
| TC-028 | Error Boundary — Handles Unexpected JS Error | Medium | Error Handling |
| TC-029 | GDPR — customers/redact Webhook | Critical | GDPR |
| TC-030 | Webhook HMAC Validation Rejects Tampered Request | Critical | Security |

---

## Test Cases

---

### TC-001: Fresh App Install via Shopify App Store

**Severity:** Critical  
**Area:** Install  
**Pass / Fail:** ___

**Preconditions:**
- A Shopify development store exists that has never installed IndexBoost SEO.
- The app is deployed and the install URL is accessible.
- No existing `Session` or `Shop` DB record for this store.

**Steps:**
1. Navigate to the Shopify App Store listing for IndexBoost SEO (or use the install URL: `https://{app-domain}/auth?shop={store}.myshopify.com`).
2. Click "Add app" / "Install".
3. Review the requested permission scopes on the Shopify OAuth consent screen.
4. Click "Install app" to approve.
5. Observe the redirect back to the app inside Shopify Admin.
6. Check the database for a new `Session` record for the store.
7. Check the database for a new `Shop` record with `plan = FREE`.
8. Access `https://{app-domain}/apps/indexboost/{key}.txt` where `{key}` is the auto-generated IndexNow key from the DB.
9. Verify the webhooks panel in the Shopify Partner Dashboard for this store.

**Expected Result:**
- Merchant is redirected to the embedded app inside Shopify Admin after install.
- `Session` and `Shop` records exist in the DB.
- `Shop.plan` is `FREE`.
- An IndexNow key is auto-generated and stored in the DB.
- The key file endpoint returns the key string as plain text.
- All mandatory webhooks are registered (products/create, products/update, products/delete, collections/*, pages/*, articles/*, app/uninstalled, GDPR webhooks, etc.).
- Onboarding/welcome UI is displayed.

**Pass / Fail:** ___

---

### TC-002: OAuth Flow — New Merchant Authorization

**Severity:** Critical  
**Area:** OAuth  
**Pass / Fail:** ___

**Preconditions:**
- A Shopify development store exists.
- The app is deployed with a valid `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`.

**Steps:**
1. Navigate to `https://{app-domain}/auth?shop={store}.myshopify.com`.
2. Observe the redirect to `https://{store}.myshopify.com/admin/oauth/authorize?...`.
3. Confirm the `state` parameter is present in the OAuth authorization URL.
4. Approve the OAuth consent on the Shopify screen.
5. Observe the redirect to `/auth/callback?code=...&hmac=...&state=...&shop=...`.
6. Confirm the app validates the HMAC and state before storing the access token.
7. Confirm the merchant lands on the embedded app home page.
8. Attempt to access the app again (reload) — confirm no re-auth prompt.

**Expected Result:**
- OAuth flow completes without error.
- Access token is stored in the DB under the shop's `Session` record.
- State parameter is used (CSRF protection is active).
- HMAC on callback is validated server-side.
- Subsequent page loads do not require re-authentication.

**Pass / Fail:** ___

---

### TC-003: Re-Auth Flow After Session Expiry

**Severity:** Critical  
**Area:** OAuth  
**Pass / Fail:** ___

**Preconditions:**
- A store is installed and has a valid session.
- Tester has direct DB access or can use admin tools to invalidate the session.

**Steps:**
1. Delete (or corrupt) the `Session` record for the test store in the database.
2. Navigate to any page inside the embedded app (e.g. Dashboard or Settings).
3. Observe the behavior — the app should detect the missing/invalid session.
4. Confirm the app redirects to `/auth?shop=...` for re-authentication.
5. Complete the OAuth flow as in TC-002.
6. Confirm the merchant is returned to the app home page (or the page they requested).
7. Confirm no duplicate `Shop` records were created.
8. Confirm all features work normally post re-auth.

**Expected Result:**
- Invalid/missing session triggers a graceful redirect to OAuth (no 500 error, no blank page).
- Post re-auth, the merchant lands on the app without data loss.
- No duplicate DB records are created.
- Billing plan and settings are intact after re-auth.

**Pass / Fail:** ___

---

### TC-004: Billing Upgrade Free to Pro

**Severity:** Critical  
**Area:** Billing  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed with `plan = FREE`.
- `SHOPIFY_BILLING_TEST=true` is set in the environment (staging) or use a real development store charge in production testing.

**Steps:**
1. Navigate to the Billing / Plans page inside the embedded app.
2. Confirm the current plan shows "Free".
3. Click "Upgrade to Pro" (or equivalent CTA).
4. Confirm the app redirects to the Shopify billing confirmation page showing "$9.95/month".
5. Click "Approve" on the Shopify billing confirmation page.
6. Observe the redirect back to the app (billing return URL).
7. Check the database: `Shop.plan` should now be `PRO`.
8. Verify that Pro-only features are now accessible (e.g. bulk AI SEO generation).
9. Verify that Business-only features (e.g. Index Health Check) remain locked.

**Expected Result:**
- Shopify billing confirmation shows correct price ($9.95/mo).
- After approval, `Shop.plan` is updated to `PRO` in the DB.
- Pro features are accessible.
- Business-only features remain gated with an upgrade prompt.

**Pass / Fail:** ___

---

### TC-005: Billing Upgrade Pro to Business

**Severity:** Critical  
**Area:** Billing  
**Pass / Fail:** ___

**Preconditions:**
- Test store is on `plan = PRO` (complete TC-004 first or set directly in DB for staging).
- `SHOPIFY_BILLING_TEST=true` for staging.

**Steps:**
1. Navigate to the Billing / Plans page.
2. Confirm the current plan shows "Pro".
3. Click "Upgrade to Business".
4. Confirm Shopify billing confirmation shows "$19.95/month".
5. Approve the charge on Shopify's billing page.
6. Observe the redirect back to the app (billing return URL).
7. Check the database: `Shop.plan` should now be `BUSINESS`.
8. Confirm the previous Pro subscription is cancelled (check Shopify Partner Dashboard — subscription charges).
9. Verify Business-only features are now accessible:
   - Image Alt Text AI suggestions
   - Index Health Check
   - Email Alerts

**Expected Result:**
- `Shop.plan` is `BUSINESS` after upgrade.
- Shopify shows only one active subscription (the new Business plan).
- All Business features are accessible.

**Pass / Fail:** ___

---

### TC-006: Billing Cancel Subscription

**Severity:** High  
**Area:** Billing  
**Pass / Fail:** ___

**Preconditions:**
- Test store is on `plan = PRO` or `plan = BUSINESS`.

**Steps:**
1. Navigate to the Billing / Plans or Settings page.
2. Locate the "Cancel Subscription" or "Downgrade to Free" option.
3. Click "Cancel Subscription" and confirm the cancellation prompt.
4. Observe the confirmation message.
5. Check the database: `Shop.plan` should be set to `FREE`.
6. Attempt to access a Pro/Business-only feature.
7. Verify the feature is blocked with an upgrade prompt.
8. Confirm no error state or uncaught exception occurred.

**Expected Result:**
- Subscription is cancelled via Shopify API.
- `Shop.plan` is set to `FREE`.
- Pro/Business features are no longer accessible.
- Merchant sees a clear confirmation of cancellation.

**Pass / Fail:** ___

---

### TC-007: Webhook — Product Create Triggers Queue Job

**Severity:** Critical  
**Area:** Webhooks  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed and session is valid.
- Queue worker is running (or queue can be inspected directly in the DB).
- Google credentials or IndexNow key is configured.

**Steps:**
1. In the Shopify Admin of the test store, create a new product with a title and description.
2. Wait approximately 5–10 seconds for the webhook to be delivered.
3. Check the database for a new queue job record associated with the newly created product URL.
4. Confirm the webhook returned HTTP 200 to Shopify (check Partner Dashboard delivery log).
5. Allow the queue worker to process the job.
6. Check the queue job status is `DONE` (or equivalent).
7. Check the Logs page in the app for a successful indexing entry for the product URL.

**Expected Result:**
- `products/create` webhook is received and HMAC is validated.
- A new queue job is created in the DB for the product's URL.
- Webhook returns HTTP 200 within 5 seconds.
- Queue job is processed and marked as completed.
- Logs page shows a successful indexing entry.

**Pass / Fail:** ___

---

### TC-008: Webhook — App Uninstalled Cleans Up Shop Data

**Severity:** Critical  
**Area:** Webhooks  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed with sessions, settings, queue jobs, and logs in the DB.
- Tester can verify DB records before and after.

**Steps:**
1. Record the count of DB records for the test shop: `Session`, `Shop`, `IndexQueue` (or equivalent), `IndexLog`, `ShopSettings`.
2. Uninstall the app from the Shopify Admin (Apps > IndexBoost SEO > Delete).
3. Wait 10–15 seconds for the `app/uninstalled` webhook to be delivered.
4. Check the Partner Dashboard to confirm the webhook was delivered with status 200.
5. Query the DB for the test shop's records in all relevant tables.
6. Attempt to install the app again (verify re-install works — see TC-001).

**Expected Result:**
- `app/uninstalled` webhook is received, HMAC validated, returns HTTP 200.
- `Session` records for the shop are deleted.
- Active Shopify subscription is cancelled (if any).
- Queue jobs for the shop are deleted or cancelled.
- Shop data is cleaned up per the privacy policy.

**Pass / Fail:** ___

---

### TC-009: Queue Processing — Job Executes Successfully

**Severity:** Critical  
**Area:** Queue  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed.
- Valid Google Indexing API credentials are configured for the shop.
- At least one product exists in the store.

**Steps:**
1. Manually create a queue job in the DB (or trigger via `products/create` webhook as in TC-007).
2. Confirm the job is in `PENDING` status.
3. Trigger the queue worker (via cron, scheduled job endpoint, or manual invocation).
4. Observe the queue job status change to `PROCESSING` then `DONE`.
5. Check the Logs page to confirm the indexing entry shows `status = SUCCESS`.
6. Verify (if possible) that the URL was submitted to Google Indexing API by checking the Google Search Console or API response logs.

**Expected Result:**
- Queue job transitions: `PENDING` → `PROCESSING` → `DONE`.
- Log entry shows successful submission with engine type (Google / IndexNow).
- No unhandled exceptions during processing.

**Pass / Fail:** ___

---

### TC-010: Queue Processing — Retry with Exponential Backoff

**Severity:** High  
**Area:** Queue  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed.
- Google credentials are intentionally misconfigured (wrong refresh token) to cause job failure.

**Steps:**
1. Create a queue job (trigger a product webhook or manually insert a record).
2. Run the queue worker.
3. Confirm the job fails (Google API returns an auth error).
4. Confirm the job's `attempts` counter increments and `nextRetryAt` is set to a future time (backoff).
5. Run the queue worker again after the `nextRetryAt` time.
6. Confirm the job retries and fails again — `attempts` counter increments again.
7. Continue until `attempts` reaches the maximum (e.g. 5).
8. Confirm the job status is set to `FAILED_PERMANENT` (or equivalent) after max attempts.
9. Confirm the failure reason is logged clearly.
10. Verify the job does not retry beyond max attempts.

**Expected Result:**
- Retry intervals increase with each attempt (exponential backoff confirmed).
- Max attempts limit is respected — job is permanently failed after limit is hit.
- Permanent failure is visible in the Logs page with error reason.

**Pass / Fail:** ___

---

### TC-011: Bulk Indexing — 50+ Products

**Severity:** High  
**Area:** Queue  
**Pass / Fail:** ___

**Preconditions:**
- Test store has at least 50 products.
- Test store is on Pro or Business plan (if bulk indexing is a paid feature).
- Valid Google credentials or IndexNow key configured.

**Steps:**
1. Navigate to the Products or Indexing page in the app.
2. Select all products (or use "Select All" checkbox).
3. Click "Submit for Indexing" (or equivalent bulk action).
4. Observe the confirmation/summary screen showing the count of products queued.
5. Check the DB for the expected number of new queue job records.
6. Confirm the UI does not freeze or time out during the bulk submission.
7. Allow the queue worker to run and process jobs over time.
8. Check the Logs page for progress on bulk jobs.
9. Confirm all 50 jobs are eventually processed (or failed with a logged reason).

**Expected Result:**
- All 50+ products are queued without timeout.
- UI remains responsive during submission.
- Queue processes all jobs over time.
- Logs page shows correct status for all 50 products.

**Pass / Fail:** ___

---

### TC-012: AI SEO Generation — Single Product

**Severity:** High  
**Area:** AI SEO  
**Pass / Fail:** ___

**Preconditions:**
- Test store is on Pro or Business plan.
- At least one product exists with a title and description.
- Anthropic API key is configured (`ANTHROPIC_API_KEY` env var).

**Steps:**
1. Navigate to the Products page in the app.
2. Click on a single product to open its SEO editor.
3. Click "Generate SEO" (or "AI Generate").
4. Observe a loading indicator while the Anthropic API call is made.
5. Confirm the generated meta title and meta description are displayed in a preview.
6. Edit the generated content (change a word in the title).
7. Click "Apply" to save the SEO meta tags.
8. Verify the Shopify product's meta title and description are updated via Shopify Admin (refresh the product page in Admin).
9. Confirm a success toast/notification is shown in the app.

**Expected Result:**
- Anthropic claude-haiku-4-5-20251001 generates a relevant meta title and description.
- Preview is shown before applying.
- Merchant edits are preserved when applying.
- Shopify product meta tags are updated via Shopify API.
- Success feedback is shown.

**Pass / Fail:** ___

---

### TC-013: AI SEO Generation — Bulk Preview and Apply

**Severity:** High  
**Area:** AI SEO  
**Pass / Fail:** ___

**Preconditions:**
- Test store is on Pro or Business plan.
- At least 5 products exist.
- Anthropic API key is configured.

**Steps:**
1. Navigate to the Products page.
2. Select 5 products using checkboxes.
3. Click "Generate SEO for Selected" (or equivalent bulk AI action).
4. Observe loading indicators for each product.
5. Confirm all 5 products display generated meta title and description in a preview list.
6. Deselect 1 product (uncheck its "Apply" checkbox).
7. Click "Apply All" to apply the remaining 4 products.
8. Confirm 4 products are updated in Shopify and 1 is left unchanged.
9. Confirm a summary toast shows "4 products updated".

**Expected Result:**
- Bulk generation completes for all 5 selected products.
- Merchant can deselect individual items before applying.
- Only selected items are applied.
- Shopify API is called only for the 4 selected products.
- Summary of applied count is shown.

**Pass / Fail:** ___

---

### TC-014: Google Credentials Save in Settings

**Severity:** Critical  
**Area:** Settings  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed.
- Valid Google Indexing API service account JSON (or OAuth credentials) is available for testing.

**Steps:**
1. Navigate to Settings > Google Indexing API (or equivalent).
2. Paste valid Google credentials (service account JSON or OAuth client_id/client_secret/refresh_token).
3. Click "Save Credentials".
4. Confirm a success message is shown.
5. Reload the Settings page.
6. Confirm credentials are shown as "configured" (masked, not in plaintext).
7. Query the DB to confirm credentials are stored for the shop.
8. Test that a queue job can now submit to Google (run TC-009).
9. Navigate back to Settings and click "Clear Credentials".
10. Confirm credentials are removed from the DB.

**Expected Result:**
- Credentials are saved to DB, not in a flat file or env var.
- Credentials are not displayed in plaintext after saving (masked).
- Google indexing works after saving valid credentials.
- Clearing credentials removes them from the DB.

**Pass / Fail:** ___

---

### TC-015: IndexNow Key Verification

**Severity:** High  
**Area:** Settings  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed.
- The app is deployed and publicly accessible (not localhost).

**Steps:**
1. Navigate to Settings > IndexNow (or equivalent).
2. Note the current IndexNow key shown.
3. Access `https://{app-domain}/apps/indexboost/{key}.txt` in a browser.
4. Confirm the response body is the exact key string (plain text, no whitespace issues).
5. Confirm the HTTP response code is 200 and Content-Type is `text/plain`.
6. In Settings, click "Regenerate IndexNow Key".
7. Note the new key.
8. Access the old key URL — confirm it returns 404 (or the new key content).
9. Access the new key URL — confirm it returns the new key string.
10. Trigger an IndexNow submission and confirm the new key is used.

**Expected Result:**
- Key file is accessible at the correct URL.
- Response is plain text, HTTP 200.
- Regenerating creates a new key and the old URL is no longer valid.
- New key is used in subsequent IndexNow submissions.

**Pass / Fail:** ___

---

### TC-016: Plan Guard — Free Plan Cannot Access Pro Feature

**Severity:** Critical  
**Area:** Plan Gating  
**Pass / Fail:** ___

**Preconditions:**
- Test store is on `plan = FREE`.
- A Pro-gated feature is identified (e.g. bulk AI SEO generation, or bulk indexing beyond free limit).

**Steps:**
1. Navigate to the feature that requires a Pro plan (e.g. Bulk AI SEO).
2. Confirm an upgrade prompt or locked state is shown in the UI (not a raw error).
3. Attempt to call the Pro feature's API endpoint directly (e.g. using curl or a browser fetch) with the shop's session token.
4. Confirm the API endpoint returns HTTP 403 (or equivalent) with a clear message indicating the plan is insufficient.
5. Upgrade the shop to Pro (TC-004 or directly update DB for staging).
6. Confirm the feature is now accessible in the UI.
7. Confirm the API endpoint now returns 200.

**Expected Result:**
- Free plan merchants see a clear upgrade prompt in the UI.
- The server-side API enforces the plan restriction (returns 403 for Free plan merchants).
- After upgrading to Pro, the feature is accessible via UI and API.

**Pass / Fail:** ___

---

### TC-017: Plan Guard — Pro Plan Cannot Access Business Feature

**Severity:** Critical  
**Area:** Plan Gating  
**Pass / Fail:** ___

**Preconditions:**
- Test store is on `plan = PRO`.
- A Business-gated feature is identified (Image Alt AI, Index Health Check, or Email Alerts).

**Steps:**
1. Navigate to a Business-only feature (e.g. Index Health Check).
2. Confirm an upgrade prompt is shown in the UI.
3. Attempt to call the Business feature's API endpoint directly with the Pro shop's session.
4. Confirm the API returns HTTP 403.
5. Upgrade to Business plan (TC-005 or DB update for staging).
6. Confirm the Business feature is now accessible.
7. Downgrade back to Pro (DB update for staging).
8. Re-attempt accessing the Business feature — confirm it is gated again.

**Expected Result:**
- Pro plan merchants cannot access Business features via UI or API.
- After upgrading to Business, all Business features are accessible.
- After downgrading back to Pro, Business features are re-gated.

**Pass / Fail:** ___

---

### TC-018: GDPR — customers/data_request Webhook

**Severity:** Critical  
**Area:** GDPR  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed.
- GDPR webhook `customers/data_request` is registered (verify in `shopify.app.toml`).
- Tester can simulate a webhook delivery (use Shopify CLI or Partner Dashboard "Send Test Notification").

**Steps:**
1. In the Shopify Partner Dashboard, navigate to the test store's webhooks.
2. Send a test `customers/data_request` webhook to the app's endpoint.
3. Confirm the response is HTTP 200.
4. Check the server logs — confirm no unhandled exception was thrown.
5. Confirm the response body indicates no customer PII is stored (or that the data export has been initiated — per implementation).
6. Attempt to send the webhook with an invalid HMAC — confirm it returns HTTP 401.

**Expected Result:**
- Valid `customers/data_request` webhook returns HTTP 200 within 5 seconds.
- Handler does not throw an unhandled exception.
- Response acknowledges the request appropriately (no PII stored, or export initiated).
- Invalid HMAC returns 401.

**Pass / Fail:** ___

---

### TC-019: GDPR — shop/redact Webhook Deletes All Shop Data

**Severity:** Critical  
**Area:** GDPR  
**Pass / Fail:** ___

**Preconditions:**
- Test store (a store that was previously uninstalled — Shopify sends shop/redact 48+ hours after uninstall in production; simulate in staging).
- The shop has DB records: `Session`, `Shop`, `ShopSettings`, `IndexQueue`, `IndexLog`, Google credentials.

**Steps:**
1. Record the count of all DB records for the test shop before the webhook.
2. Send a `shop/redact` webhook (simulate via Shopify CLI or direct HTTP POST with valid HMAC).
3. Confirm the webhook returns HTTP 200.
4. Query the DB for all records associated with the shop.
5. Confirm all shop data has been deleted: sessions, settings, queue jobs, logs, Google credentials, IndexNow key.
6. Confirm no orphaned records remain in any table referencing the shop ID.

**Expected Result:**
- `shop/redact` webhook returns HTTP 200.
- All shop data is completely deleted from the database.
- No orphaned records remain.
- Handler completes within Shopify's timeout window.

**Pass / Fail:** ___

---

### TC-020: Robots.txt Editor — Save and Serve

**Severity:** High  
**Area:** Features  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed.
- Robots.txt editor feature is available (check plan requirement).

**Steps:**
1. Navigate to the Robots.txt editor in the app.
2. Confirm the current robots.txt content is loaded (or a default is shown).
3. Modify the content (add a `Disallow: /test-path/` rule).
4. Click "Save".
5. Confirm a success toast is shown.
6. Reload the Robots.txt editor page.
7. Confirm the saved content is displayed correctly.
8. Navigate to `https://{store}.myshopify.com/robots.txt` (or verify the meta robots value is reflected on the store).

**Expected Result:**
- Robots.txt content is saved to the DB.
- Saved content persists after page reload.
- Changes are reflected correctly.
- No data corruption (special characters are preserved).

**Pass / Fail:** ___

---

### TC-021: XML Sitemap Generation

**Severity:** High  
**Area:** Features  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed with at least 5 products, 1 collection, 1 page, 1 blog article.

**Steps:**
1. Navigate to the Sitemap section in the app.
2. Click "Generate Sitemap" (or observe auto-generated sitemap).
3. Confirm the sitemap preview lists URLs for products, collections, pages, and articles.
4. Confirm the sitemap URL format is valid (e.g. `https://{store}/sitemap.xml` or an app-hosted equivalent).
5. If the app hosts the sitemap, access the sitemap URL in a browser.
6. Validate the XML structure (well-formed XML with `<urlset>` and `<url>` tags).
7. Confirm all expected URLs are present.
8. Confirm `<lastmod>` dates are included.
9. Confirm no duplicate URLs exist in the sitemap.

**Expected Result:**
- Sitemap is generated with correct URLs for all resource types.
- XML is well-formed and valid.
- `<lastmod>` dates are present.
- No duplicates in the sitemap.

**Pass / Fail:** ___

---

### TC-022: Broken Links Scanner

**Severity:** Medium  
**Area:** Features  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed.
- Test store has at least one product with a known broken link in its description (set up a link to `https://nonexistent-domain-xyz.com/broken`).
- Plan allows access to the Broken Links Scanner.

**Steps:**
1. Navigate to the Broken Links Scanner in the app.
2. Click "Scan" to initiate the scan.
3. Observe the progress indicator while the scan runs.
4. Wait for the scan to complete.
5. Confirm the scan results list at least one broken link (the intentionally broken URL).
6. Confirm the broken link entry shows: the URL, the resource it was found on, and the HTTP status code (404 or 0 for connection failure).
7. Confirm working links are not reported as broken.
8. Click on a broken link entry — confirm it navigates to the resource for fixing.

**Expected Result:**
- Broken links scanner detects the intentionally broken URL.
- Results show URL, source resource, and HTTP status.
- No false positives for valid URLs.
- Scan completes without error or timeout.

**Pass / Fail:** ___

---

### TC-023: Redirect Manager — Add and Verify Redirect

**Severity:** Medium  
**Area:** Features  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed.
- Plan allows access to the Redirect Manager.

**Steps:**
1. Navigate to the Redirect Manager in the app.
2. Click "Add Redirect".
3. Enter: From path = `/old-product`, To URL = `/products/new-product`.
4. Select redirect type: 301 (Permanent).
5. Click "Save".
6. Confirm the redirect appears in the list.
7. Reload the Redirect Manager page.
8. Confirm the redirect is still present.
9. Test the redirect by visiting `https://{store}/old-product` — confirm it redirects to `/products/new-product` with a 301 status.
10. Delete the redirect from the list.
11. Confirm the redirect is removed.

**Expected Result:**
- Redirect is created and persisted in the DB.
- Redirect is active on the storefront (301 status).
- Redirect can be deleted.
- After deletion, the redirect no longer applies on the storefront.

**Pass / Fail:** ___

---

### TC-024: Index Health Check (Business Plan)

**Severity:** High  
**Area:** Features  
**Pass / Fail:** ___

**Preconditions:**
- Test store is on Business plan.
- Google Search Console credentials are configured.

**Steps:**
1. Navigate to the Index Health Check section in the app.
2. Click "Run Health Check".
3. Confirm a loading state is shown while the check runs.
4. Wait for the health check to complete.
5. Confirm the results display indexed vs. non-indexed URL counts.
6. Confirm individual URL statuses are shown (indexed, not indexed, excluded, etc.).
7. Click on a "not indexed" URL — confirm the option to submit for indexing is available.
8. Submit the URL for indexing — confirm a queue job is created.
9. Navigate to the Logs page — confirm the job appears.
10. Downgrade to Pro plan (DB update). Attempt to access Index Health Check.
11. Confirm the feature is blocked with an upgrade prompt.

**Expected Result:**
- Index Health Check runs and shows URL indexing statuses.
- Non-indexed URLs can be submitted for indexing.
- Feature is blocked on Free and Pro plans.

**Pass / Fail:** ___

---

### TC-025: Email Alerts Configuration (Business Plan)

**Severity:** Medium  
**Area:** Features  
**Pass / Fail:** ___

**Preconditions:**
- Test store is on Business plan.
- A valid email address is available for testing.

**Steps:**
1. Navigate to Settings > Email Alerts (or equivalent).
2. Confirm the Email Alerts section is visible (not blocked for Business plan).
3. Enter a valid email address for alert notifications.
4. Toggle on "Alert on quota exhaustion".
5. Toggle on "Alert on indexing failure (permanent)".
6. Click "Save".
7. Confirm a success toast is shown.
8. Reload the page — confirm the settings are persisted.
9. Simulate a permanent job failure (misconfigure credentials, let a job fail to max retries).
10. Confirm an email alert is sent to the configured address.
11. Downgrade to Pro plan (DB update). Confirm email alerts settings are blocked.

**Expected Result:**
- Email alert settings are saved for Business plan merchants.
- Alerts are sent when triggered (quota, permanent failure).
- Feature is blocked on Free and Pro plans.

**Pass / Fail:** ___

---

### TC-026: Logs Page — Filtering and Pagination

**Severity:** Medium  
**Area:** Logs  
**Pass / Fail:** ___

**Preconditions:**
- Test store has at least 50 log entries in the DB across different statuses and resource types.

**Steps:**
1. Navigate to the Logs page in the app.
2. Confirm the first page of logs is displayed (e.g. 20 or 25 items per page).
3. Click "Next" to go to page 2 — confirm different log entries are shown.
4. Click "Previous" — confirm page 1 is shown again.
5. Apply a filter for status = "Failed".
6. Confirm only failed log entries are displayed.
7. Apply a filter for resource type = "Product".
8. Confirm only product-related log entries are shown.
9. Clear all filters — confirm all entries are shown again.
10. Verify that the total count displayed matches the actual DB count (for the current filter).

**Expected Result:**
- Pagination works correctly (next/previous).
- Status filter correctly shows only matching entries.
- Resource type filter correctly shows only matching entries.
- Combined filters work.
- Total count is accurate.

**Pass / Fail:** ___

---

### TC-027: Mobile Shopify Admin — Core Navigation

**Severity:** Medium  
**Area:** Mobile  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed.
- Tester has the Shopify mobile app installed on a real device (iOS or Android) or is using a mobile browser to access Shopify Admin.

**Steps:**
1. Log in to the Shopify mobile app (or Shopify Admin in a mobile browser) as the test store owner.
2. Navigate to Apps > IndexBoost SEO.
3. Confirm the app loads inside the mobile admin without errors.
4. Navigate to each main nav item (Dashboard, Products, Settings, Logs).
5. Confirm each page loads and content is not horizontally clipped.
6. On the Settings page, attempt to fill in a form field — confirm the keyboard does not permanently obscure the submit button.
7. On the Products page, attempt a bulk select — confirm checkboxes are tappable.
8. On the Logs page, confirm the list is scrollable and pagination buttons are tappable.

**Expected Result:**
- App loads correctly on mobile.
- All navigation items are accessible.
- No horizontal overflow or clipped content on any page.
- Forms are usable with a mobile keyboard.
- Touch targets are large enough for reliable tapping.

**Pass / Fail:** ___

---

### TC-028: Error Boundary — Handles Unexpected JS Error

**Severity:** Medium  
**Area:** Error Handling  
**Pass / Fail:** ___

**Preconditions:**
- Development or staging environment where JS errors can be simulated.
- Access to browser developer tools.

**Steps:**
1. Load the embedded app in the Shopify Admin.
2. Open browser developer tools (Console tab).
3. Simulate a JS runtime error by navigating to a route that is known to be broken (or temporarily modify source to throw an error in a component `render`).
4. Observe the app behavior — the error boundary should catch the error.
5. Confirm a styled error screen is shown (using Polaris components), not a blank white page.
6. Confirm the error screen includes a "Reload" or "Try Again" button.
7. Confirm the error details are NOT shown to the merchant (no stack trace visible in the UI).
8. Check server-side logs to confirm the error was logged.

**Expected Result:**
- React error boundary catches the unhandled JS error.
- A user-friendly Polaris error page is shown.
- No raw stack trace is exposed to the merchant.
- A reload/retry option is available.
- Error is logged server-side.

**Pass / Fail:** ___

---

### TC-029: GDPR — customers/redact Webhook

**Severity:** Critical  
**Area:** GDPR  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed.
- `customers/redact` webhook is registered in `shopify.app.toml`.
- Any customer-related data is present in the DB (if the app stores customer data; otherwise confirm it does not).

**Steps:**
1. Prepare a `customers/redact` webhook payload with a valid shop and customer ID.
2. Sign the payload with the correct HMAC using the `SHOPIFY_API_SECRET`.
3. Send a POST request to the app's `customers/redact` endpoint.
4. Confirm the response is HTTP 200 within 5 seconds.
5. Check the DB — confirm any records tied to the specified customer ID are deleted.
6. Re-send the same webhook (simulate Shopify retry) — confirm it returns 200 and does not error (idempotent).
7. Send the webhook with an invalid HMAC — confirm it returns 401.

**Expected Result:**
- Valid `customers/redact` returns HTTP 200.
- Customer-associated data is deleted (or confirmed not stored).
- Handler is idempotent (second delivery returns 200 without error).
- Invalid HMAC returns 401.

**Pass / Fail:** ___

---

### TC-030: Webhook HMAC Validation Rejects Tampered Request

**Severity:** Critical  
**Area:** Security  
**Pass / Fail:** ___

**Preconditions:**
- Test store is installed.
- Tester has a tool (e.g. curl, Postman) to send raw HTTP requests.

**Steps:**
1. Construct a valid-looking `products/create` webhook payload (JSON body with a product ID, shop domain, etc.).
2. Send a POST request to the app's `products/create` webhook endpoint WITHOUT the `X-Shopify-Hmac-Sha256` header.
3. Confirm the response is HTTP 401 (or 403) — request is rejected.
4. Send a POST request with the header present but with an incorrect HMAC value (random string).
5. Confirm the response is HTTP 401 (or 403) — request is rejected.
6. Send a POST request with a correctly computed HMAC (using the correct `SHOPIFY_API_SECRET`).
7. Confirm the response is HTTP 200 — request is accepted and a queue job is created.
8. Confirm no queue job was created in steps 3 and 4.

**Expected Result:**
- Requests without HMAC header are rejected (401/403).
- Requests with invalid HMAC are rejected (401/403).
- Only requests with a valid HMAC are processed.
- No queue jobs are created from tampered/invalid webhook requests.

**Pass / Fail:** ___

---

## Test Execution Summary

| Test Run Date | Tester | Total | Passed | Failed | Blocked | Pass Rate |
|---------------|--------|-------|--------|--------|---------|-----------|
|               |        | 30    |        |        |         |           |

**Failed Test Cases:**

| TC ID | Bug Report ID | Summary | Owner | Target Fix |
|-------|---------------|---------|-------|------------|
|       |               |         |       |            |

**Notes:**

___
