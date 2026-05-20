import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  TextField,
  Button,
  Banner,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { UpgradeBanner } from "../components/UpgradeBanner";
import { authenticate } from "../shopify.server";
import { getOrCreateShop } from "../services/webhook-handler.server";
import { useState, useEffect } from "react";

const DEFAULT_ROBOTS = `User-agent: *
Disallow: /admin
Disallow: /cart
Disallow: /orders
Disallow: /checkouts/
Disallow: /checkout
Disallow: /carts
Disallow: /account
Disallow: /*?*variant=*
Disallow: /*?*q=*
Disallow: /*?*sort_by=*
Allow: /collections/*
Allow: /products/*
Allow: /pages/*
Allow: /blogs/*
Sitemap: https://{{domain}}/sitemap.xml`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { getPlan } = await import("../services/require-plan.server");
  const plan = await getPlan(admin);
  if (plan === "free") {
    return json({ currentRobots: "", shopDomain: "", planBlocked: true, currentPlan: plan });
  }
  const shop = await getOrCreateShop(session.shop);

  // Fetch current robots.txt from store with a 5s timeout to avoid loader hangs
  let currentRobots = "";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(`https://${shop.domain}/robots.txt`, {
        signal: controller.signal,
      });
      if (response.ok) {
        currentRobots = await response.text();
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {}

  if (!currentRobots) {
    currentRobots = DEFAULT_ROBOTS.replace("{{domain}}", shop.domain);
  }

  return json({ currentRobots, shopDomain: shop.domain, planBlocked: false, currentPlan: plan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { requirePlan } = await import("../services/require-plan.server");
  await requirePlan(admin, "pro");

  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  if (actionType === "update_robots") {
    const rawContent = formData.get("robots") as string;

    // Sanitize: strip Liquid/template tags to prevent storefront code injection.
    // We wrap the plain-text content in {% raw %}...{% endraw %} so any accidental
    // {{ or {%  in the user's input is treated as literal text by Liquid.
    const sanitizedContent = rawContent
      .replace(/\{%-?\s*raw\s*-?%\}[\s\S]*?\{%-?\s*endraw\s*-?%\}/gi, "") // strip existing raw blocks
      .trim();
    const content = `{%- raw -%}\n${sanitizedContent}\n{%- endraw -%}`;

    // Shopify manages robots.txt via theme liquid. We update the robots.txt.liquid file.
    try {
      // Get active theme
      const themeRes = await admin.graphql(`#graphql
        query { themes(first: 1, roles: MAIN) { edges { node { id } } } }
      `);
      const themeData = await themeRes.json();
      const themeId = themeData.data?.themes?.edges?.[0]?.node?.id;

      if (!themeId) {
        return json({ success: false, error: "Could not find active theme" });
      }

      // Check if robots.txt.liquid exists, create/update it
      const fileRes = await admin.graphql(
        `#graphql
        mutation updateFile($themeId: ID!, $files: [OnlineStoreThemeFileBodyInput!]!) {
          themeFilesUpsert(themeId: $themeId, files: $files) {
            upsertedThemeFiles { filename }
            userErrors { field message }
          }
        }`,
        {
          variables: {
            themeId,
            files: [{
              filename: "templates/robots.txt.liquid",
              body: { type: "TEXT", value: content },
            }],
          },
        },
      );

      const fileData = await fileRes.json();
      const errors = fileData.data?.themeFilesUpsert?.userErrors || [];
      if (errors.length > 0) {
        return json({ success: false, error: errors.map((e: any) => e.message).join(", ") });
      }

      return json({ success: true, message: "robots.txt updated in theme" });
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update robots.txt",
      });
    }
  }

  return json({ success: false });
};

export default function RobotsTxt() {
  const { currentRobots, shopDomain, planBlocked, currentPlan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const shopify = useAppBridge();
  const [robots, setRobots] = useState(currentRobots);

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(fetcher.data.message || "Saved");
    }
  }, [fetcher.data, shopify]);

  return (
    <Page>
      <TitleBar title="Robots.txt Editor" />
      <BlockStack gap="500">
        {planBlocked && (
          <UpgradeBanner currentPlan={currentPlan} requiredPlan="pro" feature="Robots.txt Editor" />
        )}
        {fetcher.data?.error && (
          <Banner tone="critical" title="Error">
            <p>{fetcher.data.error}</p>
          </Banner>
        )}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Robots.txt
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Control how search engines crawl your store. Current file: https://{shopDomain}/robots.txt
            </Text>
            <TextField
              label="robots.txt content"
              labelHidden
              value={robots}
              onChange={setRobots}
              multiline={15}
              autoComplete="off"
              monospaced
            />
            <InlineStack gap="200">
              <fetcher.Form method="post">
                <input type="hidden" name="action" value="update_robots" />
                <input type="hidden" name="robots" value={robots} />
                <Button submit variant="primary" loading={fetcher.state !== "idle"}>
                  Save to Theme
                </Button>
              </fetcher.Form>
              <Button onClick={() => setRobots(DEFAULT_ROBOTS.replace("{{domain}}", shopDomain))}>
                Reset to Default
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Tips</Text>
            <Text as="p" variant="bodyMd">
              - "Disallow: /path" blocks crawlers from that path
            </Text>
            <Text as="p" variant="bodyMd">
              - "Allow: /path" explicitly allows crawling
            </Text>
            <Text as="p" variant="bodyMd">
              - Always include your Sitemap URL at the bottom
            </Text>
            <Text as="p" variant="bodyMd">
              - Changes may take time for search engines to pick up
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
