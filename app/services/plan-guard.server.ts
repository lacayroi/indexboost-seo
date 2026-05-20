import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { getActiveSubscription, type PlanName } from "./billing.server";

const PLAN_HIERARCHY: Record<PlanName, number> = {
  free: 0,
  pro: 1,
  business: 2,
};

export async function getCurrentPlan(admin: AdminApiContext): Promise<PlanName> {
  const { plan } = await getActiveSubscription(admin);
  return plan;
}

export function hasAccess(currentPlan: PlanName, requiredPlan: PlanName): boolean {
  return PLAN_HIERARCHY[currentPlan] >= PLAN_HIERARCHY[requiredPlan];
}

// Feature access map
export function canAccess(plan: PlanName, feature: string): boolean {
  const features: Record<string, PlanName> = {
    // Free features
    "auto-indexing": "free",
    "manual-submit": "free",
    "dashboard": "free",
    "logs-7days": "free",
    "settings": "free",

    // Pro features
    "bulk-indexing": "pro",
    "meta-tags": "pro",
    "schema": "pro",
    "sitemap": "pro",
    "html-sitemap": "pro",
    "robots-txt": "pro",
    "broken-links": "pro",
    "redirects": "pro",
    "seo-audit": "pro",
    "llms-txt": "pro",
    "logs-30days": "pro",
    "full-google-quota": "pro",

    // Business features
    "ai-alt-text": "business",
    "index-health": "business",
    "email-alerts": "business",
  };

  const required = features[feature] || "free";
  return hasAccess(plan, required);
}

export function getGoogleDailyLimit(plan: PlanName): number {
  switch (plan) {
    case "business":
    case "pro":
      return 200;
    case "free":
    default:
      return 50;
  }
}

export function getLogRetentionDays(plan: PlanName): number {
  switch (plan) {
    case "business":
      return 90;
    case "pro":
      return 30;
    case "free":
    default:
      return 7;
  }
}
