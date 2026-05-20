# IndexBoost SEO — Bug Report Template

**App:** IndexBoost SEO (Shopify Embedded App)  
**Template Version:** 1.0  
**Last Updated:** 2026-05-20  

---

## How to Use This Template

1. Copy the template below into a new bug tracking entry (GitHub Issue, Jira ticket, Linear issue, etc.).
2. Fill in every field — leave no field blank. Use "N/A" if a field truly does not apply.
3. Assign a Bug ID using the format `BR-YYYYMMDD-XXX` where `XXX` is a zero-padded sequential number per day (e.g. `BR-20260520-001`).
4. Attach screenshots/videos directly to the bug tracking issue.
5. Set the severity accurately — see the severity guide below.

---

## Severity Guide

| Severity | Definition | Examples |
|----------|------------|---------|
| **Critical** | App is unusable or data is lost/corrupted. No workaround. Blocks install, billing, or GDPR compliance. | Install fails, billing charge applied but plan not updated, shop/redact fails to delete data, unhandled 500 on every page load |
| **High** | Core feature is broken. A workaround exists but is painful or manual. | Queue stops processing, AI SEO always returns error, webhook HMAC validation broken, plan gating not enforced server-side |
| **Medium** | Feature works but with significant UX issues or intermittent failures. | Logs pagination broken, filter returns wrong results, mobile layout broken, error state shows raw error message |
| **Low** | Minor cosmetic or non-blocking issue. | Typo in UI text, button alignment off, tooltip missing, minor spacing issue |

---

## Bug Report Template

---

### Bug ID
`BR-YYYYMMDD-XXX`
> Replace with actual ID, e.g. `BR-20260520-001`

---

### Title
> One-line summary of the bug. Be specific. Include the feature area and what went wrong.
> Example: "Billing upgrade Free→Pro does not update plan in DB when charge is approved on mobile Safari"

---

### Environment
- [ ] Production
- [ ] Staging
- [ ] Development

---

### Store URL
`.myshopify.com`
> Example: `test-store-indexboost.myshopify.com`

---

### App Version
> Check `package.json` → `"version"` field or the deployed image tag.
> Example: `1.2.3` or `docker-image-tag: sha-abc1234`

---

### Plan
- [ ] Free ($0)
- [ ] Pro ($9.95/mo)
- [ ] Business ($19.95/mo)
- [ ] N/A (bug occurs before plan is assigned, e.g. during install)

---

### Date / Time of Occurrence
> Include timezone.
> Example: `2026-05-20 14:35 UTC`

---

### Reporter
> Name and email.
> Example: `Thuan VD <thuanvd@syn-gr.com>`

---

### Severity
- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low

---

### Category
- [ ] Billing
- [ ] Webhook
- [ ] Queue
- [ ] UI / UX
- [ ] Auth / OAuth
- [ ] AI (Anthropic / SEO Generation)
- [ ] GDPR
- [ ] Performance
- [ ] Security
- [ ] Settings
- [ ] Logs
- [ ] Feature (specify): ___

---

### Steps to Reproduce

> Provide exact, numbered steps. Include any specific data values used (e.g. product title, plan type, credentials used).

1. 
2. 
3. 
4. 
5. 

---

### Expected Behavior

> What should happen according to the spec, design, or logical expectation?

---

### Actual Behavior

> What actually happened? Be precise. Include exact error messages, status codes, or UI states observed.

---

### Frequency

- [ ] Always (100% reproducible with the steps above)
- [ ] Sometimes (reproducible ~50% of the time)
- [ ] Rarely (hard to reproduce, occurred once or twice)

> If not Always, describe any patterns noticed (e.g. "only happens when queue has more than 50 jobs", "only on mobile Safari"):

---

### Screenshots / Video

> Attach screenshots or screen recordings directly to this issue.
> If the bug involves a UI state, a screenshot is required.

- Screenshot 1: _(attach)_
- Screenshot 2: _(attach)_
- Video: _(attach or link)_

---

### Browser & Version

> Example: `Chrome 124.0.6367.82`, `Safari 17.4`, `Firefox 125.0`

---

### Device

- [ ] Desktop
- [ ] Mobile (iOS)
- [ ] Mobile (Android)
- [ ] Tablet

> Device model (if mobile): ___
> OS version: ___

---

### Console Errors

> Open browser developer tools → Console tab. Paste any red errors here.
> If no console errors, write "None".

```
(paste console errors here)
```

---

### Server Logs

> Paste relevant server-side log lines (from Docker logs, Railway logs, or equivalent).
> Include the timestamp, log level, and the full error message/stack trace.
> Redact any secrets (API keys, tokens) before pasting.

```
(paste server logs here)
```

---

### Network Requests

> Open browser developer tools → Network tab. Find the failing request.
> Paste the relevant request details (URL, method, request headers without auth tokens, request body, response status, response body).

**Request:**
```
Method: 
URL: 
Headers: 
Body: 
```

**Response:**
```
Status: 
Body: 
```

---

### Affected Merchants

> List any known merchant stores affected by this bug (besides the test store).
> Example: `store-a.myshopify.com`, `store-b.myshopify.com`
> If unknown: "Unknown — discovered in testing"

---

### Workaround

> Is there a manual workaround the merchant or support team can use until the bug is fixed?
> If yes, describe it clearly.
> If no workaround exists, write "None".

---

### Notes

> Any additional context, hypotheses about root cause, related issues, or links to relevant code.

---

## Example Completed Bug Report

---

### Bug ID
`BR-20260520-001`

### Title
Billing upgrade Free→Pro does not update `Shop.plan` in DB after Shopify charge approval

### Environment
- [x] Staging

### Store URL
`test-store-indexboost.myshopify.com`

### App Version
`1.2.3`

### Plan
- [x] Free ($0)

### Date / Time of Occurrence
`2026-05-20 09:12 UTC`

### Reporter
`Thuan VD <thuanvd@syn-gr.com>`

### Severity
- [x] Critical

### Category
- [x] Billing

### Steps to Reproduce
1. Install the app on a clean development store (plan = FREE).
2. Navigate to Billing / Plans page.
3. Click "Upgrade to Pro".
4. Approve the $9.95/mo charge on the Shopify billing confirmation page.
5. Observe the redirect back to the app.
6. Query the DB: `SELECT plan FROM "Shop" WHERE "shopDomain" = 'test-store-indexboost.myshopify.com';`

### Expected Behavior
`Shop.plan` should be updated to `PRO` after the charge is approved.

### Actual Behavior
`Shop.plan` remains `FREE`. The billing return URL endpoint returns HTTP 200 but does not update the DB. The merchant sees no error but Pro features remain locked.

### Frequency
- [x] Always

### Screenshots / Video
- Screenshot 1: _(billing confirmation page — charge approved successfully)_
- Screenshot 2: _(app shows plan still as Free)_

### Browser & Version
`Chrome 124.0.6367.82`

### Device
- [x] Desktop

### Console Errors
```
None
```

### Server Logs
```
2026-05-20T09:12:45.321Z INFO  [billing/callback] charge_id=abc123 shop=test-store-indexboost.myshopify.com
2026-05-20T09:12:45.421Z ERROR [billing/callback] TypeError: Cannot read properties of undefined (reading 'id')
    at updateShopPlan (/app/app/routes/billing.callback.ts:47:23)
```

### Network Requests
**Request:**
```
Method: GET
URL: https://app-domain.com/billing/callback?charge_id=abc123&shop=test-store-indexboost.myshopify.com
```
**Response:**
```
Status: 200
Body: {"success": true}
```

### Affected Merchants
Unknown — discovered in testing

### Workaround
Manually update the DB: `UPDATE "Shop" SET "plan" = 'PRO' WHERE "shopDomain" = 'test-store-indexboost.myshopify.com';`

### Notes
The server log shows a `TypeError` in `updateShopPlan` at line 47 of `billing.callback.ts`. The error is swallowed and the handler returns 200, so the client sees no error. Root cause is likely a null check missing on the charge response object.

---
