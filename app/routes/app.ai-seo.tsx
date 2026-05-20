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
  Button,
  Banner,
  InlineGrid,
  InlineStack,
  Checkbox,
  ProgressBar,
  Box,
  Divider,
  Modal,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/webhook-handler.server";
import { useState, useEffect, useCallback } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const { getCreditsRemaining, seoScore } = await import("../services/ai-seo.server");
  const { getPlan } = await import("../services/require-plan.server");
  const plan = await getPlan(admin);
  const credits = await getCreditsRemaining(shop.id);

  const res = await admin.graphql(`#graphql
    query {
      products(first: 100) {
        pageInfo { hasNextPage }
        edges {
          node {
            id title handle description
            seo { title description }
            status
          }
        }
      }
    }
  `);

  const data = await res.json();
  const productsHasNextPage: boolean = data.data?.products?.pageInfo?.hasNextPage ?? false;
  const products = (data.data?.products?.edges || []).map((e: any) => {
    const p = e.node;
    const score = seoScore({
      seoTitle: p.seo?.title,
      seoDescription: p.seo?.description,
      title: p.title,
    });
    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      description: p.description || "",
      seoTitle: p.seo?.title || "",
      seoDescription: p.seo?.description || "",
      score: score.score,
      issues: score.issues,
    };
  });

  const totalProducts = products.length;
  const optimized = products.filter((p: any) => p.seoTitle && p.seoDescription).length;
  const missingTitle = products.filter((p: any) => !p.seoTitle).length;
  const missingDesc = products.filter((p: any) => !p.seoDescription).length;
  const lowScore = products.filter((p: any) => p.score < 50).length;
  const avgScore = totalProducts > 0
    ? Math.round(products.reduce((sum: number, p: any) => sum + p.score, 0) / totalProducts)
    : 0;

  return json({
    plan,
    credits,
    products,
    productsHasNextPage,
    stats: { totalProducts, optimized, missingTitle, missingDesc, lowScore, avgScore },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const formData = await request.formData();
  const actionType = formData.get("action") as string;
  const { generateSEO, consumeAiCredits, getCreditsRemaining } = await import("../services/ai-seo.server");

  if (actionType === "preview_bulk") {
    // Generate previews WITHOUT saving to Shopify
    const productsData = JSON.parse(formData.get("productsData") as string) as Array<{
      id: string; title: string; description: string; seoTitle: string; seoDescription: string;
    }>;

    const previews = [];
    for (const product of productsData) {
      const hasCredits = await consumeAiCredits(shop.id);
      if (!hasCredits) {
        previews.push({
          ...product,
          newTitle: "",
          newDescription: "",
          error: "No credits remaining",
        });
        break;
      }

      try {
        const seo = await generateSEO(product.title, product.description);
        previews.push({
          ...product,
          newTitle: seo.title,
          newDescription: seo.description,
        });
      } catch (error) {
        previews.push({
          ...product,
          newTitle: "",
          newDescription: "",
          error: error instanceof Error ? error.message : "Failed",
        });
      }
    }

    const creditsLeft = await getCreditsRemaining(shop.id);
    return json({ success: true, previews, creditsLeft });
  }

  if (actionType === "apply_bulk") {
    // Apply previously previewed changes to Shopify
    const changes = JSON.parse(formData.get("changes") as string) as Array<{
      id: string; newTitle: string; newDescription: string;
    }>;

    let succeeded = 0;
    let failed = 0;

    for (const change of changes) {
      try {
        await admin.graphql(
          `#graphql
          mutation updateProductSeo($input: ProductInput!) {
            productUpdate(input: $input) {
              product { id }
              userErrors { field message }
            }
          }`,
          { variables: { input: { id: change.id, seo: { title: change.newTitle, description: change.newDescription } } } },
        );
        succeeded++;
      } catch {
        failed++;
      }
    }

    return json({ success: true, message: `Applied to ${succeeded} products${failed > 0 ? `, ${failed} failed` : ""}` });
  }

  if (actionType === "generate_single") {
    const productId = formData.get("productId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    const hasCredits = await consumeAiCredits(shop.id);
    if (!hasCredits) {
      return json({ success: false, error: "No AI credits remaining. Upgrade your plan." });
    }

    try {
      const seo = await generateSEO(title, description);

      await admin.graphql(
        `#graphql
        mutation updateProductSeo($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id seo { title description } }
            userErrors { field message }
          }
        }`,
        { variables: { input: { id: productId, seo: { title: seo.title, description: seo.description } } } },
      );

      const creditsLeft = await getCreditsRemaining(shop.id);
      return json({ success: true, productId, seo, creditsLeft, message: "SEO generated and saved" });
    } catch (error) {
      return json({ success: false, error: error instanceof Error ? error.message : "AI generation failed" });
    }
  }

  return json({ success: false });
};

export default function AiSeo() {
  const { plan, credits: initialCredits, products, productsHasNextPage, stats } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const shopify = useAppBridge();
  const isLoading = fetcher.state !== "idle";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [credits, setCredits] = useState(initialCredits);
  const [previews, setPreviews] = useState<any[] | null>(null);
  const [applyChecked, setApplyChecked] = useState<Set<string>>(new Set());

  const isFree = plan === "free";
  const canBulk = plan !== "free";

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selected.size === products.length) setSelected(new Set());
    else setSelected(new Set(products.map((p: any) => p.id)));
  }, [products, selected.size]);

  useEffect(() => {
    if (fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message);
    }
    if (fetcher.data?.creditsLeft !== undefined) {
      setCredits(fetcher.data.creditsLeft);
    }
    if (fetcher.data?.previews) {
      setPreviews(fetcher.data.previews);
      setApplyChecked(new Set(
        fetcher.data.previews
          .filter((p: any) => p.newTitle && !p.error)
          .map((p: any) => p.id),
      ));
    }
  }, [fetcher.data, shopify]);

  const handlePreview = () => {
    const selectedProducts = products
      .filter((p: any) => selected.has(p.id))
      .map((p: any) => ({
        id: p.id, title: p.title, description: p.description,
        seoTitle: p.seoTitle, seoDescription: p.seoDescription,
      }));
    const form = new FormData();
    form.set("action", "preview_bulk");
    form.set("productsData", JSON.stringify(selectedProducts));
    fetcher.submit(form, { method: "post" });
  };

  const handleApply = () => {
    if (!previews) return;
    const changes = previews
      .filter((p) => applyChecked.has(p.id) && p.newTitle)
      .map((p) => ({ id: p.id, newTitle: p.newTitle, newDescription: p.newDescription }));
    const form = new FormData();
    form.set("action", "apply_bulk");
    form.set("changes", JSON.stringify(changes));
    fetcher.submit(form, { method: "post" });
    setPreviews(null);
  };

  const scoreTone = (s: number) =>
    s >= 80 ? "success" : s >= 50 ? "attention" : "critical";

  return (
    <Page>
      <TitleBar title="AI SEO Optimizer" />
      <BlockStack gap="500">
        {fetcher.data?.error && (
          <Banner tone="critical" title="Error">
            <p>{fetcher.data.error}</p>
          </Banner>
        )}

        {productsHasNextPage && (
          <Banner tone="info" title="Large catalog — showing first 100 products">
            <Text as="p" variant="bodyMd">
              Your store has more than 100 products. This page shows the first 100. Use bulk indexing or contact support for full-catalog optimization.
            </Text>
          </Banner>
        )}

        {/* Instant warnings - show issues immediately */}
        {(stats.missingTitle > 0 || stats.missingDesc > 0 || stats.lowScore > 0) && (
          <Banner
            tone="warning"
            title="SEO issues detected"
          >
            <BlockStack gap="100">
              {stats.missingTitle > 0 && (
                <Text as="p" variant="bodyMd">
                  {stats.missingTitle} product(s) missing SEO title
                </Text>
              )}
              {stats.missingDesc > 0 && (
                <Text as="p" variant="bodyMd">
                  {stats.missingDesc} product(s) missing meta description
                </Text>
              )}
              {stats.lowScore > 0 && (
                <Text as="p" variant="bodyMd">
                  {stats.lowScore} product(s) with low SEO score (&lt;50)
                </Text>
              )}
            </BlockStack>
          </Banner>
        )}

        {stats.missingTitle === 0 && stats.missingDesc === 0 && stats.avgScore >= 80 && (
          <Banner tone="success" title="Great SEO health!">
            <Text as="p" variant="bodyMd">
              All products have SEO titles and descriptions. Average score: {stats.avgScore}/100
            </Text>
          </Banner>
        )}

        {/* Stats */}
        <InlineGrid columns={{ xs: 2, md: 4 }} gap="400">
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">Products</Text>
              <Text as="p" variant="headingLg">{stats.totalProducts}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">Optimized</Text>
              <Text as="p" variant="headingLg">{stats.optimized}/{stats.totalProducts}</Text>
              <ProgressBar
                progress={stats.totalProducts > 0 ? (stats.optimized / stats.totalProducts) * 100 : 0}
                tone="highlight"
                size="small"
              />
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">Avg Score</Text>
              <Badge tone={scoreTone(stats.avgScore)} size="large">{`${stats.avgScore}/100`}</Badge>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">AI Credits</Text>
              <Text as="p" variant="headingLg">{credits}</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {isFree ? "10/month (Free)" : plan === "pro" ? "200/month (Pro)" : "1000/month (Business)"}
              </Text>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* Bulk actions - Pro/Business only */}
        {canBulk && selected.size > 0 && (
          <Card background="bg-surface-info">
            <BlockStack gap="200">
              <InlineStack gap="300" align="center">
                <Text as="span" variant="headingSm">
                  {selected.size} selected
                </Text>
                <Button
                  variant="primary"
                  loading={isLoading}
                  onClick={handlePreview}
                  disabled={credits < selected.size}
                >
                  {`Preview AI SEO (${selected.size} credits)`}
                </Button>
                {credits < selected.size && (
                  <Badge tone="critical">Not enough credits</Badge>
                )}
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                Credits are consumed when AI generates the preview. You can choose which changes to apply afterward.
              </Text>
            </BlockStack>
          </Card>
        )}

        {isFree && selected.size > 0 && (
          <Banner
            tone="warning"
            title="Bulk optimize requires Pro plan"
            action={{ content: "Upgrade to Pro", url: "/app/billing" }}
          >
            <Text as="p" variant="bodyMd">
              Free plan: single product optimize only (10 credits/month).
              Upgrade to Pro for bulk optimize with 200 credits.
            </Text>
          </Banner>
        )}

        {/* Products table */}
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">Products</Text>
              {canBulk && (
                <Button onClick={selectAll} variant="plain">
                  {selected.size === products.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </InlineStack>

            <DataTable
              columnContentTypes={["text", "text", "text", "text", "text", "text"]}
              headings={[
                canBulk ? "" : "",
                "Product",
                "SEO Title",
                "Meta Description",
                "Score",
                "Action",
              ]}
              rows={products.map((p: any) => [
                canBulk ? (
                  <Checkbox
                    key={`cb-${p.id}`}
                    label=""
                    labelHidden
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                  />
                ) : "",
                p.title,
                p.seoTitle ? (
                  <Text key={`t-${p.id}`} as="span" variant="bodySm">
                    {p.seoTitle.substring(0, 35)}{p.seoTitle.length > 35 ? "..." : ""}
                  </Text>
                ) : (
                  <Badge key={`t-${p.id}`} tone="critical">Missing</Badge>
                ),
                p.seoDescription ? (
                  <Text key={`d-${p.id}`} as="span" variant="bodySm">
                    {p.seoDescription.substring(0, 35)}{p.seoDescription.length > 35 ? "..." : ""}
                  </Text>
                ) : (
                  <Badge key={`d-${p.id}`} tone="critical">Missing</Badge>
                ),
                <Badge key={`s-${p.id}`} tone={scoreTone(p.score)}>{String(p.score)}</Badge>,
                <fetcher.Form key={`f-${p.id}`} method="post" style={{ display: "inline" }}>
                  <input type="hidden" name="action" value="generate_single" />
                  <input type="hidden" name="productId" value={p.id} />
                  <input type="hidden" name="title" value={p.title} />
                  <input type="hidden" name="description" value={p.description} />
                  <Button submit size="slim" loading={isLoading} disabled={credits < 1}>
                    {credits < 1 ? "No credits" : "Generate"}
                  </Button>
                </fetcher.Form>,
              ])}
            />
          </BlockStack>
        </Card>

        {credits < 1 && (
          <Banner
            tone="critical"
            title="Out of AI credits"
            action={{ content: "Upgrade Plan", url: "/app/billing" }}
          >
            <Text as="p" variant="bodyMd">
              You've used all your AI credits this month. Upgrade to get more.
            </Text>
          </Banner>
        )}

        {/* Preview modal - old vs new */}
        {previews && previews.length > 0 && (
          <Modal
            open
            onClose={() => setPreviews(null)}
            title="Preview AI SEO Changes"
            primaryAction={{ content: `Apply ${applyChecked.size} changes`, onAction: handleApply, loading: isLoading }}
            secondaryActions={[{ content: "Cancel", onAction: () => setPreviews(null) }]}
          >
            <Modal.Section>
              <BlockStack gap="400">
                {previews.map((p: any) => (
                  <Card key={p.id}>
                    <BlockStack gap="300">
                      <InlineStack gap="200">
                        <Checkbox
                          label=""
                          labelHidden
                          checked={applyChecked.has(p.id)}
                          onChange={() => {
                            setApplyChecked((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id);
                              else next.add(p.id);
                              return next;
                            });
                          }}
                        />
                        <Text as="h3" variant="headingSm">{p.title}</Text>
                        {p.error && <Badge tone="critical">{p.error}</Badge>}
                      </InlineStack>

                      {!p.error && (
                        <>
                          <Divider />
                          <InlineGrid columns={2} gap="400">
                            <Box>
                              <BlockStack gap="100">
                                <Text as="p" variant="headingSm" tone="subdued">Old Title</Text>
                                <Text as="p" variant="bodyMd">
                                  {p.seoTitle || <Badge tone="critical">Missing</Badge>}
                                </Text>
                              </BlockStack>
                            </Box>
                            <Box>
                              <BlockStack gap="100">
                                <Text as="p" variant="headingSm" tone="success">New Title</Text>
                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                  {p.newTitle}
                                </Text>
                                <Text as="p" variant="bodySm" tone="subdued">{p.newTitle.length}/70 chars</Text>
                              </BlockStack>
                            </Box>
                          </InlineGrid>
                          <InlineGrid columns={2} gap="400">
                            <Box>
                              <BlockStack gap="100">
                                <Text as="p" variant="headingSm" tone="subdued">Old Description</Text>
                                <Text as="p" variant="bodyMd">
                                  {p.seoDescription || <Badge tone="critical">Missing</Badge>}
                                </Text>
                              </BlockStack>
                            </Box>
                            <Box>
                              <BlockStack gap="100">
                                <Text as="p" variant="headingSm" tone="success">New Description</Text>
                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                  {p.newDescription}
                                </Text>
                                <Text as="p" variant="bodySm" tone="subdued">{p.newDescription.length}/160 chars</Text>
                              </BlockStack>
                            </Box>
                          </InlineGrid>
                        </>
                      )}
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            </Modal.Section>
          </Modal>
        )}
      </BlockStack>
    </Page>
  );
}
