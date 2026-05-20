import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  DataTable,
  Badge,
  Banner,
  Button,
  InlineGrid,
  Box,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { UpgradeBanner } from "../components/UpgradeBanner";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/webhook-handler.server";
import { useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { getPlan } = await import("../services/require-plan.server");
  const plan = await getPlan(admin);
  if (plan === "free") {
    return json({ shopDomain: "", urls: [], hasNextPage: false, results: null, planBlocked: true, currentPlan: plan });
  }
  const shop = await getOrCreateShop(session.shop);

  // Get all URLs to check
  const [productsRes, collectionsRes, pagesRes] = await Promise.all([
    admin.graphql(`#graphql
      query { products(first: 50) { pageInfo { hasNextPage } edges { node { title handle } } } }
    `),
    admin.graphql(`#graphql
      query { collections(first: 50) { pageInfo { hasNextPage } edges { node { title handle } } } }
    `),
    admin.graphql(`#graphql
      query { pages(first: 50) { pageInfo { hasNextPage } edges { node { title handle } } } }
    `),
  ]);

  const [productsData, collectionsData, pagesData] = await Promise.all([
    productsRes.json(),
    collectionsRes.json(),
    pagesRes.json(),
  ]);

  const hasNextPage: boolean =
    (productsData.data?.products?.pageInfo?.hasNextPage ?? false) ||
    (collectionsData.data?.collections?.pageInfo?.hasNextPage ?? false) ||
    (pagesData.data?.pages?.pageInfo?.hasNextPage ?? false);

  const urls = [
    ...(productsData.data?.products?.edges || []).map((e: any) => ({
      title: e.node.title,
      url: `https://${shop.domain}/products/${e.node.handle}`,
      type: "product",
    })),
    ...(collectionsData.data?.collections?.edges || []).map((e: any) => ({
      title: e.node.title,
      url: `https://${shop.domain}/collections/${e.node.handle}`,
      type: "collection",
    })),
    ...(pagesData.data?.pages?.edges || []).map((e: any) => ({
      title: e.node.title,
      url: `https://${shop.domain}/pages/${e.node.handle}`,
      type: "page",
    })),
  ];

  return json({ shopDomain: shop.domain, urls, hasNextPage, results: null, planBlocked: false, currentPlan: plan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { requirePlan } = await import("../services/require-plan.server");
  await requirePlan(admin, "pro");

  const formData = await request.formData();

  if (formData.get("action") === "scan") {
    const urlsRaw = formData.get("urls") as string;
    const urls = JSON.parse(urlsRaw) as Array<{ title: string; url: string; type: string }>;

    const results = [];
    for (const item of urls) {
      try {
        const response = await fetch(item.url, {
          method: "HEAD",
          redirect: "follow",
          signal: AbortSignal.timeout(10000),
        });
        results.push({
          ...item,
          status: response.status,
          ok: response.ok,
          redirected: response.redirected,
          finalUrl: response.url,
        });
      } catch (error) {
        results.push({
          ...item,
          status: 0,
          ok: false,
          redirected: false,
          finalUrl: "",
          error: error instanceof Error ? error.message : "Connection failed",
        });
      }
    }

    const broken = results.filter((r) => !r.ok);
    const redirected = results.filter((r) => r.redirected);

    return json({ results, broken: broken.length, redirected: redirected.length, total: results.length });
  }

  return json({ results: null });
};

export default function BrokenLinks() {
  const { urls, hasNextPage, planBlocked, currentPlan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const shopify = useAppBridge();
  const isLoading = fetcher.state !== "idle";
  const results = fetcher.data?.results;

  useEffect(() => {
    if (results) {
      shopify.toast.show(`Scan complete: ${fetcher.data.broken} broken links found`);
    }
  }, [results, shopify, fetcher.data]);

  return (
    <Page>
      <TitleBar title="Broken Link Scanner" />
      <BlockStack gap="500">
        {planBlocked && (
          <UpgradeBanner currentPlan={currentPlan} requiredPlan="pro" feature="Broken Link Scanner" />
        )}
        {!planBlocked && hasNextPage && (
          <Banner tone="info" title="Large catalog — showing first 50 URLs per type">
            <Text as="p" variant="bodyMd">
              Your store has more content than shown. The scan covers the first 50 products, 50 collections, and 50 pages.
            </Text>
          </Banner>
        )}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Scan Store Links
            </Text>
            <Text as="p" variant="bodyMd">
              Check all {urls.length} URLs in your store for broken links, 404
              errors, and redirects.
            </Text>
            <fetcher.Form method="post">
              <input type="hidden" name="action" value="scan" />
              <input type="hidden" name="urls" value={JSON.stringify(urls)} />
              <Button submit variant="primary" loading={isLoading}>
                {isLoading ? "Scanning..." : `Scan ${urls.length} URLs`}
              </Button>
            </fetcher.Form>
          </BlockStack>
        </Card>

        {results && (
          <>
            <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">Total Checked</Text>
                  <Text as="p" variant="headingLg">{fetcher.data.total}</Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">Broken</Text>
                  <Text as="p" variant="headingLg" tone="critical">{fetcher.data.broken}</Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">Redirected</Text>
                  <Text as="p" variant="headingLg" tone="caution">{fetcher.data.redirected}</Text>
                </BlockStack>
              </Card>
            </InlineGrid>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Results</Text>
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["Page", "Type", "Status", "Details"]}
                  rows={results.map((r: any) => [
                    r.title,
                    <Badge key={r.url} tone="info">{r.type}</Badge>,
                    <Badge
                      key={`${r.url}-s`}
                      tone={r.ok ? "success" : r.status === 0 ? "critical" : "warning"}
                    >
                      {r.status === 0 ? "Error" : r.status}
                    </Badge>,
                    r.error || (r.redirected ? `Redirected to ${r.finalUrl}` : "OK"),
                  ])}
                />
              </BlockStack>
            </Card>
          </>
        )}

        {!results && !planBlocked && (
          <Card>
            <Box padding="500">
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  No scan results yet
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Run your first scan to find broken URLs, unavailable pages, and unexpected redirects.
                </Text>
                <fetcher.Form method="post">
                  <input type="hidden" name="action" value="scan" />
                  <input type="hidden" name="urls" value={JSON.stringify(urls)} />
                  <Button submit variant="primary" loading={isLoading}>
                    Start Scan
                  </Button>
                </fetcher.Form>
              </BlockStack>
            </Box>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
