import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  TextField,
  Button,
  Banner,
  Checkbox,
  InlineStack,
  Badge,
  Box,
  Divider,
  DropZone,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getOrCreateShop } from "../services/webhook-handler.server";
import { generateIndexNowKey } from "../services/indexnow.server";
import { getGoogleAuth } from "../services/google-indexer.server";
import { useState, useCallback } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  let googleEmail = "";
  if (shop.googleCredentials) {
    try {
      googleEmail = JSON.parse(shop.googleCredentials).client_email || "";
    } catch {
      googleEmail = "";
    }
  }

  return json({
    shop: {
      domain: shop.domain,
      hasGoogle: !!shop.googleCredentials,
      googleEmail,
      indexNowKey: shop.indexNowKey || "",
      autoIndexGoogle: shop.autoIndexGoogle,
      autoIndexNow: shop.autoIndexNow,
      indexProducts: shop.indexProducts,
      indexCollections: shop.indexCollections,
      indexPages: shop.indexPages,
      indexBlogs: shop.indexBlogs,
    },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = await getOrCreateShop(session.shop);

  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  if (actionType === "save_google") {
    const credentials = formData.get("credentials") as string;
    if (credentials) {
      try {
        const parsed = JSON.parse(credentials);
        if (!parsed.client_email || !parsed.private_key) {
          return json({
            success: false,
            error: "Invalid credentials: missing client_email or private_key",
          });
        }

        try {
          const auth = await getGoogleAuth(parsed);
          await auth.authorize();
        } catch (error) {
          return json({
            success: false,
            error: `Google credentials could not be validated: ${
              error instanceof Error ? error.message : "Unknown Google auth error"
            }`,
          });
        }

        await db.shop.update({
          where: { id: shop.id },
          data: { googleCredentials: credentials },
        });
        return json({ success: true, message: "Google credentials saved" });
      } catch {
        return json({ success: false, error: "Invalid JSON format" });
      }
    }
  }

  if (actionType === "remove_google") {
    await db.shop.update({
      where: { id: shop.id },
      data: { googleCredentials: null },
    });
    return json({ success: true, message: "Google credentials removed" });
  }

  if (actionType === "regenerate_key") {
    const newKey = generateIndexNowKey();
    await db.shop.update({
      where: { id: shop.id },
      data: { indexNowKey: newKey },
    });
    return json({ success: true, message: "IndexNow key regenerated" });
  }

  if (actionType === "save_settings") {
    await db.shop.update({
      where: { id: shop.id },
      data: {
        autoIndexGoogle: formData.get("autoIndexGoogle") === "true",
        autoIndexNow: formData.get("autoIndexNow") === "true",
        indexProducts: formData.get("indexProducts") === "true",
        indexCollections: formData.get("indexCollections") === "true",
        indexPages: formData.get("indexPages") === "true",
        indexBlogs: formData.get("indexBlogs") === "true",
      },
    });
    return json({ success: true, message: "Settings saved" });
  }

  return json({ success: false });
};

export default function Settings() {
  const { shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();

  const [credentials, setCredentials] = useState("");
  const [autoGoogle, setAutoGoogle] = useState(shop.autoIndexGoogle);
  const [autoIndexNow, setAutoIndexNow] = useState(shop.autoIndexNow);
  const [indexProducts, setIndexProducts] = useState(shop.indexProducts);
  const [indexCollections, setIndexCollections] = useState(shop.indexCollections);
  const [indexPages, setIndexPages] = useState(shop.indexPages);
  const [indexBlogs, setIndexBlogs] = useState(shop.indexBlogs);

  const handleDropZone = useCallback(
    async (_files: File[], acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const text = await acceptedFiles[0].text();
        setCredentials(text);
      }
    },
    [],
  );

  const isLoading = fetcher.state !== "idle";

  return (
    <Page>
      <TitleBar title="Settings" />
      <BlockStack gap="500">
        {fetcher.data?.error && (
          <Banner tone="critical" title="Error">
            <p>{fetcher.data.error}</p>
          </Banner>
        )}
        {fetcher.data?.success && fetcher.data?.message && (
          <Banner tone="success" title="Success">
            <p>{fetcher.data.message}</p>
          </Banner>
        )}

        {/* Google Indexing API */}
        <Layout>
          <Layout.AnnotatedSection
            title="Google Indexing API"
            description="Connect your Google Service Account to submit URLs directly to Google for faster indexing."
          >
            <Card>
              <BlockStack gap="400">
                {shop.hasGoogle ? (
                  <BlockStack gap="300">
                    <InlineStack gap="200" align="start">
                      <Badge tone="success">Connected</Badge>
                      <Text as="span" variant="bodyMd">
                        {shop.googleEmail}
                      </Text>
                    </InlineStack>
                    <fetcher.Form method="post">
                      <input type="hidden" name="action" value="remove_google" />
                      <Button submit tone="critical" variant="plain" loading={isLoading}>
                        Remove credentials
                      </Button>
                    </fetcher.Form>
                  </BlockStack>
                ) : (
                  <BlockStack gap="400">
                    <Banner tone="info" title="How to set up">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd">
                          1. Go to Google Cloud Console and create a project
                        </Text>
                        <Text as="p" variant="bodyMd">
                          2. Enable the "Web Search Indexing API"
                        </Text>
                        <Text as="p" variant="bodyMd">
                          3. Create a Service Account and download the JSON key
                        </Text>
                        <Text as="p" variant="bodyMd">
                          4. In Google Search Console, add the service account
                          email as an owner
                        </Text>
                        <Text as="p" variant="bodyMd">
                          5. Upload the JSON key file below
                        </Text>
                      </BlockStack>
                    </Banner>
                    <DropZone
                      accept=".json"
                      type="file"
                      onDrop={handleDropZone}
                      label="Upload Service Account JSON"
                    >
                      <DropZone.FileUpload
                        actionTitle="Upload JSON key"
                        actionHint="or drag and drop"
                      />
                    </DropZone>
                    {credentials && (
                      <BlockStack gap="200">
                        <TextField
                          label="Or paste JSON credentials"
                          value={credentials}
                          onChange={setCredentials}
                          multiline={4}
                          autoComplete="off"
                        />
                        <fetcher.Form method="post">
                          <input type="hidden" name="action" value="save_google" />
                          <input type="hidden" name="credentials" value={credentials} />
                          <Button submit variant="primary" loading={isLoading}>
                            Save Credentials
                          </Button>
                        </fetcher.Form>
                      </BlockStack>
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>
        </Layout>

        {/* IndexNow */}
        <Layout>
          <Layout.AnnotatedSection
            title="IndexNow (Bing / Yandex)"
            description="IndexNow instantly notifies Bing, Yandex, and other search engines. No setup required - your key is auto-generated."
          >
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="200" align="start">
                  <Badge tone="success">Active</Badge>
                  <Text as="span" variant="bodyMd">
                    Key auto-generated
                  </Text>
                </InlineStack>
                <TextField
                  label="IndexNow Key"
                  value={shop.indexNowKey}
                  readOnly
                  autoComplete="off"
                  helpText={`Verification URL: https://${shop.domain}/apps/indexboost/${shop.indexNowKey}.txt`}
                />
                <fetcher.Form method="post">
                  <input type="hidden" name="action" value="regenerate_key" />
                  <Button submit variant="plain" loading={isLoading}>
                    Regenerate Key
                  </Button>
                </fetcher.Form>
              </BlockStack>
            </Card>
          </Layout.AnnotatedSection>
        </Layout>

        <Divider />

        {/* Auto-indexing Settings */}
        <Layout>
          <Layout.AnnotatedSection
            title="Auto-Indexing"
            description="Choose which engines and content types to auto-index when changes are made."
          >
            <Card>
              <fetcher.Form method="post">
                <input type="hidden" name="action" value="save_settings" />
                <input type="hidden" name="autoIndexGoogle" value={String(autoGoogle)} />
                <input type="hidden" name="autoIndexNow" value={String(autoIndexNow)} />
                <input type="hidden" name="indexProducts" value={String(indexProducts)} />
                <input type="hidden" name="indexCollections" value={String(indexCollections)} />
                <input type="hidden" name="indexPages" value={String(indexPages)} />
                <input type="hidden" name="indexBlogs" value={String(indexBlogs)} />

                <BlockStack gap="400">
                  <Text as="h3" variant="headingSm">
                    Search Engines
                  </Text>
                  <Checkbox
                    label="Google Indexing API"
                    checked={autoGoogle}
                    onChange={setAutoGoogle}
                    helpText="Submit to Google (200/day limit)"
                  />
                  <Checkbox
                    label="IndexNow (Bing, Yandex, Seznam, Naver)"
                    checked={autoIndexNow}
                    onChange={setAutoIndexNow}
                    helpText="Submit to all IndexNow-supporting engines (unlimited)"
                  />

                  <Divider />

                  <Text as="h3" variant="headingSm">
                    Content Types
                  </Text>
                  <Checkbox
                    label="Products"
                    checked={indexProducts}
                    onChange={setIndexProducts}
                  />
                  <Checkbox
                    label="Collections"
                    checked={indexCollections}
                    onChange={setIndexCollections}
                  />
                  <Checkbox
                    label="Pages"
                    checked={indexPages}
                    onChange={setIndexPages}
                  />
                  <Checkbox
                    label="Blog Posts"
                    checked={indexBlogs}
                    onChange={setIndexBlogs}
                  />

                  <Box>
                    <Button submit variant="primary" loading={isLoading}>
                      Save Settings
                    </Button>
                  </Box>
                </BlockStack>
              </fetcher.Form>
            </Card>
          </Layout.AnnotatedSection>
        </Layout>
      </BlockStack>
    </Page>
  );
}
