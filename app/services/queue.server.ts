import db from "../db.server";
import { submitToGoogle } from "./google-indexer.server";
import { submitToIndexNow } from "./indexnow.server";
import { logger } from "./logger.server";

export async function addToQueue(
  shopId: string,
  url: string,
  contentType: string,
  action: "update" | "delete" = "update",
  priority: number = 0,
) {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) return;

  const engines: string[] = [];
  if (shop.autoIndexGoogle && shop.googleCredentials) engines.push("google");
  if (shop.autoIndexNow && shop.indexNowKey) engines.push("indexnow");

  for (const engine of engines) {
    // Dedup: skip if same URL+engine already queued
    const existing = await db.queueItem.findFirst({
      where: { shopId, url, engine, attempts: 0 },
    });
    if (existing) continue;

    await db.queueItem.create({
      data: { shopId, url, contentType, engine, action, priority },
    });
  }
}

export async function processQueue(shopId?: string) {
  const now = new Date();

  const where: any = { nextRetryAt: { lte: now } };
  if (shopId) where.shopId = shopId;

  const items = await db.queueItem.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 50,
  });

  // Fetch plan limits for all shops in this batch in one query
  const shopIds = [...new Set(items.map((i) => i.shopId))];
  const shops = await db.shop.findMany({
    where: { id: { in: shopIds } },
    select: { id: true, plan: true },
  });
  const planLimitMap = new Map(
    shops.map((s) => [s.id, s.plan === "pro" || s.plan === "business" ? 200 : 50]),
  );

  for (const item of items) {
    let result;
    const planLimit = planLimitMap.get(item.shopId) ?? 50;

    if (item.engine === "google") {
      result = await submitToGoogle(
        item.shopId,
        item.url,
        item.action as "update" | "delete",
        item.contentType,
        planLimit,
      );
    } else if (item.engine === "indexnow") {
      result = await submitToIndexNow(
        item.shopId,
        item.url,
        item.action as "update" | "delete",
        item.contentType,
      );
    } else {
      await db.queueItem.delete({ where: { id: item.id } });
      continue;
    }

    if (result.success) {
      await db.queueItem.delete({ where: { id: item.id } });
    } else if (result.error?.startsWith("Daily Google quota exceeded")) {
      // Keep in queue, retry tomorrow
      const tomorrow = new Date();
      tomorrow.setUTCHours(0, 0, 0, 0);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      await db.queueItem.update({
        where: { id: item.id },
        data: { nextRetryAt: tomorrow },
      });
    } else {
      const newAttempts = item.attempts + 1;
      if (newAttempts >= item.maxAttempts) {
        // Permanently failed — log before deletion so operators can investigate.
        // TODO: forward to dead-letter table if higher observability is needed.
        logger.error("Queue item permanently failed after max attempts", {
          shopId: item.shopId,
          url: item.url,
          engine: item.engine,
          action: item.action,
          attempts: newAttempts,
          lastError: result.error,
        });
        await db.queueItem.delete({ where: { id: item.id } });
      } else {
        // Exponential backoff: 1min, 5min, 30min
        const delays = [60, 300, 1800];
        const delaySec = delays[Math.min(newAttempts - 1, delays.length - 1)];
        const nextRetry = new Date(Date.now() + delaySec * 1000);

        await db.queueItem.update({
          where: { id: item.id },
          data: { attempts: newAttempts, nextRetryAt: nextRetry },
        });
      }
    }
  }

  return items.length;
}

export async function submitUrlNow(
  shopId: string,
  url: string,
  contentType: string,
  action: "update" | "delete" = "update",
) {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) return { google: null, indexnow: null };

  const results: { google: any; indexnow: any } = {
    google: null,
    indexnow: null,
  };

  if (shop.googleCredentials) {
    const planLimit = shop.plan === "pro" || shop.plan === "business" ? 200 : 50;
    results.google = await submitToGoogle(shopId, url, action, contentType, planLimit);
  }

  if (shop.indexNowKey) {
    results.indexnow = await submitToIndexNow(shopId, url, action, contentType);
  }

  return results;
}
