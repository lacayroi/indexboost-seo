import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  DataTable,
  Button,
  TextField,
  InlineStack,
  Banner,
  Modal,
  Box,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { UpgradeBanner } from "../components/UpgradeBanner";
import { authenticate } from "../shopify.server";
import { useState, useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { getPlan } = await import("../services/require-plan.server");
  const plan = await getPlan(admin);
  if (plan === "free") {
    return json({ redirects: [], planBlocked: true, currentPlan: plan });
  }

  const res = await admin.graphql(`#graphql
    query {
      urlRedirects(first: 100) {
        edges {
          node {
            id
            path
            target
          }
        }
      }
    }
  `);

  const data = await res.json();
  const redirects = (data.data?.urlRedirects?.edges || []).map((e: any) => ({
    id: e.node.id,
    path: e.node.path,
    target: e.node.target,
  }));

  return json({ redirects, planBlocked: false, currentPlan: plan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { requirePlan } = await import("../services/require-plan.server");
  await requirePlan(admin, "pro");

  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  if (actionType === "create") {
    const path = formData.get("path") as string;
    const target = formData.get("target") as string;

    const res = await admin.graphql(
      `#graphql
      mutation createRedirect($urlRedirect: UrlRedirectInput!) {
        urlRedirectCreate(urlRedirect: $urlRedirect) {
          urlRedirect { id path target }
          userErrors { field message }
        }
      }`,
      { variables: { urlRedirect: { path, target } } },
    );

    const data = await res.json();
    const errors = data.data?.urlRedirectCreate?.userErrors || [];
    if (errors.length > 0) {
      return json({ success: false, error: errors.map((e: any) => e.message).join(", ") });
    }
    return json({ success: true, message: "Redirect created" });
  }

  if (actionType === "delete") {
    const id = formData.get("id") as string;
    await admin.graphql(
      `#graphql
      mutation deleteRedirect($id: ID!) {
        urlRedirectDelete(urlRedirectId: $id) {
          deletedUrlRedirectId
          userErrors { field message }
        }
      }`,
      { variables: { id } },
    );
    return json({ success: true, message: "Redirect deleted" });
  }

  return json({ success: false });
};

export default function Redirects() {
  const { redirects, planBlocked, currentPlan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const shopify = useAppBridge();

  const [showCreate, setShowCreate] = useState(false);
  const [path, setPath] = useState("");
  const [target, setTarget] = useState("");

  useEffect(() => {
    if (fetcher.data?.success && fetcher.state === "idle") {
      setShowCreate(false);
      setPath("");
      setTarget("");
      shopify.toast.show(fetcher.data.message || "Done");
    }
  }, [fetcher.data, fetcher.state, shopify]);

  const rows = redirects.map((r: any) => [
    r.path,
    r.target,
    <fetcher.Form key={r.id} method="post" style={{ display: "inline" }}>
      <input type="hidden" name="action" value="delete" />
      <input type="hidden" name="id" value={r.id} />
      <Button submit tone="critical" variant="plain" size="slim">
        Delete
      </Button>
    </fetcher.Form>,
  ]);

  return (
    <Page>
      <TitleBar title="Redirect Manager" />
      <BlockStack gap="500">
        {planBlocked && (
          <UpgradeBanner currentPlan={currentPlan} requiredPlan="pro" feature="Redirect Manager" />
        )}
        {fetcher.data?.error && (
          <Banner tone="critical" title="Error">
            <p>{fetcher.data.error}</p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">
                URL Redirects ({redirects.length})
              </Text>
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                Add Redirect
              </Button>
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              Manage 301 redirects. When a URL changes, add a redirect to
              preserve SEO value and avoid 404 errors.
            </Text>

            {rows.length > 0 ? (
              <DataTable
                columnContentTypes={["text", "text", "text"]}
                headings={["From Path", "To Target", "Actions"]}
                rows={rows}
              />
            ) : (
              <Box padding="500" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="300">
                  <Text as="p" variant="headingSm">
                    No redirects configured
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Add redirects when products, collections, or pages move so visitors and search engines land on the right URL.
                  </Text>
                  <Button variant="primary" onClick={() => setShowCreate(true)}>
                    Add Redirect
                  </Button>
                </BlockStack>
              </Box>
            )}
          </BlockStack>
        </Card>

        {showCreate && (
          <Modal open onClose={() => setShowCreate(false)} title="Add Redirect">
            <Modal.Section>
              <fetcher.Form method="post">
                <input type="hidden" name="action" value="create" />
                <BlockStack gap="400">
                  <TextField
                    label="From Path"
                    value={path}
                    onChange={setPath}
                    placeholder="/old-page"
                    autoComplete="off"
                    helpText="The old URL path (e.g., /products/old-product)"
                  />
                  <TextField
                    label="To Target"
                    value={target}
                    onChange={setTarget}
                    placeholder="/new-page"
                    autoComplete="off"
                    helpText="The new URL path to redirect to"
                  />
                  <InlineStack gap="200">
                    <Button submit variant="primary" loading={fetcher.state !== "idle"}>
                      Create Redirect
                    </Button>
                    <Button onClick={() => setShowCreate(false)}>Cancel</Button>
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
