import db from "../db.server";
import { addToQueue, processQueue } from "./queue.server";
import { generateIndexNowKey } from "./indexnow.server";

export async function getOrCreateShop(shopDomain: string) {
  let shop = await db.shop.findUnique({ where: { domain: shopDomain } });
  if (!shop) {
    shop = await db.shop.create({
      data: {
        domain: shopDomain,
        indexNowKey: generateIndexNowKey(),
        quotaResetAt: getNextResetTime(),
      },
    });
  }
  return shop;
}

function getNextResetTime(): Date {
  const now = new Date();
  const reset = new Date(now);
  reset.setUTCHours(0, 0, 0, 0);
  reset.setUTCDate(reset.getUTCDate() + 1);
  return reset;
}

function buildProductUrl(shopDomain: string, handle: string): string {
  return `https://${shopDomain}/products/${handle}`;
}

function buildCollectionUrl(shopDomain: string, handle: string): string {
  return `https://${shopDomain}/collections/${handle}`;
}

function buildPageUrl(shopDomain: string, handle: string): string {
  return `https://${shopDomain}/pages/${handle}`;
}

function buildBlogPostUrl(
  shopDomain: string,
  blogHandle: string,
  articleHandle: string,
): string {
  return `https://${shopDomain}/blogs/${blogHandle}/${articleHandle}`;
}

export async function handleProductWebhook(
  shopDomain: string,
  payload: any,
  action: "update" | "delete",
) {
  const shop = await getOrCreateShop(shopDomain);
  if (!shop.indexProducts) return;

  const handle = payload.handle;
  if (!handle) return;

  const url = buildProductUrl(shopDomain, handle);
  await addToQueue(shop.id, url, "product", action, 10);

  // Process queue immediately for real-time indexing
  await processQueue(shop.id);
}

export async function handleCollectionWebhook(
  shopDomain: string,
  payload: any,
  action: "update" | "delete",
) {
  const shop = await getOrCreateShop(shopDomain);
  if (!shop.indexCollections) return;

  const handle = payload.handle;
  if (!handle) return;

  const url = buildCollectionUrl(shopDomain, handle);
  await addToQueue(shop.id, url, "collection", action, 5);
  await processQueue(shop.id);
}

export async function handlePageWebhook(
  shopDomain: string,
  payload: any,
  action: "update" | "delete",
) {
  const shop = await getOrCreateShop(shopDomain);
  if (!shop.indexPages) return;

  const handle = payload.handle;
  if (!handle) return;

  const url = buildPageUrl(shopDomain, handle);
  await addToQueue(shop.id, url, "page", action, 3);
  await processQueue(shop.id);
}

export async function handleBlogPostWebhook(
  shopDomain: string,
  payload: any,
  action: "update" | "delete",
  blogHandle?: string,
) {
  const shop = await getOrCreateShop(shopDomain);
  if (!shop.indexBlogs) return;

  const articleHandle = payload.handle;
  if (!articleHandle) return;

  // Blog handle may come from the payload or need to be fetched
  const bHandle = blogHandle || payload.blog?.handle || "news";
  const url = buildBlogPostUrl(shopDomain, bHandle, articleHandle);
  await addToQueue(shop.id, url, "blog_post", action, 3);
  await processQueue(shop.id);
}
