import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  TextField,
  Button,
  Banner,
  Select,
  DataTable,
  Badge,
  Divider,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { UpgradeBanner } from "../components/UpgradeBanner";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/webhook-handler.server";
import { addToQueue, processQueue, submitUrlNow } from "../services/queue.server";
import { useState, useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { getPlan } = await import("../services/require-plan.server");
  const plan = await getPlan(admin);
  const shop = await getOrCreateShop(session.shop);

  // Fetch all products, collections for bulk indexing
  const productsResponse = await admin.graphql(
    `#graphql
    query {
      products(first: 50) {
        edges {
          node {
            handle
            title
            updatedAt
          }
        }
      }
    }`,
  );
  const productsData = await productsResponse.json();
  const products =
    productsData.data?.products?.edges?.map((e: any) => ({
      handle: e.node.handle,
      title: e.node.title,
    })) || [];

  const collectionsResponse = await admin.graphql(
    `#graphql
    query {
      collections(first: 50) {
        edges {
          node {
            handle
            title
          }
        }
      }
    }`,
  );
  const collectionsData = await collectionsResponse.json();
  const collections =
    collectionsData.data?.collections?.edges?.map((e: any) => ({
      handle: e.node.handle,
      title: e.node.title,
    })) || [];

  return json({
    shopDomain: shop.domain,
    hasGoogle: !!shop.googleCredentials,
    hasIndexNow: !!shop.indexNowKey,
    products,
    collections,
    planBlocked: plan === "free",
    currentPlan: plan,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  if (actionType === "submit_url") {
    const url = formData.get("url") as string;
    const contentType = formData.get("contentType") as string;

    if (!url) {
      return json({ success: false, error: "URL is required" });
    }

    // Validate URL format and restrict to http/https to prevent SSRF via arbitrary schemes
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return json({ success: false, error: "URL must use http or https" });
      }
    } catch {
      return json({ success: false, error: "Invalid URL format" });
    }

    const results = await submitUrlNow(shop.id, url, contentType || "page");
    return json({ success: true, results });
  }

  if (actionType === "bulk_index") {
    const { requirePlan } = await import("../services/require-plan.server");
    await requirePlan(admin, "pro");

    const urls = formData.get("urls") as string;
    if (!urls) {
      return json({ success: false, error: "No URLs provided" });
    }

    const rawList = urls.split("\n").map((u) => u.trim()).filter(Boolean);
    const urlList: string[] = [];
    for (const u of rawList) {
      try {
        const parsed = new URL(u);
        if (["http:", "https:"].includes(parsed.protocol)) urlList.push(u);
      } catch {
        // skip invalid URLs silently
      }
    }
    if (urlList.length === 0) {
      return json({ success: false, error: "No valid URLs provided" });
    }
    for (const url of urlList) {
      await addToQueue(shop.id, url, "product", "update", 1);
    }
    await processQueue(shop.id);

    return json({
      success: true,
      message: `${urlList.length} URLs queued for indexing`,
    });
  }

  return json({ success: false });
};

export default function Submit() {
  const { shopDomain, hasGoogle, hasIndexNow, products, collections, planBlocked, currentPlan } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const shopify = useAppBridge();

  const [url, setUrl] = useState("");
  const [contentType, setContentType] = useState("product");
  const isLoading = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message);
    }
  }, [fetcher.data, shopify]);

  // Build bulk URL list from products + collections
  const allUrls = [
    ...products.map(
      (p: any) => `https://${shopDomain}/products/${p.handle}`,
    ),
    ...collections.map(
      (c: any) => `https://${shopDomain}/collections/${c.handle}`,
    ),
  ];

  return (
    <Page>
      <TitleBar title="Submit URLs" />
      <BlockStack gap="500">
        {fetcher.data?.error && (
          <Banner tone="critical" title="Error">
            <p>{fetcher.data.error}</p>
          </Banner>
        )}
        {fetcher.data?.success && fetcher.data?.results && (
          <Banner tone="success" title="Submitted">
            <BlockStack gap="100">
              {fetcher.data.results.google && (
                <Text as="p" variant="bodyMd">
                  Google:{" "}
                  {fetcher.data.results.google.success
                    ? "Success"
                    : fetcher.data.results.google.error}
                </Text>
              )}
              {fetcher.data.results.indexnow && (
                <Text as="p" variant="bodyMd">
                  IndexNow:{" "}
                  {fetcher.data.results.indexnow.success
                    ? "Success"
                    : fetcher.data.results.indexnow.error}
                </Text>
              )}
            </BlockStack>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            {/* Manual Submit */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Submit Single URL
                </Text>
                <TextField
                  label="URL"
                  value={url}
                  onChange={setUrl}
                  placeholder={`https://${shopDomain}/products/example`}
                  autoComplete="off"
                />
                <Select
                  label="Content Type"
                  options={[
                    { label: "Product", value: "product" },
                    { label: "Collection", value: "collection" },
                    { label: "Page", value: "page" },
                    { label: "Blog Post", value: "blog_post" },
                  ]}
                  value={contentType}
                  onChange={setContentType}
                />
                <fetcher.Form method="post">
                  <input type="hidden" name="action" value="submit_url" />
                  <input type="hidden" name="url" value={url} />
                  <input type="hidden" name="contentType" value={contentType} />
                  <Button submit variant="primary" loading={isLoading}>
                    Submit Now
                  </Button>
                </fetcher.Form>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Engines
                </Text>
                <Badge tone={hasGoogle ? "success" : "attention"}>
                  {`Google: ${hasGoogle ? "Ready" : "Not configured"}`}
                </Badge>
                <Badge tone={hasIndexNow ? "success" : "attention"}>
                  {`IndexNow: ${hasIndexNow ? "Ready" : "Not configured"}`}
                </Badge>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Divider />

        {/* Bulk Index */}
        {planBlocked && (
          <UpgradeBanner currentPlan={currentPlan} requiredPlan="pro" feature="Bulk Indexing" />
        )}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Bulk Index All Content
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Submit all {products.length} products and {collections.length}{" "}
              collections to search engines. URLs will be queued and processed
              respecting Google's 200/day limit.
            </Text>
            <fetcher.Form method="post">
              <input type="hidden" name="action" value="bulk_index" />
              <input type="hidden" name="urls" value={allUrls.join("\n")} />
              <Button
                submit
                variant="primary"
                loading={isLoading}
                disabled={allUrls.length === 0}
              >
                {`Index All (${allUrls.length} URLs)`}
              </Button>
            </fetcher.Form>

            {allUrls.length > 0 && (
              <DataTable
                columnContentTypes={["text", "text"]}
                headings={["URL", "Type"]}
                rows={[
                  ...products.map((p: any) => [
                    `https://${shopDomain}/products/${p.handle}`,
                    "Product",
                  ]),
                  ...collections.map((c: any) => [
                    `https://${shopDomain}/collections/${c.handle}`,
                    "Collection",
                  ]),
                ]}
              />
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
