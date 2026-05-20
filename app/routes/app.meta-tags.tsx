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
  TextField,
  Modal,
  InlineStack,
  Banner,
  Box,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/webhook-handler.server";
import { UpgradeBanner } from "../components/UpgradeBanner";
import { useState, useCallback, useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);
  const { getPlan } = await import("../services/require-plan.server");
  const plan = await getPlan(admin);
  if (plan === "free") {
    return json({ shopDomain: shop.domain, items: [], hasNextPage: false, planBlocked: true, currentPlan: plan });
  }

  const [productsRes, collectionsRes, pagesRes] = await Promise.all([
    admin.graphql(`#graphql
      query { products(first: 50) {
        pageInfo { hasNextPage }
        edges { node {
          id title handle
          seo { title description }
        }}}}
    `),
    admin.graphql(`#graphql
      query { collections(first: 50) {
        pageInfo { hasNextPage }
        edges { node {
          id title handle
          seo { title description }
        }}}}
    `),
    admin.graphql(`#graphql
      query { pages(first: 50) {
        pageInfo { hasNextPage }
        edges { node {
          id title handle
        }}}}
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

  const mapItems = (edges: any[], type: string) =>
    (edges || []).map((e: any) => ({
      id: e.node.id,
      type,
      title: e.node.title,
      handle: e.node.handle,
      seoTitle: e.node.seo?.title || "",
      seoDescription: e.node.seo?.description || "",
      titleLen: (e.node.seo?.title || e.node.title || "").length,
      descLen: (e.node.seo?.description || "").length,
    }));

  const items = [
    ...mapItems(productsData.data?.products?.edges, "product"),
    ...mapItems(collectionsData.data?.collections?.edges, "collection"),
    ...mapItems(pagesData.data?.pages?.edges, "page"),
  ];

  return json({ shopDomain: shop.domain, items, hasNextPage, planBlocked: false, currentPlan: plan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { requirePlan } = await import("../services/require-plan.server");
  await requirePlan(admin, "pro");

  const formData = await request.formData();
  const id = formData.get("id") as string;
  const type = formData.get("type") as string;
  const seoTitle = formData.get("seoTitle") as string;
  const seoDescription = formData.get("seoDescription") as string;

  let mutation = "";
  let variables: any = {};

  if (type === "product") {
    mutation = `#graphql
      mutation updateProductSeo($input: ProductInput!) {
        productUpdate(input: $input) {
          product { id seo { title description } }
          userErrors { field message }
        }
      }`;
    variables = { input: { id, seo: { title: seoTitle, description: seoDescription } } };
  } else if (type === "collection") {
    mutation = `#graphql
      mutation updateCollectionSeo($input: CollectionInput!) {
        collectionUpdate(input: $input) {
          collection { id seo { title description } }
          userErrors { field message }
        }
      }`;
    variables = { input: { id, seo: { title: seoTitle, description: seoDescription } } };
  } else if (type === "page") {
    mutation = `#graphql
      mutation updatePageSeo($id: ID!, $input: PageUpdateInput!) {
        pageUpdate(id: $id, input: $input) {
          page { id seo { title description } }
          userErrors { field message }
        }
      }`;
    variables = { id, input: { seo: { title: seoTitle, description: seoDescription } } };
  }

  if (mutation) {
    const res = await admin.graphql(mutation, { variables });
    const data = await res.json();
    const errors = Object.values(data.data || {}).flatMap((v: any) => v?.userErrors || []);
    if (errors.length > 0) {
      return json({ success: false, error: errors.map((e: any) => e.message).join(", ") });
    }
  }

  return json({ success: true });
};

export default function MetaTags() {
  const { shopDomain, items, hasNextPage, planBlocked, currentPlan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const shopify = useAppBridge();

  const [editing, setEditing] = useState<any>(null);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");

  const openEdit = useCallback((item: any) => {
    setEditing(item);
    setSeoTitle(item.seoTitle || item.title);
    setSeoDesc(item.seoDescription);
  }, []);

  const closeEdit = useCallback(() => setEditing(null), []);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === "idle") {
      setEditing(null);
      shopify.toast.show("Meta tags updated");
    }
  }, [fetcher.data, fetcher.state, shopify]);

  const titleColor = (len: number) =>
    len === 0 ? "critical" : len < 30 || len > 60 ? "warning" : "success";
  const descColor = (len: number) =>
    len === 0 ? "critical" : len < 120 || len > 160 ? "warning" : "success";

  const rows = items.map((item: any) => [
    <Button key={item.id} variant="plain" onClick={() => openEdit(item)}>
      {item.title}
    </Button>,
    <Badge key={`${item.id}-t`} tone="info">{item.type}</Badge>,
    <Badge key={`${item.id}-tl`} tone={titleColor(item.titleLen)}>
      {item.titleLen > 0 ? `${item.titleLen} chars` : "Missing"}
    </Badge>,
    <Badge key={`${item.id}-dl`} tone={descColor(item.descLen)}>
      {item.descLen > 0 ? `${item.descLen} chars` : "Missing"}
    </Badge>,
  ]);

  const missingTitle = items.filter((i: any) => !i.seoTitle).length;
  const missingDesc = items.filter((i: any) => !i.seoDescription).length;

  return (
    <Page>
      <TitleBar title="Meta Tags Editor" />
      <BlockStack gap="500">
        {planBlocked && (
          <UpgradeBanner currentPlan={currentPlan} requiredPlan="pro" feature="Meta Tags Editor" />
        )}
        {!planBlocked && hasNextPage && (
          <Banner tone="info" title="Large catalog — showing first 50 items per type">
            <Text as="p" variant="bodyMd">
              Your store has more products, collections, or pages than shown. Edit what is visible here; a future update will add full pagination.
            </Text>
          </Banner>
        )}
        {!planBlocked && (missingTitle > 0 || missingDesc > 0) && (
          <Banner tone="warning" title="SEO issues found">
            <InlineStack gap="300">
              {missingTitle > 0 && (
                <Text as="span" variant="bodyMd">
                  {missingTitle} pages missing title
                </Text>
              )}
              {missingDesc > 0 && (
                <Text as="span" variant="bodyMd">
                  {missingDesc} pages missing description
                </Text>
              )}
            </InlineStack>
          </Banner>
        )}

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              All Pages ({items.length})
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Click a title to edit its meta tags. Recommended: Title 50-60 chars, Description 150-160 chars.
            </Text>
            <DataTable
              columnContentTypes={["text", "text", "text", "text"]}
              headings={["Title", "Type", "SEO Title", "SEO Description"]}
              rows={rows}
            />
          </BlockStack>
        </Card>

        {editing && (
          <Modal open onClose={closeEdit} title={`Edit Meta Tags: ${editing.title}`}>
            <Modal.Section>
              <fetcher.Form method="post">
                <input type="hidden" name="id" value={editing.id} />
                <input type="hidden" name="type" value={editing.type} />
                <BlockStack gap="400">
                  <TextField
                    label="SEO Title"
                    value={seoTitle}
                    onChange={setSeoTitle}
                    autoComplete="off"
                    helpText={`${seoTitle.length}/60 characters`}
                    error={seoTitle.length > 70 ? "Title too long" : undefined}
                  />
                  <TextField
                    label="SEO Description"
                    value={seoDesc}
                    onChange={setSeoDesc}
                    multiline={3}
                    autoComplete="off"
                    helpText={`${seoDesc.length}/160 characters`}
                    error={seoDesc.length > 320 ? "Description too long" : undefined}
                  />
                  <Box
                    padding="300"
                    background="bg-surface-secondary"
                    borderRadius="200"
                  >
                    <BlockStack gap="100">
                      <Text as="p" variant="headingSm" tone="success">
                        {seoTitle || editing.title}
                      </Text>
                      <Text as="p" variant="bodySm" tone="success">
                        https://{shopDomain}/{editing.type === "product" ? "products" : editing.type === "collection" ? "collections" : "pages"}/{editing.handle}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {seoDesc || "No description set"}
                      </Text>
                    </BlockStack>
                  </Box>
                  <input type="hidden" name="seoTitle" value={seoTitle} />
                  <input type="hidden" name="seoDescription" value={seoDesc} />
                  <InlineStack gap="200">
                    <Button submit variant="primary" loading={fetcher.state !== "idle"}>
                      Save
                    </Button>
                    <Button onClick={closeEdit}>Cancel</Button>
                  </InlineStack>
                </BlockStack>
              </fetcher.Form>
            </Modal.Section>
          </Modal>
        )}
      </BlockStack>
    </Page>
  );
}
