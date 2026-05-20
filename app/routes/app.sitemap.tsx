import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Button,
  Banner,
  Badge,
  InlineStack,
  Box,
  List,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { UpgradeBanner } from "../components/UpgradeBanner";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/webhook-handler.server";
import { submitSitemapToAll, getSitemapUrls } from "../services/sitemap.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { getPlan } = await import("../services/require-plan.server");
  const plan = await getPlan(admin);
  if (plan === "free") {
    return json({ shopDomain: "", sitemapUrl: "", urlCount: 0, planBlocked: true, currentPlan: plan });
  }
  const shop = await getOrCreateShop(session.shop);

  const sitemapUrl = `https://${shop.domain}/sitemap.xml`;
  let urlCount = 0;
  try {
    const urls = await getSitemapUrls(shop.domain);
    urlCount = urls.length;
  } catch {}

  return json({ shopDomain: shop.domain, sitemapUrl, urlCount, planBlocked: false, currentPlan: plan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { requirePlan } = await import("../services/require-plan.server");
  await requirePlan(admin, "pro");

  const shop = await getOrCreateShop(session.shop);

  const results = await submitSitemapToAll(shop.domain);
  return json({ success: true, results });
};

export default function Sitemap() {
  const { sitemapUrl, urlCount, planBlocked, currentPlan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const isLoading = fetcher.state !== "idle";

  return (
    <Page>
      <TitleBar title="Sitemap" />
      <BlockStack gap="500">
        {planBlocked && (
          <UpgradeBanner currentPlan={currentPlan} requiredPlan="pro" feature="Sitemap Submission" />
        )}
      </BlockStack>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Sitemap Submission
              </Text>
              <Text as="p" variant="bodyMd">
                Submit your store's sitemap to Google and Bing to help them
                discover all your pages.
              </Text>

              <Box
                padding="400"
                background="bg-surface-secondary"
                borderRadius="200"
              >
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    Sitemap URL
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {sitemapUrl}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {urlCount > 0
                      ? `${urlCount} URLs found in sitemap`
                      : "Could not fetch sitemap (store may not be publicly accessible)"}
                  </Text>
                </BlockStack>
              </Box>

              <fetcher.Form method="post">
                <Button submit variant="primary" loading={isLoading}>
                  Submit Sitemap to Google & Bing
                </Button>
              </fetcher.Form>

              {fetcher.data?.success && (
                <Banner tone="success" title="Sitemap submitted">
                  <BlockStack gap="100">
                    <InlineStack gap="200">
                      <Text as="span" variant="bodyMd">Google:</Text>
                      <Badge tone={fetcher.data.results.google.success ? "success" : "critical"}>
                        {fetcher.data.results.google.success ? "Submitted" : "Failed"}
                      </Badge>
                    </InlineStack>
                    <InlineStack gap="200">
                      <Text as="span" variant="bodyMd">Bing:</Text>
                      <Badge tone={fetcher.data.results.bing.success ? "success" : "critical"}>
                        {fetcher.data.results.bing.success ? "Submitted" : "Failed"}
                      </Badge>
                    </InlineStack>
                  </BlockStack>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                About Sitemaps
              </Text>
              <List>
                <List.Item>
                  Shopify auto-generates your sitemap
                </List.Item>
                <List.Item>
                  Includes products, collections, blogs, and pages
                </List.Item>
                <List.Item>
                  Submit after major content changes
                </List.Item>
                <List.Item>
                  Google and Bing will crawl URLs from the sitemap
                </List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
