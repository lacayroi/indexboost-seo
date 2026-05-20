import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  Badge,
  Button,
  Banner,
  InlineGrid,
  DataTable,
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
  if (plan !== "business") {
    return json({ summary: null, recentAlerts: [], planBlocked: true, currentPlan: plan });
  }
  const shop = await getOrCreateShop(session.shop);

  const { getDailySummary, checkAndSendAlerts } = await import("../services/email-alerts.server");
  const summary = await getDailySummary(shop.id);
  const recentAlerts = await checkAndSendAlerts(shop.id, shop.domain);

  return json({ summary, recentAlerts, planBlocked: false, currentPlan: plan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { requirePlan } = await import("../services/require-plan.server");
  await requirePlan(admin, "business");

  const shop = await getOrCreateShop(session.shop);

  const { checkAndSendAlerts } = await import("../services/email-alerts.server");
  const alerts = await checkAndSendAlerts(shop.id, shop.domain);

  return json({ success: true, alerts, message: `Checked ${alerts.length} alert(s)` });
};

export default function Alerts() {
  const { summary, recentAlerts, planBlocked, currentPlan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message);
    }
  }, [fetcher.data, shopify]);

  return (
    <Page>
      <TitleBar title="Alerts & Monitoring" />
      <BlockStack gap="500">
        {planBlocked && (
          <UpgradeBanner currentPlan={currentPlan} requiredPlan="business" feature="Alerts & Monitoring" />
        )}

        {!planBlocked && summary && (
          <>
            <InlineGrid columns={{ xs: 2, md: 4 }} gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">Today Total</Text>
                  <Text as="p" variant="headingLg">{summary.total}</Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">Success</Text>
                  <Text as="p" variant="headingLg" tone="success">{summary.success}</Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">Failed</Text>
                  <Text as="p" variant="headingLg" tone="critical">{summary.failed}</Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm" tone="subdued">Google Used</Text>
                  <Text as="p" variant="headingLg">{summary.googleUsed}</Text>
                </BlockStack>
              </Card>
            </InlineGrid>

            {recentAlerts.length > 0 && (
              <Banner tone="warning" title="Active Alerts">
                <BlockStack gap="100">
                  {recentAlerts.map((alert, i) => (
                    <Text key={i} as="p" variant="bodyMd">{alert}</Text>
                  ))}
                </BlockStack>
              </Banner>
            )}

            {recentAlerts.length === 0 && (
              <Banner tone="success" title="All Clear">
                <Text as="p" variant="bodyMd">
                  No alerts at this time. Your indexing is running smoothly.
                </Text>
              </Banner>
            )}

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Alert Configuration</Text>
                <Text as="p" variant="bodyMd">
                  Alerts are automatically checked when indexing events occur. Current monitors:
                </Text>
                <DataTable
                  columnContentTypes={["text", "text", "text"]}
                  headings={["Alert Type", "Threshold", "Status"]}
                  rows={[
                    ["Google Quota Warning", "90% used (180/200)", <Badge key="q" tone="success">Active</Badge>],
                    ["Indexing Errors", "5+ failures/hour", <Badge key="e" tone="success">Active</Badge>],
                    ["Daily Summary", "End of day", <Badge key="d" tone="success">Active</Badge>],
                  ]}
                />
                <fetcher.Form method="post">
                  <Button submit loading={fetcher.state !== "idle"}>
                    Check Alerts Now
                  </Button>
                </fetcher.Form>
              </BlockStack>
            </Card>
          </>
        )}
      </BlockStack>
    </Page>
  );
}
