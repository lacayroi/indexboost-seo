import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Badge,
  Box,
  Banner,
  Button,
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
    return json({ shopDomain: "", products: [], orgSchema: "", websiteSchema: "", planBlocked: true, currentPlan: plan });
  }
  const shop = await getOrCreateShop(session.shop);

  const [productsRes, shopRes] = await Promise.all([
    admin.graphql(`#graphql
      query { products(first: 20) { edges { node {
        title handle description
        priceRangeV2 { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
        images(first: 1) { edges { node { url altText } } }
        vendor
        productType
        availableForSale: status
      }}}}
    `),
    admin.graphql(`#graphql
      query { shop { name description url } }
    `),
  ]);

  const [productsData, shopData] = await Promise.all([
    productsRes.json(),
    shopRes.json(),
  ]);

  const shopInfo = shopData.data?.shop || {};
  const products = (productsData.data?.products?.edges || []).map((e: any) => {
    const p = e.node;
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.title,
      description: (p.description || "").replace(/<[^>]*>/g, "").substring(0, 500),
      url: `https://${shop.domain}/products/${p.handle}`,
      image: p.images?.edges?.[0]?.node?.url || "",
      brand: {
        "@type": "Brand",
        name: p.vendor || shopInfo.name || "",
      },
      offers: {
        "@type": "AggregateOffer",
        lowPrice: p.priceRangeV2?.minVariantPrice?.amount || "0",
        highPrice: p.priceRangeV2?.maxVariantPrice?.amount || "0",
        priceCurrency: p.priceRangeV2?.minVariantPrice?.currencyCode || "USD",
        availability: p.availableForSale === "ACTIVE"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      },
    };

    return {
      title: p.title,
      handle: p.handle,
      schema: JSON.stringify(schema, null, 2),
      hasImage: !!p.images?.edges?.[0],
      hasDescription: !!p.description,
      hasPrice: !!p.priceRangeV2?.minVariantPrice?.amount,
    };
  });

  // Organization schema
  const orgSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: shopInfo.name || "",
    url: `https://${shop.domain}`,
    description: shopInfo.description || "",
  }, null, 2);

  // WebSite schema with search
  const websiteSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: shopInfo.name || "",
    url: `https://${shop.domain}`,
    potentialAction: {
      "@type": "SearchAction",
      target: `https://${shop.domain}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }, null, 2);

  return json({ shopDomain: shop.domain, products, orgSchema, websiteSchema, planBlocked: false, currentPlan: plan });
};

export default function Schema() {
  const { products, orgSchema, websiteSchema, planBlocked, currentPlan } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const [copied, setCopied] = useState("");

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    shopify.toast.show(`${label} copied`);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <Page>
      <TitleBar title="Schema / JSON-LD" />
      <BlockStack gap="500">
        {planBlocked && (
          <UpgradeBanner currentPlan={currentPlan} requiredPlan="pro" feature="Schema / JSON-LD" />
        )}
        <Banner tone="info" title="Structured Data">
          <Text as="p" variant="bodyMd">
            JSON-LD schema markup helps search engines understand your content.
            Copy these snippets and add them to your theme's layout file or use
            Shopify's built-in JSON-LD support.
          </Text>
        </Banner>

        <Layout>
          <Layout.Section>
            {/* Organization Schema */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Organization Schema</Text>
                  <Button variant="plain" onClick={() => copy(orgSchema, "Organization")}>
                    {copied === "Organization" ? "Copied!" : "Copy"}
                  </Button>
                </InlineStack>
                <SchemaPreview json={orgSchema} />
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            {/* WebSite Schema */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">WebSite Schema (with Search)</Text>
                  <Button variant="plain" onClick={() => copy(websiteSchema, "WebSite")}>
                    {copied === "WebSite" ? "Copied!" : "Copy"}
                  </Button>
                </InlineStack>
                <SchemaPreview json={websiteSchema} />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Product Schemas */}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Product Schemas ({products.length})
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Auto-generated JSON-LD for each product. Shopify may already include basic product schema in your theme.
            </Text>
            {products.map((p: any) => (
              <Card key={p.handle}>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <InlineStack gap="200">
                      <Text as="h3" variant="headingSm">{p.title}</Text>
                      {!p.hasImage && <Badge tone="warning">No image</Badge>}
                      {!p.hasDescription && <Badge tone="warning">No description</Badge>}
                    </InlineStack>
                    <Button variant="plain" onClick={() => copy(p.schema, p.title)}>
                      {copied === p.title ? "Copied!" : "Copy"}
                    </Button>
                  </InlineStack>
                  <SchemaPreview json={p.schema} />
                </BlockStack>
              </Card>
            ))}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

function SchemaPreview({ json }: { json: string }) {
  return (
    <Box padding="300" background="bg-surface-secondary" borderRadius="200" overflowX="scroll">
      <pre style={{ margin: 0, fontSize: "11px", whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
        {`<script type="application/ld+json">\n${json}\n</script>`}
      </pre>
    </Box>
  );
}
