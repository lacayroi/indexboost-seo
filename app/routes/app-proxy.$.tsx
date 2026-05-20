import type { LoaderFunctionArgs } from "@remix-run/node";
import { getIndexNowKeyContent } from "../services/indexnow.server";
import db from "../db.server";
import { generateLlmsTxt, generateLlmsFullTxt } from "../services/llms-txt.server";

// App Proxy route: serves files at /apps/indexboost/*
// - /{key}.txt → IndexNow key verification
// - /llms.txt → LLMs.txt for AI search engines
// - /llms-full.txt → Detailed LLMs.txt
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const path = params["*"] || "";

  const shopDomain =
    url.searchParams.get("shop") ||
    request.headers.get("x-shopify-shop-domain") ||
    "";

  // Serve LLMs.txt
  if (path === "llms.txt" || path === "llms-full.txt") {
    return await serveLlmsTxt(shopDomain, path === "llms-full.txt");
  }

  // Serve IndexNow key file: {key}.txt
  const keyMatch = path.match(/^([a-f0-9]{32})\.txt$/);
  if (keyMatch) {
    const keyContent = await getIndexNowKeyContent(shopDomain, keyMatch[1]);
    if (keyContent) {
      return new Response(keyContent, {
        headers: {
          "Content-Type": "text/plain",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  }

  return new Response("Not Found", { status: 404 });
};

async function serveLlmsTxt(shopDomain: string, full: boolean) {
  if (!shopDomain) {
    return new Response("Not Found", { status: 404 });
  }

  const shop = await db.shop.findUnique({ where: { domain: shopDomain } });
  if (!shop) {
    return new Response("Not Found", { status: 404 });
  }

  // Build store data from basic info (no admin API access in proxy)
  const storeData = {
    shopName: shopDomain.replace(".myshopify.com", ""),
    shopDomain,
    products: [],
    collections: [],
    pages: [],
  };

  const content = full
    ? generateLlmsFullTxt(storeData)
    : generateLlmsTxt(storeData);

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
