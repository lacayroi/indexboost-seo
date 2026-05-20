import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineGrid,
  Box,
  Badge,
  DataTable,
  Banner,
  Button,
  InlineStack,
  ProgressBar,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getOrCreateShop } from "../services/webhook-handler.server";
import { getGoogleQuotaStatus } from "../services/google-indexer.server";
import { processQueue } from "../services/queue.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  // Get current plan
  const { getPlan, getGoogleLimit } = await import("../services/require-plan.server");
  const currentPlan = await getPlan(admin);
  const googleLimit = getGoogleLimit(currentPlan);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  // Last 7 days stats
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  const [
    totalSubmissions,
    todaySubmissions,
    successCount,
    failedCount,
    recentLogs,
    queueCount,
    googleQuota,
    last7DaysSubmissions,
  ] = await Promise.all([
    db.submission.count({ where: { shopId: shop.id } }),
    db.submission.count({
      where: { shopId: shop.id, createdAt: { gte: todayStart } },
    }),
    db.submission.count({
      where: { shopId: shop.id, status: "success" },
    }),
    db.submission.count({
      where: { shopId: shop.id, status: "failed" },
    }),
    db.submission.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.queueItem.count({ where: { shopId: shop.id } }),
    getGoogleQuotaStatus(shop.id, googleLimit),
    // Get daily breakdown for last 7 days
    db.submission.findMany({
      where: { shopId: shop.id, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, status: true, engine: true },
    }),
  ]);

  // Build 7-day chart data
  const dailyStats: Array<{ date: string; google: number; indexnow: number; failed: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayStart = new Date(dateStr + "T00:00:00Z");
    const dayEnd = new Date(dateStr + "T23:59:59Z");

    const dayLogs = last7DaysSubmissions.filter(
      (s) => s.createdAt >= dayStart && s.createdAt <= dayEnd,
    );

    dailyStats.push({
      date: date.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }),
      google: dayLogs.filter((s) => s.engine === "google" && s.status === "success").length,
      indexnow: dayLogs.filter((s) => s.engine === "indexnow" && s.status === "success").length,
      failed: dayLogs.filter((s) => s.status === "failed").length,
    });
  }

  return json({
    shop: {
      domain: shop.domain,
      hasGoogle: !!shop.googleCredentials,
      hasIndexNow: !!shop.indexNowKey,
    },
    currentPlan,
    stats: {
      total: totalSubmissions,
      today: todaySubmissions,
      success: successCount,
      failed: failedCount,
      queued: queueCount,
      googleQuota,
    },
    dailyStats,
    recentLogs: recentLogs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const formData = await request.formData();

  if (formData.get("action") === "process_queue") {
    const processed = await processQueue(shop.id);
    return json({ success: true, processed });
  }

  return json({ success: false });
};

export default function Dashboard() {
  const { shop, currentPlan, stats, dailyStats, recentLogs } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const needsSetup = !shop.hasGoogle && !shop.hasIndexNow;
  const quotaPercent = Math.round((stats.googleQuota.used / stats.googleQuota.limit) * 100);
  const hasSubmitted = stats.total > 0;
  const hasFailedLogs = recentLogs.some((log: any) => log.status === "failed");
  const onboardingSteps = [
    {
      title: "Connect Google Indexing API",
      completed: shop.hasGoogle,
      action: { content: "Setup Google", url: "/app/settings" },
    },
    {
      title: "Submit your first URL",
      completed: hasSubmitted,
      action: { content: "Submit URL", url: "/app/submit" },
    },
    {
      title: "Enable automatic indexing",
      completed: shop.hasGoogle || shop.hasIndexNow,
      action: { content: "View Settings", url: "/app/settings" },
    },
  ];
  const completedSteps = onboardingSteps.filter((step) => step.completed).length;

  const rows = recentLogs.map((log: any) => [
    truncateUrl(log.url, 40),
    log.contentType,
    <Badge key={log.id} tone={log.engine === "google" ? "info" : "success"}>
      {log.engine === "google" ? "Google" : "Bing/Yandex"}
    </Badge>,
    <Badge
      key={`${log.id}-s`}
      tone={log.status === "success" ? "success" : "critical"}
    >
      {log.status}
    </Badge>,
    new Date(log.createdAt).toLocaleString(),
  ]);

  // Max value for chart scaling
  const maxDaily = Math.max(
    ...dailyStats.map((d) => d.google + d.indexnow + d.failed),
    1,
  );

  return (
    <Page>
      <TitleBar title="IndexBoost SEO" />
      <BlockStack gap="500">
        {needsSetup && (
          <Banner
            title="Setup required"
            tone="warning"
            action={{ content: "Go to Settings", url: "/app/settings" }}
          >
            <p>
              Configure Google Indexing API or IndexNow to start auto-indexing.
            </p>
          </Banner>
        )}

        {/* Plan badge */}
        <InlineStack gap="200" align="start">
          <Badge tone={currentPlan === "free" ? "attention" : "success"}>
            {`${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan`}
          </Badge>
          {currentPlan === "free" && (
            <Button url="/app/billing" variant="plain" size="slim">
              Upgrade
            </Button>
          )}
        </InlineStack>

        {/* Onboarding */}
        {completedSteps < onboardingSteps.length && (
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Get your store indexed faster
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Complete these setup steps to start sending important store URLs to search engines.
                  </Text>
                </BlockStack>
                <Badge tone={completedSteps === onboardingSteps.length ? "success" : "attention"}>
                  {`${completedSteps}/${onboardingSteps.length} completed`}
                </Badge>
              </InlineStack>
              <ProgressBar
                progress={(completedSteps / onboardingSteps.length) * 100}
                tone={completedSteps === onboardingSteps.length ? "success" : "highlight"}
              />
              <InlineGrid columns={{ xs: 1, md: 3 }} gap="300">
                {onboardingSteps.map((step, index) => (
                  <Box
                    key={step.title}
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {`${index + 1}. ${step.title}`}
                        </Text>
                        <Badge tone={step.completed ? "success" : "attention"}>
                          {step.completed ? "Completed" : "Pending"}
                        </Badge>
                      </InlineStack>
                      {!step.completed && (
                        <Button url={step.action.url} variant="primary">
                          {step.action.content}
                        </Button>
                      )}
                    </BlockStack>
                  </Box>
                ))}
              </InlineGrid>
            </BlockStack>
          </Card>
        )}

        {/* Stats cards */}
        <InlineGrid columns={{ xs: 2, md: 4 }} gap="400">
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">
                Today
              </Text>
              <Text as="p" variant="headingLg">
                {stats.today}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">
                Total
              </Text>
              <Text as="p" variant="headingLg">
                {stats.total}
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">
                Success Rate
              </Text>
              <Text as="p" variant="headingLg">
                {stats.total > 0
                  ? Math.round((stats.success / stats.total) * 100)
                  : 0}
                %
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">
                Google Quota
              </Text>
              <Text as="p" variant="headingLg">
                {stats.googleQuota.used}/{stats.googleQuota.limit}
              </Text>
              <ProgressBar
                progress={quotaPercent}
                tone={quotaPercent > 80 ? "critical" : "highlight"}
                size="small"
              />
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* 7-day chart */}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Last 7 Days
            </Text>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", height: "120px" }}>
              {dailyStats.map((day, i) => {
                const total = day.google + day.indexnow + day.failed;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Text as="span" variant="bodySm">
                      {total}
                    </Text>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "48px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        height: "80px",
                      }}
                    >
                      {day.google > 0 && (
                        <div
                          style={{
                            height: `${(day.google / maxDaily) * 80}px`,
                            background: "#4A90D9",
                            borderRadius: "2px 2px 0 0",
                          }}
                        />
                      )}
                      {day.indexnow > 0 && (
                        <div
                          style={{
                            height: `${(day.indexnow / maxDaily) * 80}px`,
                            background: "#50B83C",
                          }}
                        />
                      )}
                      {day.failed > 0 && (
                        <div
                          style={{
                            height: `${(day.failed / maxDaily) * 80}px`,
                            background: "#DE3618",
                            borderRadius: "0 0 2px 2px",
                          }}
                        />
                      )}
                    </div>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {day.date.split(",")[0]}
                    </Text>
                  </div>
                );
              })}
            </div>
            <InlineStack gap="400">
              <InlineStack gap="100">
                <div style={{ width: 12, height: 12, background: "#4A90D9", borderRadius: 2 }} />
                <Text as="span" variant="bodySm">Google</Text>
              </InlineStack>
              <InlineStack gap="100">
                <div style={{ width: 12, height: 12, background: "#50B83C", borderRadius: 2 }} />
                <Text as="span" variant="bodySm">IndexNow</Text>
              </InlineStack>
              <InlineStack gap="100">
                <div style={{ width: 12, height: 12, background: "#DE3618", borderRadius: 2 }} />
                <Text as="span" variant="bodySm">Failed</Text>
              </InlineStack>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Engine status + Queue */}
        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Engines
              </Text>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <Badge tone={shop.hasGoogle ? "success" : "warning"}>
                      {shop.hasGoogle ? "Active" : "Not configured"}
                    </Badge>
                    <Text as="span" variant="bodyMd">Google Indexing API</Text>
                  </InlineStack>
                  {!shop.hasGoogle && (
                    <Button url="/app/settings" variant="plain">
                      Setup Google
                    </Button>
                  )}
                </InlineStack>
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <Badge tone={shop.hasIndexNow ? "success" : "warning"}>
                      {shop.hasIndexNow ? "Active" : "Not configured"}
                    </Badge>
                    <Text as="span" variant="bodyMd">IndexNow</Text>
                  </InlineStack>
                  <Button url="/app/settings" variant="plain">
                    View Settings
                  </Button>
                </InlineStack>
                {shop.hasIndexNow && hasFailedLogs && (
                  <Banner tone="warning">
                    <Text as="p" variant="bodyMd">
                      Your storefront password may block IndexNow verification.
                    </Text>
                  </Banner>
                )}
              </BlockStack>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Queue
              </Text>
              {stats.queued > 0 ? (
                <>
                  <Text as="p" variant="bodyMd">
                    {stats.queued} items pending
                  </Text>
                  <fetcher.Form method="post">
                    <input type="hidden" name="action" value="process_queue" />
                    <Button submit loading={fetcher.state !== "idle"}>
                      Process Queue Now
                    </Button>
                  </fetcher.Form>
                </>
              ) : (
                <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Queue is clear
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      New product, collection, page, and blog updates will appear here before processing.
                    </Text>
                  </BlockStack>
                </Box>
              )}
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* Recent submissions */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">
                Recent Submissions
              </Text>
              <Button url="/app/logs" variant="plain">
                View All Logs
              </Button>
            </InlineStack>
            {hasFailedLogs && (
              <Banner tone="info">
                <Text as="p" variant="bodyMd">
                  Failures are usually caused by missing Google setup, storefront password protection, or search engine verification errors.
                </Text>
              </Banner>
            )}
            {rows.length > 0 ? (
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text"]}
                headings={["URL", "Type", "Engine", "Status", "Time"]}
                rows={rows}
              />
            ) : (
              <Box padding="500" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="300">
                  <Text as="p" variant="headingSm">
                    No submissions yet
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Submit your first URL manually or update store content to trigger automatic indexing.
                  </Text>
                  <Button url="/app/submit" variant="primary">
                    Submit URL
                  </Button>
                </BlockStack>
              </Box>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

function truncateUrl(url: string, maxLen: number): string {
  if (url.length <= maxLen) return url;
  return url.substring(0, maxLen - 3) + "...";
}
