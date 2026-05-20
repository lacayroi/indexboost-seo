import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  Button,
  Banner,
  Box,
  Badge,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { UpgradeBanner } from "../components/UpgradeBanner";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/webhook-handler.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { getPlan } = await import("../services/require-plan.server");
  const plan = await getPlan(admin);
  if (plan === "free") {
    return json({ shopDomain: "", products: [], collections: [], pages: [], htmlSitemap: "", planBlocked: true, currentPlan: plan });
  }
  const shop = await getOrCreateShop(session.shop);

  const [productsRes, collectionsRes, pagesRes] = await Promise.all([
    admin.graphql(`#graphql
      query { products(first: 100) { edges { node { title handle updatedAt } } } }
    `),
    admin.graphql(`#graphql
      query { collections(first: 50) { edges { node { title handle updatedAt } } } }
    `),
    admin.graphql(`#graphql
      query { pages(first: 50) { edges { node { title handle } } } }
    `),
  ]);

  const [productsData, collectionsData, pagesData] = await Promise.all([
    productsRes.json(),
    collectionsRes.json(),
    pagesRes.json(),
  ]);

  const products = (productsData.data?.products?.edges || []).map((e: any) => e.node);
  const collections = (collectionsData.data?.collections?.edges || []).map((e: any) => e.node);
  const pages = (pagesData.data?.pages?.edges || []).map((e: any) => e.node);

  // Generate HTML sitemap
  const htmlSitemap = generateHtmlSitemap(shop.domain, products, collections, pages);

  return json({
    shopDomain: shop.domain,
    products,
    collections,
    pages,
    htmlSitemap,
    planBlocked: false,
    currentPlan: plan,
  });
};

function generateHtmlSitemap(domain: string, products: any[], collections: any[], pages: any[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sitemap - ${domain}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; } h2 { color: #666; margin-top: 30px; }
    ul { list-style: none; padding: 0; }
    li { padding: 4px 0; } a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Sitemap</h1>

  <h2>Collections (${collections.length})</h2>
  <ul>
${collections.map((c) => `    <li><a href="https://${domain}/collections/${c.handle}">${c.title}</a></li>`).join("\n")}
  </ul>

  <h2>Products (${products.length})</h2>
  <ul>
${products.map((p) => `    <li><a href="https://${domain}/products/${p.handle}">${p.title}</a></li>`).join("\n")}
  </ul>

  <h2>Pages (${pages.length})</h2>
  <ul>
${pages.map((p) => `    <li><a href="https://${domain}/pages/${p.handle}">${p.title}</a></li>`).join("\n")}
  </ul>
</body>
</html>`;
}

export default function HtmlSitemap() {
  const { products, collections, pages, htmlSitemap, planBlocked, currentPlan } =
    useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const [copied, setCopied] = useState(false);

  const totalUrls = products.length + collections.length + pages.length;

  const copyHtml = async () => {
    await navigator.clipboard.writeText(htmlSitemap);
    setCopied(true);
    shopify.toast.show("HTML sitemap copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Page>
      <TitleBar title="HTML Sitemap" />
      <BlockStack gap="500">
        {planBlocked && (
          <UpgradeBanner currentPlan={currentPlan} requiredPlan="pro" feature="HTML Sitemap" />
        )}

        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">
                HTML Sitemap Generator
              </Text>
              <InlineStack gap="200">
                <Badge>{`${totalUrls} URLs`}</Badge>
                <Button onClick={copyHtml}>
                  {copied ? "Copied!" : "Copy HTML"}
                </Button>
              </InlineStack>
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              An HTML sitemap helps visitors and search engines navigate your store.
              Copy the HTML below and create a new page in your store (e.g., /pages/sitemap).
            </Text>

            <Banner tone="info">
              <Text as="p" variant="bodyMd">
                {collections.length} collections, {products.length} products, {pages.length} pages
              </Text>
            </Banner>

            <Box
              padding="400"
              background="bg-surface-secondary"
              borderRadius="200"
              overflowX="scroll"
            >
              <pre style={{ margin: 0, fontSize: "11px", whiteSpace: "pre-wrap", maxHeight: "400px" }}>
                {htmlSitemap}
              </pre>
            </Box>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
