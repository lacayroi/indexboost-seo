# IndexBoost SEO — Permission Scope Justification

**All 8 scopes are actively used. None can be removed without breaking a shipped feature.**

---

## Scope Summary

| Scope | Feature(s) That Use It | Why It Cannot Be Removed |
|---|---|---|
| `read_products` | Auto-indexing, Bulk Index, AI SEO, Image SEO, Meta Tags editor, Sitemap, LLMs.txt, Broken Links, Schema, SEO Audit | Without it, the app cannot read product/collection URLs, titles, or SEO fields — indexing and all SEO tools fail entirely. |
| `write_products` | AI SEO (save suggestions), Image SEO (save alt text), Meta Tags editor (save for products and collections) | Without it, all merchant-initiated SEO edits to products and collections are silently discarded — write features become broken read-only views. |
| `read_content` | Meta Tags editor (pages), Sitemap, LLMs.txt, Broken Links scanner, Page/article auto-indexing | Without it, the app cannot read Shopify Pages — all content-related tools and page auto-indexing fail. |
| `write_content` | Meta Tags editor — saves updated SEO title/description to Shopify Pages via `pageUpdate` mutation | Without it, page SEO edits cannot be saved. The meta tags editor becomes read-only for pages. |
| `read_online_store_navigation` | Redirect Manager — loads existing URL redirects via `urlRedirects(first: 100)` | Without it, the Redirect Manager cannot display any existing redirects — the feature opens to a broken empty state. |
| `write_online_store_navigation` | Redirect Manager — creates and deletes URL redirects via `urlRedirectCreate` and `urlRedirectDelete` mutations | Without it, merchants can view redirects but cannot add or remove them — the core purpose of the feature is lost. |
| `read_themes` | Robots.txt editor — identifies the active theme ID via `themes(first: 1, roles: MAIN)` before reading the robots.txt file | Without it, the active theme ID cannot be retrieved and the robots.txt editor cannot load the current content. |
| `write_themes` | Robots.txt editor — saves the edited `robots.txt.liquid` file back to the active theme via `themeFilesUpsert` mutation | Without it, the robots.txt editor is a read-only viewer — no edits can be saved to the store. |

---

## Additional Notes for Reviewers

**All write operations are merchant-initiated.** No scope is used for silent background writes to store data. Every mutation is triggered by an explicit merchant action inside the app.

**`write_themes` is narrowly scoped to one file.** The robots.txt editor only touches `templates/robots.txt.liquid` in the active theme. No other theme files are read or modified. Content is wrapped in `{%- raw -%}...{%- endraw -%}` to prevent Liquid injection before writing.

**Verification method.** To verify scope usage: install the app, navigate to each Pro or Business feature listed in the table above, and observe the corresponding Shopify Admin API call in the Partner Dashboard API logs.

**`write_content` and `write_online_store_navigation`** are sometimes flagged as potentially unused by automated scope scanners. Both are actively used:
- `write_content` → `pageUpdate` mutation in the Meta Tags editor (`app.meta-tags.tsx`, action handler, `type === "page"`)
- `write_online_store_navigation` → `urlRedirectCreate` and `urlRedirectDelete` mutations in the Redirect Manager (`app.redirects.tsx`, action handler)

---

## Scopes Listed in `shopify.app.toml`

```
read_products
write_products
read_content
write_content
read_online_store_navigation
write_online_store_navigation
read_themes
write_themes
```
