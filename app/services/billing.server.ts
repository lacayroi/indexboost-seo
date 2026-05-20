import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import db from "../db.server";

export const PLAN_DEFINITIONS = {
  free: {
    name: "Free",
    price: 0,
    interval: null,
    trialDays: 0,
    dailyGoogleLimit: 50,
    features: [
      "50 Google submissions/day",
      "Unlimited IndexNow submissions",
      "Auto-indexing (products, collections, pages)",
      "Submission logs (7 days)",
      "Basic dashboard",
    ],
  },
  pro: {
    name: "Pro",
    price: 9.95,
    interval: "EVERY_30_DAYS",
    trialDays: 0,
    dailyGoogleLimit: 200,
    features: [
      "200 Google submissions/day",
      "Unlimited IndexNow submissions",
      "Bulk indexing",
      "Submission logs (30 days)",
      "Meta tags editor",
      "Schema / JSON-LD generator",
      "XML + HTML sitemap generators",
      "Robots.txt editor",
      "Broken link scanner",
      "Redirect manager",
      "LLMs.txt generator (AI Search)",
      "SEO Audit",
    ],
  },
  business: {
    name: "Business",
    price: 19.95,
    interval: "EVERY_30_DAYS",
    trialDays: 0,
    dailyGoogleLimit: 200,
    features: [
      "Everything in Pro",
      "AI alt text suggestions",
      "Index health check",
      "Email alerts",
      "Priority support",
    ],
  },
} as const;

export const PLANS = PLAN_DEFINITIONS;

export type PlanName = keyof typeof PLAN_DEFINITIONS;
export type BillingStatus = "inactive" | "pending" | "active" | "cancelled";

export async function createSubscription(
  admin: AdminApiContext,
  plan: PlanName,
  shopDomain: string,
  returnUrl?: string,
) {
  if (plan === "free") return null;

  // Guard against double-submit: if already active on this plan, return null instead of
  // creating a duplicate subscription (which Shopify would later reject or double-charge).
  const existing = await getActiveSubscription(admin);
  if (existing.billingStatus === "active" && existing.plan === plan) {
    return null;
  }

  const planConfig = PLAN_DEFINITIONS[plan];
  const callbackUrl =
    returnUrl ||
    `${process.env.SHOPIFY_APP_URL || ""}/app/billing?billing_callback=1&plan=${plan}`;
  const testCharge =
    process.env.SHOPIFY_BILLING_TEST === "true" || process.env.NODE_ENV !== "production";

  const response = await admin.graphql(
    `#graphql
    mutation createSubscription($name: String!, $returnUrl: URL!, $amount: Decimal!, $interval: AppPricingInterval!, $test: Boolean!) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        test: $test
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: { amount: $amount, currencyCode: USD }
              interval: $interval
            }
          }
        }]
      ) {
        appSubscription {
          id
          status
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        name: `IndexBoost SEO - ${planConfig.name}`,
        returnUrl: callbackUrl,
        amount: planConfig.price.toFixed(2),
        interval: planConfig.interval,
        test: testCharge,
      },
    },
  );

  const data = await response.json();
  const result = data.data?.appSubscriptionCreate;

  if (result?.userErrors?.length > 0) {
    throw new Error(result.userErrors.map((e: any) => e.message).join(", "));
  }

  await db.shop.updateMany({
    where: { domain: shopDomain },
    data: {
      plan,
      billingStatus: "pending",
      subscriptionId: result?.appSubscription?.id || null,
      trialDays: planConfig.trialDays,
    },
  });

  return {
    subscriptionId: result?.appSubscription?.id,
    confirmationUrl: result?.confirmationUrl,
  };
}

export async function getActiveSubscription(admin: AdminApiContext) {
  const response = await admin.graphql(
    `#graphql
    query {
      appInstallation {
        activeSubscriptions {
          id
          name
          status
          lineItems {
            plan {
              pricingDetails {
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                  interval
                }
              }
            }
          }
        }
      }
    }`,
  );

  const data = await response.json();
  const subs = data.data?.appInstallation?.activeSubscriptions || [];

  if (subs.length === 0) {
    return {
      plan: "free" as PlanName,
      subscription: null,
      billingStatus: "inactive" as BillingStatus,
    };
  }

  const activeSub = subs.find((sub: any) => sub.status === "ACTIVE") || subs[0];
  if (activeSub.status !== "ACTIVE") {
    return {
      plan: "free" as PlanName,
      subscription: activeSub,
      billingStatus: "pending" as BillingStatus,
    };
  }

  // Detect plan by subscription name (stable) rather than price amount (fragile).
  // Name set in createSubscription: "IndexBoost SEO - Pro" / "IndexBoost SEO - Business"
  const subName: string = activeSub.name || "";
  let plan: PlanName = "free";
  if (subName.toLowerCase().includes("business")) plan = "business";
  else if (subName.toLowerCase().includes("pro")) plan = "pro";
  else {
    // Fallback: price-based detection for legacy subscriptions
    const amount = parseFloat(
      activeSub.lineItems?.[0]?.plan?.pricingDetails?.price?.amount || "0",
    );
    if (amount >= 19) plan = "business";
    else if (amount >= 9) plan = "pro";
  }

  return {
    plan,
    subscription: activeSub,
    billingStatus: "active" as BillingStatus,
  };
}

export async function syncShopBillingStatus(shopDomain: string, admin: AdminApiContext) {
  const { plan, subscription, billingStatus } = await getActiveSubscription(admin);

  await db.shop.updateMany({
    where: { domain: shopDomain },
    data: {
      plan,
      billingStatus,
      subscriptionId: subscription?.id || null,
      trialDays: PLAN_DEFINITIONS[plan].trialDays,
    },
  });

  return { plan, subscription, billingStatus };
}

export async function cancelSubscription(admin: AdminApiContext, subscriptionId: string) {
  const response = await admin.graphql(
    `#graphql
    mutation cancelSubscription($id: ID!) {
      appSubscriptionCancel(id: $id) {
        appSubscription {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { variables: { id: subscriptionId } },
  );

  const data = await response.json();
  const result = data.data?.appSubscriptionCancel;

  if (result?.userErrors?.length > 0) {
    throw new Error(result.userErrors.map((e: any) => e.message).join(", "));
  }

  return result;
}

export async function markShopCancelled(shopDomain: string) {
  await db.shop.updateMany({
    where: { domain: shopDomain },
    data: {
      plan: "free",
      billingStatus: "cancelled",
      subscriptionId: null,
      trialDays: 0,
    },
  });
}
