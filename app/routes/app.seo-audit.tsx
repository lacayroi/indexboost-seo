import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  Badge,
  DataTable,
  ProgressBar,
  InlineGrid,
  Box,
  Button,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { UpgradeBanner } from "../components/UpgradeBanner";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/webhook-handler.server";
import {
  auditProduct,
  auditCollection,
  getOverallScore,
  type SeoAuditResult,
} from "../services/seo-audit.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { getPlan } = await import("../services/require-plan.server");
  const plan = await getPlan(admin);
  if (plan === "free") {
    return json({ overallScore: 0, errorCount: 0, warningCount: 0, totalPages: 0, productResults: [], collectionResults: [], planBlocked: true, currentPlan: plan });
  }
  const shop = await getOrCreateShop(session.shop);

  const [productsRes, collectionsRes] = await Promise.all([
    admin.graphql(`#graphql
      query { products(first: 50) { edges { node {
        title handle
        seo { title description }
        bodyHtml
        images(first: 5) { edges { node { altText } } }
        variants(first: 1) { edges { node { price } } }
      }}}}
    `),
    admin.graphql(`#graphql
      query { collections(first: 50) { edges { node {
        title handle
        seo { title description }
        descriptionHtml
        image { altText }
      }}}}
    `),
  ]);

  const [productsData, collectionsData] = await Promise.all([
    productsRes.json(),
    collectionsRes.json(),
  ]);

  const productResults: SeoAuditResult[] = (productsData.data?.products?.edges || []).map(
    (e: any) => auditProduct(e.node, shop.domain),
  );
  const collectionResults: SeoAuditResult[] = (collectionsData.data?.collections?.edges || []).map(
    (e: any) => auditCollection(e.node, shop.domain),
  );

  const allResults = [...productResults, ...collectionResults];
  const overallScore = getOverallScore(allResults);

  const errorCount = allResults.reduce(
    (sum, r) => sum + r.issues.filter((i) => i.type === "error").length,
    0,
  );
  const warningCount = allResults.reduce(
    (sum, r) => sum + r.issues.filter((i) => i.type === "warning").length,
    0,
  );

  return json({
    overallScore,
    errorCount,
    warningCount,
    totalPages: allResults.length,
    productResults,
    collectionResults,
    planBlocked: false,
    currentPlan: plan,
  });
};

export default function SeoAudit() {
  const {
    overallScore,
    errorCount,
    warningCount,
    productResults,
    collectionResults,
    planBlocked,
    currentPlan,
  } = useLoaderData<typeof loader>();
  const typedProductResults = productResults as SeoAuditResult[];
  const typedCollectionResults = collectionResults as SeoAuditResult[];

  const scoreTone =
    overallScore >= 80 ? "success" : overallScore >= 50 ? "attention" : "critical";
  const progressTone =
    overallScore >= 80 ? "success" : overallScore >= 50 ? "highlight" : "critical";

  const buildRows = (results: SeoAuditResult[]) =>
    results.map((r) => [
      r.title,
      <ProgressBar
        key={r.url}
        progress={r.score}
        tone={r.score >= 80 ? "success" : r.score >= 50 ? "highlight" : "critical"}
        size="small"
      />,
      `${r.score}/100`,
      r.issues.filter((i) => i.type === "error").length,
      r.issues.filter((i) => i.type === "warning").length,
      <IssuesList key={`${r.url}-issues`} issues={r.issues} />,
    ]);

  return (
    <Page>
      <TitleBar title="SEO Audit" />
      <BlockStack gap="500">
        {planBlocked && (
          <UpgradeBanner currentPlan={currentPlan} requiredPlan="pro" feature="SEO Audit" />
        )}
        {/* Overview */}
        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">
                Overall SEO Score
              </Text>
              <Text as="p" variant="headingXl">
                <Badge tone={scoreTone} size="large">
                  {`${overallScore}/100`}
                </Badge>
              </Text>
              <ProgressBar progress={overallScore} tone={progressTone} />
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">
                Errors
              </Text>
              <Text as="p" variant="headingLg" tone="critical">
                {errorCount}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Critical issues that hurt SEO
              </Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">
                Warnings
              </Text>
              <Text as="p" variant="headingLg" tone="caution">
                {warningCount}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Improvements recommended
              </Text>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* Products Audit */}
        {typedProductResults.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Products ({typedProductResults.length})
              </Text>
              <DataTable
                columnContentTypes={["text", "text", "text", "numeric", "numeric", "text"]}
                headings={["Title", "Score", "", "Errors", "Warnings", "Issues"]}
                rows={buildRows(typedProductResults)}
              />
            </BlockStack>
          </Card>
        )}

        {/* Collections Audit */}
        {typedCollectionResults.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Collections ({typedCollectionResults.length})
              </Text>
              <DataTable
                columnContentTypes={["text", "text", "text", "numeric", "numeric", "text"]}
                headings={["Title", "Score", "", "Errors", "Warnings", "Issues"]}
                rows={buildRows(typedCollectionResults)}
              />
            </BlockStack>
          </Card>
        )}

        {!planBlocked && typedProductResults.length === 0 && typedCollectionResults.length === 0 && (
          <Card>
            <Box padding="500" background="bg-surface-secondary" borderRadius="200">
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  No pages available to audit
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Add products or collections to your store, then return here to review SEO titles, descriptions, images, and schema readiness.
                </Text>
                <Button url="/app/submit" variant="primary">
                  Submit a URL first
                </Button>
              </BlockStack>
            </Box>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}

function IssuesList({ issues }: { issues: SeoAuditResult["issues"] }) {
  if (issues.length === 0) {
    return <Badge tone="success">No issues</Badge>;
  }
  return (
    <BlockStack gap="100">
      {issues.slice(0, 3).map((issue, i) => (
        <Badge
          key={i}
          tone={
            issue.type === "error"
              ? "critical"
              : issue.type === "warning"
                ? "warning"
                : "info"
          }
        >
          {issue.message}
        </Badge>
      ))}
      {issues.length > 3 && (
        <Text as="span" variant="bodySm" tone="subdued">
          +{issues.length - 3} more
        </Text>
      )}
    </BlockStack>
  );
}
