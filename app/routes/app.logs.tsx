import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  DataTable,
  Badge,
  Filters,
  ChoiceList,
  Box,
  InlineStack,
  Pagination,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getOrCreateShop } from "../services/webhook-handler.server";
import { useState, useCallback } from "react";

const PAGE_SIZE = 20;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { getPlan, getLogRetentionDays } = await import("../services/require-plan.server");
  const plan = await getPlan(admin);
  const retentionDays = getLogRetentionDays(plan);
  const retentionDate = new Date();
  retentionDate.setUTCDate(retentionDate.getUTCDate() - retentionDays);
  const shop = await getOrCreateShop(session.shop);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const engine = url.searchParams.get("engine") || "";
  const status = url.searchParams.get("status") || "";
  const contentType = url.searchParams.get("contentType") || "";

  const where: any = { shopId: shop.id, createdAt: { gte: retentionDate } };
  if (engine) where.engine = engine;
  if (status) where.status = status;
  if (contentType) where.contentType = contentType;

  const [logs, total] = await Promise.all([
    db.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.submission.count({ where }),
  ]);

  return json({
    logs: logs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
};

export default function Logs() {
  const { logs, total, page, totalPages } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [engine, setEngine] = useState<string[]>(
    searchParams.get("engine") ? [searchParams.get("engine")!] : [],
  );
  const [status, setStatus] = useState<string[]>(
    searchParams.get("status") ? [searchParams.get("status")!] : [],
  );
  const [contentType, setContentType] = useState<string[]>(
    searchParams.get("contentType") ? [searchParams.get("contentType")!] : [],
  );

  const applyFilters = useCallback(
    (newEngine: string[], newStatus: string[], newContentType: string[]) => {
      const params = new URLSearchParams();
      if (newEngine.length) params.set("engine", newEngine[0]);
      if (newStatus.length) params.set("status", newStatus[0]);
      if (newContentType.length) params.set("contentType", newContentType[0]);
      params.set("page", "1");
      navigate(`/app/logs?${params.toString()}`);
    },
    [navigate],
  );

  const handleClearAll = useCallback(() => {
    setEngine([]);
    setStatus([]);
    setContentType([]);
    navigate("/app/logs");
  }, [navigate]);

  const filters = [
    {
      key: "engine",
      label: "Engine",
      filter: (
        <ChoiceList
          title="Engine"
          titleHidden
          choices={[
            { label: "Google", value: "google" },
            { label: "IndexNow (Bing/Yandex)", value: "indexnow" },
          ]}
          selected={engine}
          onChange={(val) => {
            setEngine(val);
            applyFilters(val, status, contentType);
          }}
        />
      ),
      shortcut: true,
    },
    {
      key: "status",
      label: "Status",
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: "Success", value: "success" },
            { label: "Failed", value: "failed" },
          ]}
          selected={status}
          onChange={(val) => {
            setStatus(val);
            applyFilters(engine, val, contentType);
          }}
        />
      ),
      shortcut: true,
    },
    {
      key: "contentType",
      label: "Content Type",
      filter: (
        <ChoiceList
          title="Content Type"
          titleHidden
          choices={[
            { label: "Product", value: "product" },
            { label: "Collection", value: "collection" },
            { label: "Page", value: "page" },
            { label: "Blog Post", value: "blog_post" },
          ]}
          selected={contentType}
          onChange={(val) => {
            setContentType(val);
            applyFilters(engine, status, val);
          }}
        />
      ),
      shortcut: true,
    },
  ];

  const rows = logs.map((log: any) => [
    truncateUrl(log.url, 50),
    log.contentType,
    <Badge key={log.id} tone={log.engine === "google" ? "info" : "success"}>
      {log.engine === "google" ? "Google" : "Bing/Yandex"}
    </Badge>,
    log.action,
    <Badge
      key={`${log.id}-s`}
      tone={log.status === "success" ? "success" : "critical"}
    >
      {log.status}
    </Badge>,
    log.errorMsg || "-",
    new Date(log.createdAt).toLocaleString(),
  ]);

  return (
    <Page>
      <TitleBar title="Submission Logs" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd" tone="subdued">
                {total} total submissions
              </Text>
              <Filters
                filters={filters}
                onClearAll={handleClearAll}
                queryValue=""
                onQueryChange={() => {}}
                onQueryClear={() => {}}
              />
              {rows.length > 0 ? (
                <DataTable
                  columnContentTypes={[
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                  ]}
                  headings={[
                    "URL",
                    "Type",
                    "Engine",
                    "Action",
                    "Status",
                    "Error",
                    "Time",
                  ]}
                  rows={rows}
                />
              ) : (
                <Box padding="400">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No submissions found.
                  </Text>
                </Box>
              )}
              {totalPages > 1 && (
                <Box padding="400">
                  <InlineStack align="center">
                    <Pagination
                      hasPrevious={page > 1}
                      hasNext={page < totalPages}
                      onPrevious={() => {
                        const params = new URLSearchParams(searchParams);
                        params.set("page", String(page - 1));
                        navigate(`/app/logs?${params.toString()}`);
                      }}
                      onNext={() => {
                        const params = new URLSearchParams(searchParams);
                        params.set("page", String(page + 1));
                        navigate(`/app/logs?${params.toString()}`);
                      }}
                    />
                  </InlineStack>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function truncateUrl(url: string, maxLen: number): string {
  if (url.length <= maxLen) return url;
  return url.substring(0, maxLen - 3) + "...";
}
