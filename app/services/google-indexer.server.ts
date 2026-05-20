import { google } from "googleapis";
import db from "../db.server";
import { logger } from "./logger.server";

const GOOGLE_INDEXING_API_ENDPOINT =
  "https://indexing.googleapis.com/v3/urlNotifications:publish";

interface GoogleCredentials {
  client_email: string;
  private_key: string;
  project_id: string;
}

export async function getGoogleAuth(credentials: GoogleCredentials) {
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
  return auth;
}

export async function submitToGoogle(
  shopId: string,
  url: string,
  action: "update" | "delete",
  contentType: string,
  planLimit: number = 50,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop?.googleCredentials) {
    return { success: false, error: "Google credentials not configured" };
  }

  // Reset quota if the daily window has passed
  const now = new Date();
  if (shop.quotaResetAt && shop.quotaResetAt <= now) {
    await db.shop.update({
      where: { id: shopId },
      data: { dailyGoogleUsed: 0, quotaResetAt: getNextResetTime() },
    });
    shop.dailyGoogleUsed = 0;
  }

  // Atomically reserve a quota slot: increment only if still under the limit.
  // This prevents race conditions when multiple concurrent submissions are processed.
  const reserved = await db.shop.updateMany({
    where: { id: shopId, dailyGoogleUsed: { lt: planLimit } },
    data: { dailyGoogleUsed: { increment: 1 } },
  });
  if (reserved.count === 0) {
    return { success: false, error: `Daily Google quota exceeded (${planLimit}/day)` };
  }

  try {
    const credentials: GoogleCredentials = JSON.parse(shop.googleCredentials);
    const auth = await getGoogleAuth(credentials);
    const accessToken = await auth.authorize();

    const type =
      action === "delete" ? "URL_DELETED" : "URL_UPDATED";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(GOOGLE_INDEXING_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken.access_token}`,
        },
        body: JSON.stringify({ url, type }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const statusCode = response.status;
    const responseData = await response.json();

    if (response.ok) {
      await db.submission.create({
        data: {
          shopId,
          url,
          contentType,
          engine: "google",
          action,
          status: "success",
          statusCode,
        },
      });

      return { success: true, statusCode };
    } else {
      const errorMsg =
        responseData?.error?.message || `HTTP ${statusCode}`;

      // Return the reserved quota slot on API failure
      await db.shop.update({
        where: { id: shopId },
        data: { dailyGoogleUsed: { decrement: 1 } },
      });

      await db.submission.create({
        data: {
          shopId,
          url,
          contentType,
          engine: "google",
          action,
          status: "failed",
          statusCode,
          errorMsg,
        },
      });

      return { success: false, statusCode, error: errorMsg };
    }
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";

    // Return the reserved quota slot on unexpected error
    await db.shop.update({
      where: { id: shopId },
      data: { dailyGoogleUsed: { decrement: 1 } },
    }).catch(() => {});

    await db.submission.create({
      data: {
        shopId,
        url,
        contentType,
        engine: "google",
        action,
        status: "failed",
        errorMsg,
      },
    });

    logger.error("Google Indexing API unexpected error", { shopId, url, errorMsg });
    return { success: false, error: errorMsg };
  }
}

export async function getGoogleQuotaStatus(shopId: string, planLimit: number = 50) {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) return { used: 0, limit: planLimit, remaining: planLimit };

  const now = new Date();
  if (shop.quotaResetAt && shop.quotaResetAt <= now) {
    await db.shop.update({
      where: { id: shopId },
      data: { dailyGoogleUsed: 0, quotaResetAt: getNextResetTime() },
    });
    return { used: 0, limit: planLimit, remaining: planLimit };
  }

  return {
    used: shop.dailyGoogleUsed,
    limit: planLimit,
    remaining: Math.max(0, planLimit - shop.dailyGoogleUsed),
  };
}

function getNextResetTime(): Date {
  const now = new Date();
  const reset = new Date(now);
  reset.setUTCHours(0, 0, 0, 0);
  reset.setUTCDate(reset.getUTCDate() + 1);
  return reset;
}
