import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Button,
  Badge,
  Banner,
  Box,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { UpgradeBanner } from "../components/UpgradeBanner";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/webhook-handler.server";
import { generateLlmsTxt, generateLlmsFullTxt } from "../services/llms-txt.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { getPlan } = await import("../services/require-plan.server");
  const plan = await getPlan(admin);
  if (plan === "free") {
    return json({ shopDomain: "", llmsTxt: "", llmsFullTxt: "", stats: { products: 0, collections: 0, pages: 0 }, planBlocked: true, currentPlan: plan });
  }
  const shop = await getOrCreateShop(session.shop);

  // Fetch store data
  const [productsRes, collectionsRes, pagesRes, shopRes] = await Promise.all([
    admin.graphql(`#graphql
      query { products(first: 100) { edges { node {
        title handle description
        priceRangeV2 { minVariantPrice { amount } }
      }}}}
    `),
    admin.graphql(`#graphql
      query { collections(first: 50) { edges { node {
        title handle description
      }}}}
    `),
    admin.graphql(`#graphql
      query { pages(first: 50) { edges { node { title handle }}}}
    `),
    admin.graphql(`#graphql
      query { shop { name description }}
    `),
  ]);

  const [productsData, collectionsData, pagesData, shopData] = await Promise.all([
    productsRes.json(),
    collectionsRes.json(),
    pagesRes.json(),
    shopRes.json(),
  ]);

  const storeData = {
    shopName: shopData.data?.shop?.name || shop.domain,
    shopDomain: shop.domain,
    description: shopData.data?.shop?.description || "",
    products: (productsData.data?.products?.edges || []).map((e: any) => ({
      title: e.node.title,
      handle: e.node.handle,
      description: e.node.description,
      price: e.node.priceRangeV2?.minVariantPrice?.amount,
    })),
    collections: (collectionsData.data?.collections?.edges || []).map((e: any) => ({
      title: e.node.title,
      handle: e.node.handle,
      description: e.node.description,
    })),
    pages: (pagesData.data?.pages?.edges || []).map((e: any) => ({
      title: e.node.title,
      handle: e.node.handle,
    })),
  };

  const llmsTxt = generateLlmsTxt(storeData);
  const llmsFullTxt = generateLlmsFullTxt(storeData);

  return json({
    shopDomain: shop.domain,
    llmsTxt,
    llmsFullTxt,
    stats: {
      products: storeData.products.length,
      collections: storeData.collections.length,
      pages: storeData.pages.length,
    },
    planBlocked: false,
    currentPlan: plan,
  });
};

export default function LlmsTxt() {
  const { shopDomain, llmsTxt, llmsFullTxt, stats, planBlocked, currentPlan } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const [copied, setCopied] = useState("");

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    shopify.toast.show(`${label} copied to clipboard`);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <Page>
      <TitleBar title="LLMs.txt Generator" />
      <BlockStack gap="500">
        {planBlocked && (
          <UpgradeBanner currentPlan={currentPlan} requiredPlan="pro" feature="LLMs.txt Generator" />
        )}
        <Banner tone="info" title="What is LLMs.txt?">
          <Text as="p" variant="bodyMd">
            LLMs.txt is a standard file that helps AI search engines (ChatGPT,
            Claude, Perplexity) understand your store content. Place these files
            at your domain root to improve AI search visibility.
          </Text>
        </Banner>

        <InlineStack gap="300">
          <Badge tone="info">{`${stats.products} products`}</Badge>
          <Badge tone="info">{`${stats.collections} collections`}</Badge>
          <Badge tone="info">{`${stats.pages} pages`}</Badge>
        </InlineStack>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    llms.txt (Summary)
                  </Text>
                  <Button
                    variant="plain"
                    onClick={() => copyToClipboard(llmsTxt, "llms.txt")}
                  >
                    {copied === "llms.txt" ? "Copied!" : "Copy"}
                  </Button>
                </InlineStack>
                <Text as="p" variant="bodySm" tone="subdued">
                  Place at: https://{shopDomain}/llms.txt
                </Text>
                <Box
                  padding="400"
                  background="bg-surface-secondary"
                  borderRadius="200"
                  overflowX="scroll"
                >
                  <pre style={{ margin: 0, fontSize: "12px", whiteSpace: "pre-wrap" }}>
                    {llmsTxt}
                  </pre>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    llms-full.txt (Detailed)
                  </Text>
                  <Button
                    variant="plain"
                    onClick={() => copyToClipboard(llmsFullTxt, "llms-full.txt")}
                  >
                    {copied === "llms-full.txt" ? "Copied!" : "Copy"}
                  </Button>
                </InlineStack>
                <Text as="p" variant="bodySm" tone="subdued">
                  Place at: https://{shopDomain}/llms-full.txt
                </Text>
                <Box
                  padding="400"
                  background="bg-surface-secondary"
                  borderRadius="200"
                  overflowX="scroll"
                >
                  <pre style={{ margin: 0, fontSize: "12px", whiteSpace: "pre-wrap", maxHeight: "400px" }}>
                    {llmsFullTxt}
                  </pre>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              How to install
            </Text>
            <Text as="p" variant="bodyMd">
              1. Copy the content above
            </Text>
            <Text as="p" variant="bodyMd">
              2. In your Shopify theme, go to Content {'>'} Files
            </Text>
            <Text as="p" variant="bodyMd">
              3. Upload as llms.txt and llms-full.txt
            </Text>
            <Text as="p" variant="bodyMd">
              4. Or use the App Proxy to serve it automatically (coming soon)
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
