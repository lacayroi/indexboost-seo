import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  Badge,
  Banner,
  InlineGrid,
  InlineStack,
  Thumbnail,
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
  if (plan !== "business") {
    return json({ shopDomain: "", products: [], totalImages: 0, missingAlt: 0, filenameSuggestions: [], productsHasNextPage: false, planBlocked: true, currentPlan: plan });
  }
  const shop = await getOrCreateShop(session.shop);

  const res = await admin.graphql(`#graphql
    query {
      products(first: 50) {
        pageInfo { hasNextPage }
        edges {
          node {
            id
            title
            handle
            productType
            vendor
            variants(first: 20) {
              edges {
                node {
                  title
                  selectedOptions { name value }
                }
              }
            }
            images(first: 10) {
              edges {
                node {
                  id
                  url
                  altText
                  width
                  height
                }
              }
            }
          }
        }
      }
    }
  `);

  const data = await res.json();
  const productsHasNextPage: boolean = data.data?.products?.pageInfo?.hasNextPage ?? false;
  const { generateAltText, generateFileName } = await import("../services/smart-alt-text.server");

  const products = (data.data?.products?.edges || []).map((e: any) => {
    const p = e.node;
    const variants = (p.variants?.edges || []).map((v: any) => v.node);
    const images = (p.images?.edges || []).map((img: any, idx: number) => {
      const totalImages = p.images?.edges?.length || 1;
      const suggestedAlt = generateAltText(
        { title: p.title, productType: p.productType, vendor: p.vendor, variants },
        idx,
        totalImages,
      );
      const fileInfo = generateFileName(p.handle, idx, img.node.url);

      return {
        id: img.node.id,
        url: img.node.url,
        altText: img.node.altText || "",
        suggestedAlt,
        currentFile: fileInfo.current,
        suggestedFile: fileInfo.suggested,
        width: img.node.width,
        height: img.node.height,
      };
    });

    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      productType: p.productType,
      vendor: p.vendor,
      images,
    };
  });

  const totalImages = products.reduce((sum: number, p: any) => sum + p.images.length, 0);
  const missingAlt = products.reduce(
    (sum: number, p: any) => sum + p.images.filter((i: any) => !i.altText).length,
    0,
  );

  return json({ shopDomain: shop.domain, products, totalImages, missingAlt, productsHasNextPage, planBlocked: false, currentPlan: plan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { requirePlan } = await import("../services/require-plan.server");
  await requirePlan(admin, "business");

  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  if (actionType === "apply_alt_text") {
    const updatesRaw = formData.get("updates") as string;
    const updates: Array<{ productId: string; imageId: string; altText: string }> = JSON.parse(updatesRaw);

    // Group updates by productId so we send one mutation per product, not one per image.
    // This reduces API call count from O(images) to O(products), avoiding Shopify rate limits.
    const byProduct = new Map<string, Array<{ id: string; altText: string }>>();
    for (const u of updates) {
      const imgs = byProduct.get(u.productId) ?? [];
      imgs.push({ id: u.imageId, altText: u.altText });
      byProduct.set(u.productId, imgs);
    }

    let succeeded = 0;
    let failed = 0;

    for (const [productId, images] of byProduct) {
      try {
        const res = await admin.graphql(
          `#graphql
          mutation updateProductImages($input: ProductInput!) {
            productUpdate(input: $input) {
              product { id }
              userErrors { field message }
            }
          }`,
          {
            variables: {
              input: { id: productId, images },
            },
          },
        );

        const data = await res.json();
        const errors = data.data?.productUpdate?.userErrors || [];
        if (errors.length > 0) {
          failed += images.length;
        } else {
          succeeded += images.length;
        }
      } catch {
        failed += images.length;
      }
    }

    return json({
      success: true,
      message: `Updated ${succeeded} images${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  }

  return json({ success: false });
};

export default function ImageSeo() {
  const { products, totalImages, missingAlt, productsHasNextPage, planBlocked, currentPlan } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const shopify = useAppBridge();
  const isLoading = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.message) {
      shopify.toast.show(fetcher.data.message);
    }
  }, [fetcher.data, shopify]);

  const altScore =
    totalImages > 0
      ? Math.round(((totalImages - missingAlt) / totalImages) * 100)
      : 100;

  // Build updates for all missing alt text
  const allUpdates = products.flatMap((p: any) =>
    p.images
      .filter((img: any) => !img.altText)
      .map((img: any) => ({
        productId: p.id,
        imageId: img.id,
        altText: img.suggestedAlt,
      })),
  );

  return (
    <Page>
      <TitleBar title="Image SEO" />
      <BlockStack gap="500">
        {planBlocked && (
          <UpgradeBanner currentPlan={currentPlan} requiredPlan="business" feature="Image SEO" />
        )}

        {!planBlocked && productsHasNextPage && (
          <Banner tone="info" title="Large catalog — showing first 50 products">
            <Text as="p" variant="bodyMd">
              Your store has more than 50 products. This page shows the first 50. Remaining products can be processed on subsequent visits.
            </Text>
          </Banner>
        )}

        {/* Stats */}
        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">Total Images</Text>
              <Text as="p" variant="headingLg">{totalImages}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">Missing Alt Text</Text>
              <Text as="p" variant="headingLg" tone="critical">{missingAlt}</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">Alt Text Score</Text>
              <Text as="p" variant="headingLg">{altScore}%</Text>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* Bulk apply */}
        {missingAlt > 0 && !planBlocked && (
          <Banner
            tone="warning"
            title={`${missingAlt} images missing alt text`}
            action={{
              content: `Apply Smart Alt Text (${allUpdates.length} images)`,
              loading: isLoading,
              onAction: () => {
                const form = new FormData();
                form.set("action", "apply_alt_text");
                form.set("updates", JSON.stringify(allUpdates));
                fetcher.submit(form, { method: "post" });
              },
            }}
          >
            <Text as="p" variant="bodyMd">
              Generate SEO-optimized alt text based on product title, type, vendor,
              and variant information.
            </Text>
          </Banner>
        )}

        {/* Product images with suggestions */}
        {!planBlocked && products.map((product: any) => (
          <Card key={product.id}>
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">{product.title}</Text>
                <Badge
                  tone={product.images.every((i: any) => i.altText) ? "success" : "attention"}
                >
                  {`${product.images.filter((i: any) => i.altText).length}/${product.images.length} alt text`}
                </Badge>
              </InlineStack>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "12px" }}>
                {product.images.map((img: any) => (
                  <Box key={img.id} padding="300" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="200">
                      <Thumbnail source={img.url} alt={img.altText || ""} size="large" />
                      <Badge tone={img.altText ? "success" : "critical"} size="small">
                        {img.altText ? "Has alt" : "Missing alt"}
                      </Badge>
                      {img.altText ? (
                        <Text as="p" variant="bodySm">
                          {img.altText}
                        </Text>
                      ) : (
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm" tone="subdued">
                            Suggested: {img.suggestedAlt}
                          </Text>
                        </BlockStack>
                      )}
                      <Text as="p" variant="bodySm" tone="subdued">
                        File: {img.currentFile}
                      </Text>
                      {img.currentFile !== img.suggestedFile && (
                        <Text as="p" variant="bodySm" tone="caution">
                          Suggested: {img.suggestedFile}
                        </Text>
                      )}
                    </BlockStack>
                  </Box>
                ))}
              </div>
            </BlockStack>
          </Card>
        ))}
      </BlockStack>
    </Page>
  );
}
