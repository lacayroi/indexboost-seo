import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  Badge,
  Banner,
  InlineGrid,
  DataTable,
  ProgressBar,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { UpgradeBanner } from "../components/UpgradeBanner";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getOrCreateShop } from "../services/webhook-handler.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { getPlan } = await import("../services/require-plan.server");
  const plan = await getPlan(admin);
  if (plan !== "business") {
    return json({ stats: null, urlStatuses: [], planBlocked: true, currentPlan: plan });
  }
  const shop = await getOrCreateShop(session.shop);

  // Aggregate submission data to determine index health
  const [productsRes, collectionsRes] = await Promise.all([
    admin.graphql(`#graphql
      query { products(first: 50) { edges { node { title handle } } } }
    `),
    admin.graphql(`#graphql
      query { collections(first: 50) { edges { node { title handle } } } }
    `),
  ]);

  const [productsData, collectionsData] = await Promise.all([
    productsRes.json(),
    collectionsRes.json(),
  ]);

  // Build URL list and check submission history
  const allUrls = [
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
  ];

  // Check last successful submission for each URL
  const urlStatuses = await Promise.all(
    allUrls.map(async (item) => {
      const lastGoogle = await db.submission.findFirst({
        where: { shopId: shop.id, url: item.url, engine: "google", status: "success" },
        orderBy: { createdAt: "desc" },
      });
      const lastIndexNow = await db.submission.findFirst({
        where: { shopId: shop.id, url: item.url, engine: "indexnow", status: "success" },
        orderBy: { createdAt: "desc" },
      });

      return {
        ...item,
        googleSubmitted: lastGoogle?.createdAt?.toISOString() || null,
        indexNowSubmitted: lastIndexNow?.createdAt?.toISOString() || null,
        status: lastGoogle || lastIndexNow ? "submitted" : "not_submitted",
      };
    }),
  );

  const submitted = urlStatuses.filter((u) => u.status === "submitted").length;
  const notSubmitted = urlStatuses.filter((u) => u.status === "not_submitted").length;
  const healthScore = allUrls.length > 0 ? Math.round((submitted / allUrls.length) * 100) : 0;

  return json({
    stats: { total: allUrls.length, submitted, notSubmitted, healthScore },
    urlStatuses,
    planBlocked: false,
    currentPlan: plan,
  });
};

export default function IndexHealth() {
  const { stats, urlStatuses, planBlocked, currentPlan } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Index Health Check" />
      <BlockStack gap="500">
        {planBlocked && (
          <UpgradeBanner currentPlan={currentPlan} requiredPlan="business" feature="Index Health Check" />
        )}

        {!planBlocked && stats && (
          <>
            <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">Health Score</Text>
                  <Text as="p" variant="headingXl">
                    <Badge
                      tone={stats.healthScore >= 80 ? "success" : stats.healthScore >= 50 ? "attention" : "critical"}
                      size="large"
                    >
                      {`${stats.healthScore}%`}
                    </Badge>
                  </Text>
                  <ProgressBar
                    progress={stats.healthScore}
                    tone={stats.healthScore >= 80 ? "success" : stats.healthScore >= 50 ? "highlight" : "critical"}
                  />
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">Submitted</Text>
                  <Text as="p" variant="headingLg" tone="success">{stats.submitted}</Text>
                  <Text as="p" variant="bodySm" tone="subdued">of {stats.total} total URLs</Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">Not Submitted</Text>
                  <Text as="p" variant="headingLg" tone="critical">{stats.notSubmitted}</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {stats.notSubmitted > 0 ? "Use Submit URLs to index these" : "All URLs covered"}
                  </Text>
                </BlockStack>
              </Card>
            </InlineGrid>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">URL Index Status</Text>
                <DataTable
                  columnContentTypes={["text", "text", "text", "text", "text"]}
                  headings={["Page", "Type", "Google", "Bing/Yandex", "Status"]}
                  rows={urlStatuses.map((u: any) => [
                    u.title,
                    <Badge key={u.url} tone="info">{u.type}</Badge>,
                    u.googleSubmitted
                      ? <Badge key={`${u.url}-g`} tone="success">{new Date(u.googleSubmitted).toLocaleDateString()}</Badge>
                      : <Badge key={`${u.url}-g`} tone="attention">Not submitted</Badge>,
                    u.indexNowSubmitted
                      ? <Badge key={`${u.url}-i`} tone="success">{new Date(u.indexNowSubmitted).toLocaleDateString()}</Badge>
                      : <Badge key={`${u.url}-i`} tone="attention">Not submitted</Badge>,
                    <Badge
                      key={`${u.url}-s`}
                      tone={u.status === "submitted" ? "success" : "critical"}
                    >
                      {u.status === "submitted" ? "Indexed" : "Pending"}
                    </Badge>,
                  ])}
                />
              </BlockStack>
            </Card>

            <Banner tone="info">
              <Text as="p" variant="bodyMd">
                Health score is based on submission history. A URL marked "Indexed" means
                it was successfully submitted to at least one search engine. Actual indexing
                status depends on the search engine's crawl schedule.
              </Text>
            </Banner>
          </>
        )}
      </BlockStack>
    </Page>
  );
}
