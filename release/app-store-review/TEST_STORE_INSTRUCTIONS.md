# Test Store Instructions — IndexBoost SEO

Instructions for setting up a Shopify Development Store to test IndexBoost SEO during review.

---

## Prerequisites

- Shopify Partner Account
- A Development Store (not a live merchant store)
- App installed from the Partner Dashboard

---

## Setup Steps

### 1. Create a Development Store

1. Log in to partners.shopify.com
2. Go to **Stores** > **Add store** > **Development store**
3. Fill in store details and create the store

### 2. Populate Test Data

Add at least 5 products to make the app features meaningful:
1. Go to **Products** > **Add product**
2. Add 3–5 products with:
   - A product title
   - A short description
   - At least 1 product image
   - A published status

### 3. Install the App

1. From your Partner Dashboard > Apps > IndexBoost SEO > **Test on development store**
2. Select your development store
3. Click **Install app**
4. Approve the OAuth scopes

**Expected scopes prompt:**
> - Read and write product information
> - Read and write content (pages)
> - Read and write themes
> - Read and write navigation (redirects)

### 4. Enable Test Billing Mode

When testing on a Development Store, Shopify automatically uses test billing — no real charge occurs.

The app displays test charges when `SHOPIFY_BILLING_TEST=true`. On a Development Store, Shopify treats all charges as test charges regardless.

**To test billing upgrade:**
1. Go to **Plans & Billing** in the app
2. Click **Upgrade to Pro** (or Business)
3. You will see a Shopify billing confirmation page showing a **test charge**
4. Approve the test charge

---

## Test Flows

### Flow A: Auto-Indexing Verification

1. Go to Shopify Admin > Products > Edit any product
2. Change the product title and save
3. Go back to IndexBoost SEO > **Submission Logs**
4. Verify a new log entry appears within 30 seconds (or after page refresh)

*Note: Submissions will show as "failed" unless Google Search Console credentials are configured for this store. This is expected behavior — the URL is submitted, not the result.*

### Flow B: AI SEO Generation (requires credits)

1. Go to **AI SEO Optimizer**
2. Select 1–3 products with missing SEO fields
3. Click **Generate SEO Preview**
4. Review the generated suggestions
5. Click **Apply Selected**
6. Go to Shopify Admin > Products > verify the SEO title was updated

### Flow C: Billing Upgrade + Downgrade

1. Go to **Plans & Billing**
2. Click **Upgrade to Pro** → approve test charge → verify Pro features unlock
3. Click **Upgrade to Business** → approve test charge → verify Business features unlock
4. Click **Cancel subscription** → verify plan returns to Free

### Flow D: Uninstall Cleanup

1. Go to Shopify Admin > Settings > Apps and sales channels
2. Delete the IndexBoost SEO app
3. Re-install the app
4. Verify a fresh install (no leftover data from previous install)

---

## Expected Behaviors

| Scenario | Expected Result |
|---|---|
| Fresh install | Dashboard loads, auto-indexing on by default |
| Product saved in Shopify | Submission log entry appears |
| Google credentials not set | Submission shows as failed with "not configured" |
| Pro plan feature without Pro plan | UpgradeBanner shown |
| Business plan feature without Business plan | UpgradeBanner shown |
| Cancel subscription | Plan shows Free, paid features locked |
| Uninstall | App removed, data deleted from DB |
| Reinstall | Fresh session, no duplicate data |

---

## Support

For review questions or test assistance: thuanvd@syn-gr.com
