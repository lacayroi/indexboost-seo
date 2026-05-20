import { Banner, Text } from "@shopify/polaris";

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  pro: "Pro ($9.95/mo)",
  business: "Business ($19.95/mo)",
};

export function UpgradeBanner({
  currentPlan,
  requiredPlan,
  feature,
}: {
  currentPlan: string;
  requiredPlan: string;
  feature: string;
}) {
  return (
    <Banner
      tone="warning"
      title={`${feature} requires ${PLAN_NAMES[requiredPlan]} plan`}
      action={{ content: "View Plans", url: "/app/billing" }}
    >
      <Text as="p" variant="bodyMd">
        You are on the {PLAN_NAMES[currentPlan]} plan. Upgrade to{" "}
        {PLAN_NAMES[requiredPlan]} to unlock {feature.toLowerCase()}.
      </Text>
    </Banner>
  );
}
