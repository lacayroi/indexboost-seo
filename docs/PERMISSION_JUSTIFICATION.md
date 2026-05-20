# IndexBoost SEO - Permission Scope Justification

This document explains every Shopify API scope requested by IndexBoost SEO, the specific features that require it, and what would break if the scope were removed.

**All 8 scopes are actively used. None can be removed without breaking shipped merchant features.**

Submitted scopes (from `shopify.app.toml`):

```
read_products, write_products, read_content, write_content,
read_online_store_navigation, write_online_store_navigation,
read_themes, write_themes
```

---

## 1. `read_products`

**Why it is needed:**
The app must read product and collection data to function across multiple core features.

**Features that use this scope:**

- **Auto-indexing webhook handler:** When a `products/create` or `products/update` webhook fires, the app reads the product handle and builds the canonical storefront URL for submission to Google Indexing API and IndexNow.
- **Bulk indexing (Pro+):** The bulk submit page fetches all products and collections to display a list of store URLs available for manual submission.
- **AI SEO optimizer (all plans):** The AI SEO page reads product titles, descriptions, and existing SEO fields to pass context to the AI and display current SEO scores.
- **Image SEO (Business):** The app reads product images and their alt text fields to identify images with missing alt text and populate the image SEO editor.
- **SEO Audit (Pro+):** Scans products and collections for missing SEO fields (empty meta title, empty meta description) and reports them.
- **Meta tags editor (Pro+):** Reads product and collection SEO fields (`seo.title`, `seo.description`) for display and editing.
- **HTML Sitemap (Pro+):** Reads all products and collections to include their URLs in the generated sitemap.
- **LLMs.txt generator (Pro+):** Reads product and collection titles and handles to build the LLMs.txt content map.
- **Broken links scanner (Pro+):** Builds product and collection URL lists to test for 404 responses.
- **Schema / JSON-LD (Pro+):** Reads product fields (name, description, price) to generate structured data markup.

**Verdict: Required. Cannot be removed.**

---

## 2. `write_products`

**Why it is needed:**
Several features write SEO data back to products and collections via the Shopify Admin API.

**Features that use this scope:**

- **AI SEO optimizer:** After generating a meta title and description, the app writes the updated SEO fields back to the product using the `productUpdate` mutation.
- **Image SEO (Business):** Writes updated `altText` values back to product images using the `productUpdate` mutation with the `images` field.
- **Meta tags editor (Pro+):** Writes updated `seo.title` and `seo.description` fields back to products using the `productUpdate` mutation, and to collections using the `collectionUpdate` mutation.

**Verification — GraphQL mutations using this scope:**
```
productUpdate(input: $input)         — app.ai-seo.tsx, app.image-seo.tsx, app.meta-tags.tsx
collectionUpdate(input: $input)      — app.meta-tags.tsx
```

**Verdict: Required. Cannot be removed.**

---

## 3. `read_content`

**Why it is needed:**
The app indexes and audits Pages, which are Shopify "content" resources. Reading pages requires this scope.

**Features that use this scope:**

- **Meta tags editor (Pro+):** Reads all pages (`pages(first: 50)`) to display their current SEO fields for editing.
- **HTML Sitemap (Pro+):** Reads all pages to include their URLs in the generated sitemap.
- **LLMs.txt generator (Pro+):** Reads page titles and handles to include them in the LLMs.txt content map.
- **Broken links scanner (Pro+):** Reads all pages and builds their URLs to check for 404 responses.
- **Page/article webhook auto-indexing:** The app registers `pages/create`, `pages/update` webhooks that use page handles to build URLs for indexing.

**Verification — GraphQL queries using this scope:**
```
pages(first: 50) { ... }   — app.meta-tags.tsx, app.html-sitemap.tsx, app.llms-txt.tsx, app.broken-links.tsx
```

**Verdict: Required. Cannot be removed.**

---

## 4. `write_content`

**Why it is needed:**
The meta tags editor writes updated SEO fields (title, description) back to Shopify Pages using the `pageUpdate` mutation. This mutation requires the `write_content` scope.

**Features that use this scope:**

- **Meta tags editor (Pro+):** When a merchant edits the SEO title and description for a page and clicks Save, the app calls the `pageUpdate` mutation with the updated `seo.title` and `seo.description` fields. Without this scope, page SEO edits cannot be saved — the feature becomes read-only for pages.

**Verification — GraphQL mutations using this scope:**
```
pageUpdate(id: $id, input: $input)   — app.meta-tags.tsx (action, type === "page")
```

**Verdict: Required. Cannot be removed. (Previous audit incorrectly flagged this as unused — it is actively used.)**

---

## 5. `read_online_store_navigation`

**Why it is needed:**
The redirect manager reads existing URL redirects from the Shopify store using the `urlRedirects` query, which requires this scope.

**Features that use this scope:**

- **Redirect Manager (Pro+):** When the redirect manager loads, it fetches all existing URL redirects (`urlRedirects(first: 100)`) to display them in the management table. Without this scope, the redirect manager cannot list existing redirects and displays an empty/broken state.

**Verification — GraphQL queries using this scope:**
```
urlRedirects(first: 100) { edges { node { id path target } } }   — app.redirects.tsx (loader)
```

**Verdict: Required. Cannot be removed.**

---

## 6. `write_online_store_navigation`

**Why it is needed:**
The redirect manager creates and deletes URL redirects using the `urlRedirectCreate` and `urlRedirectDelete` mutations, both of which require this scope.

**Features that use this scope:**

- **Redirect Manager (Pro+):** Merchants use this feature to add 301 redirects when product, collection, or page URLs change. The `urlRedirectCreate` mutation creates a new redirect, and `urlRedirectDelete` removes an existing one. Without this scope, merchants can view redirects but cannot add or remove them — the core purpose of the feature is lost.

**Verification — GraphQL mutations using this scope:**
```
urlRedirectCreate(urlRedirect: $urlRedirect)           — app.redirects.tsx (action, type === "create")
urlRedirectDelete(urlRedirectId: $id)                  — app.redirects.tsx (action, type === "delete")
```

**Verdict: Required. Cannot be removed. (Previous audit incorrectly flagged this as unused — it is actively used.)**

---

## 7. `read_themes`

**Why it is needed:**
The robots.txt editor must identify the active Shopify theme to locate and read the `robots.txt.liquid` template file.

**Features that use this scope:**

- **Robots.txt editor (Pro+):** Before displaying the current robots.txt content, the app queries the active theme ID using `themes(first: 1, roles: MAIN)`. This ID is then used to read and write the `templates/robots.txt.liquid` asset. Without this scope, the theme ID cannot be retrieved and the robots.txt editor cannot function.

**Verification — GraphQL queries using this scope:**
```
themes(first: 1, roles: MAIN) { edges { node { id } } }   — app.robots-txt.tsx (action)
```

**Verdict: Required. Cannot be removed.**

---

## 8. `write_themes`

**Why it is needed:**
The robots.txt editor writes the edited `robots.txt.liquid` back to the active Shopify theme using the `themeFilesUpsert` mutation.

**Features that use this scope:**

- **Robots.txt editor (Pro+):** After a merchant edits the robots.txt content and clicks "Save to Theme", the app writes the updated content to `templates/robots.txt.liquid` in the active theme. The content is wrapped in `{%- raw -%}...{%- endraw -%}` to prevent Liquid injection. Without this scope, the editor is a read-only viewer — no changes can be saved.

**Verification — GraphQL mutations using this scope:**
```
themeFilesUpsert(themeId: $themeId, files: $files)   — app.robots-txt.tsx (action)
```

**Verdict: Required. Cannot be removed.**

---

## Summary Table

| Scope | Status | Feature(s) | GraphQL Operation | Can Be Removed? |
|---|---|---|---|---|
| `read_products` | **Active** | Auto-indexing, Bulk Index, AI SEO, Image SEO, Meta Tags, Sitemap, LLMs.txt, Broken Links, Schema | `products()`, `collections()` | No |
| `write_products` | **Active** | AI SEO save, Image alt text save, Meta Tags editor | `productUpdate`, `collectionUpdate` | No |
| `read_content` | **Active** | Meta Tags editor, Sitemap, LLMs.txt, Broken Links, Page webhooks | `pages()` | No |
| `write_content` | **Active** | Meta Tags editor (pages) | `pageUpdate` | No |
| `read_online_store_navigation` | **Active** | Redirect Manager (read) | `urlRedirects()` | No |
| `write_online_store_navigation` | **Active** | Redirect Manager (create/delete) | `urlRedirectCreate`, `urlRedirectDelete` | No |
| `read_themes` | **Active** | Robots.txt editor (read) | `themes()` | No |
| `write_themes` | **Active** | Robots.txt editor (save) | `themeFilesUpsert` | No |

**All 8 scopes are actively used by shipped features. No scope can be removed without breaking a Pro or Business plan feature. The previous pre-release audit incorrectly identified `write_content` and `write_online_store_navigation` as unused — this document corrects that finding based on code verification.**

---

## Reviewer Notes

For Shopify App Store reviewers:

- Every scope is tied to a user-facing feature accessible from the app navigation
- All write operations are merchant-initiated (no silent background writes to store data)
- The app does not store or transmit theme files, page content, or navigation data outside the merchant's store
- `write_themes` is scoped solely to `templates/robots.txt.liquid` — no other theme files are modified
- The robots.txt content is sanitized with `{%- raw -%}...{%- endraw -%}` wrapping before writing to prevent Liquid injection

To verify scope usage: install the app, navigate to each Pro/Business feature listed above, and observe the corresponding API call in Shopify's Partner Dashboard API logs.
