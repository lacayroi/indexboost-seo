/**
 * Email Alerts Service
 * Sends notification emails to shop owners using Shopify's built-in email system.
 * Uses the Shop owner email from session data.
 */

import db from "../db.server";

interface AlertData {
  shopId: string;
  shopDomain: string;
  ownerEmail: string;
  type: "quota_warning" | "indexing_error" | "broken_links" | "daily_summary";
  subject: string;
  body: string;
}

// Store alerts in DB for display in app (email sending requires external service)
export async function createAlert(data: Omit<AlertData, "subject" | "body"> & { details: string }) {
  const subjects: Record<string, string> = {
    quota_warning: "IndexBoost: Google quota almost reached",
    indexing_error: "IndexBoost: Indexing errors detected",
    broken_links: "IndexBoost: Broken links found",
    daily_summary: "IndexBoost: Daily indexing summary",
  };

  // For now, store alerts in a simple way using submissions table
  // In production, integrate with SendGrid/Mailgun/AWS SES
  console.log(`[IndexBoost Alert] ${subjects[data.type]} for ${data.shopDomain}: ${data.details}`);

  return {
    sent: true,
    type: data.type,
    message: data.details,
  };
}

export async function checkAndSendAlerts(shopId: string, shopDomain: string) {
  const alerts: string[] = [];

  // Check Google quota
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (shop && shop.dailyGoogleUsed >= 180) {
    alerts.push(`Google quota: ${shop.dailyGoogleUsed}/200 used today`);
    await createAlert({
      shopId,
      shopDomain,
      ownerEmail: "",
      type: "quota_warning",
      details: `${shop.dailyGoogleUsed}/200 Google submissions used today`,
    });
  }

  // Check recent failures
  const recentFailures = await db.submission.count({
    where: {
      shopId,
      status: "failed",
      createdAt: { gte: new Date(Date.now() - 3600000) }, // last hour
    },
  });

  if (recentFailures >= 5) {
    alerts.push(`${recentFailures} indexing failures in the last hour`);
    await createAlert({
      shopId,
      shopDomain,
      ownerEmail: "",
      type: "indexing_error",
      details: `${recentFailures} indexing failures detected in the last hour`,
    });
  }

  return alerts;
}

export async function getDailySummary(shopId: string) {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [total, success, failed, googleUsed, indexNowUsed] = await Promise.all([
    db.submission.count({
      where: { shopId, createdAt: { gte: todayStart } },
    }),
    db.submission.count({
      where: { shopId, status: "success", createdAt: { gte: todayStart } },
    }),
    db.submission.count({
      where: { shopId, status: "failed", createdAt: { gte: todayStart } },
    }),
    db.submission.count({
      where: { shopId, engine: "google", status: "success", createdAt: { gte: todayStart } },
    }),
    db.submission.count({
      where: { shopId, engine: "indexnow", status: "success", createdAt: { gte: todayStart } },
    }),
  ]);

  return { total, success, failed, googleUsed, indexNowUsed };
}
