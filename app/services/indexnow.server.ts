import crypto from "crypto";
import db from "../db.server";

const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
  "https://yandex.com/indexnow",
];

export function generateIndexNowKey(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function submitToIndexNow(
  shopId: string,
  urls: string | string[],
  action: "update" | "delete",
  contentType: string,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop?.indexNowKey) {
    return { success: false, error: "IndexNow key not configured" };
  }

  const urlList = Array.isArray(urls) ? urls : [urls];
  if (urlList.length === 0) {
    return { success: false, error: "No URLs to submit" };
  }

  const host = shop.domain.replace("https://", "").replace("http://", "");

  try {
    const keyLocation = `https://${host}/apps/indexboost/${shop.indexNowKey}.txt`;
    const payload = {
      host,
      key: shop.indexNowKey,
      keyLocation,
      urlList,
    };
    const body = JSON.stringify(payload);

    // Submit to primary endpoint (api.indexnow.org distributes to all engines)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(INDEXNOW_ENDPOINTS[0], {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const statusCode = response.status;
    const success = statusCode === 200 || statusCode === 202;
    const responseText = success ? "" : await response.text().catch(() => "");
    const errorMsg = success
      ? null
      : JSON.stringify({
          statusCode,
          keyLocation,
          urlList,
          responseBody: responseText.trim() || `HTTP ${statusCode}`,
        });

    // Log each URL
    for (const url of urlList) {
      await db.submission.create({
        data: {
          shopId,
          url,
          contentType,
          engine: "indexnow",
          action,
          status: success ? "success" : "failed",
          statusCode,
          errorMsg,
        },
      });
    }

    return { success, statusCode, error: errorMsg || undefined };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";

    for (const url of urlList) {
      await db.submission.create({
        data: {
          shopId,
          url,
          contentType,
          engine: "indexnow",
          action,
          status: "failed",
          errorMsg,
        },
      });
    }

    return { success: false, error: errorMsg };
  }
}

export async function getIndexNowKeyContent(shopDomain: string, key: string): Promise<string | null> {
  const shop = await db.shop.findUnique({ where: { domain: shopDomain } });
  if (!shop || shop.indexNowKey !== key) {
    return null;
  }
  return key;
}
