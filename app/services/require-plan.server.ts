import { json } from "@remix-run/node";
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { getActiveSubscription, type PlanName } from "./billing.server";

const PLAN_LEVEL: Record<PlanName, number> = {
  free: 0,
  pro: 1,
  business: 2,
};

/**
 * Check if the current plan meets the minimum required plan.
 * Returns the current plan name, or throws a JSON response with upgrade prompt.
 */
export async function requirePlan(
  admin: AdminApiContext,
  minimumPlan: PlanName,
): Promise<PlanName> {
  const { plan } = await getActiveSubscription(admin);

  if (PLAN_LEVEL[plan] < PLAN_LEVEL[minimumPlan]) {
    throw json(
      {
        planRequired: minimumPlan,
        currentPlan: plan,
        upgradeRequired: true,
      },
      { status: 403 },
    );
  }

  return plan;
}

/**
 * Get current plan without throwing. Use when you want to show
 * a gated UI instead of blocking the entire page.
 */
export async function getPlan(admin: AdminApiContext): Promise<PlanName> {
  try {
    const { plan } = await getActiveSubscription(admin);
    return plan;
  } catch {
    return "free";
  }
}

export function getGoogleLimit(plan: PlanName): number {
  return plan === "free" ? 50 : 200;
}

export function getLogRetentionDays(plan: PlanName): number {
  switch (plan) {
    case "business": return 90;
    case "pro": return 30;
    default: return 7;
  }
}
