import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, useSearchParams } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  Button,
  Badge,
  InlineStack,
  List,
  Divider,
  InlineGrid,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const { syncShopBillingStatus, PLAN_DEFINITIONS } = await import("../services/billing.server");
  const { plan, subscription, billingStatus } = await syncShopBillingStatus(session.shop, admin);
  const plans = Object.entries(PLAN_DEFINITIONS).map(([key, config]) => ({
    key,
    name: config.name,
    price: config.price,
    interval: config.interval,
    trialDays: config.trialDays,
    features: [...config.features],
  }));

  return json({ currentPlan: plan, billingStatus, subscription, plans });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("action") as string;
  const { createSubscription, cancelSubscription, markShopCancelled, syncShopBillingStatus } = await import(
    "../services/billing.server"
  );

  if (actionType === "subscribe") {
    const plan = formData.get("plan") as "free" | "pro" | "business";
    try {
      const callbackUrl = new URL(request.url);
      callbackUrl.searchParams.set("billing_callback", "1");
      callbackUrl.searchParams.set("plan", plan);

      const result = await createSubscription(admin, plan, session.shop, callbackUrl.toString());
      if (result === null) {
        // Already on this plan — nothing to do. Sync status and return success.
        await syncShopBillingStatus(session.shop, admin);
        return json({ success: true, alreadySubscribed: true });
      }
      if (result?.confirmationUrl) {
        return redirect(result.confirmationUrl);
      }
    } catch (error) {
      return json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create subscription",
      });
    }
  }

  if (actionType === "cancel") {
    const subId = formData.get("subscriptionId") as string;
    if (subId) {
      try {
        await cancelSubscription(admin, subId);
        await markShopCancelled(session.shop);
        return json({ success: true });
      } catch (error) {
        return json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to cancel subscription",
        });
      }
    }
  }

  return json({ success: false });
};

export default function Billing() {
  const { currentPlan, billingStatus, subscription, plans } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();
  const [searchParams] = useSearchParams();
  const isLoading = fetcher.state !== "idle";
  const billingCallback = searchParams.get("billing_callback") === "1";

  return (
    <Page>
      <TitleBar title="Plans & Billing" />
      <BlockStack gap="500">
        {billingCallback && billingStatus === "active" && (
          <Banner tone="success" title="Subscription active">
            <p>Your plan is active and the dashboard has been updated.</p>
          </Banner>
        )}

        {billingCallback && billingStatus !== "active" && (
          <Banner tone="warning" title="Subscription not active yet">
            <p>Shopify has not returned an active subscription. Refresh this page or try again.</p>
          </Banner>
        )}

        {fetcher.data?.success && fetcher.data?.alreadySubscribed && (
          <Banner tone="info" title="Already subscribed">
            <p>Your subscription is already active on this plan.</p>
          </Banner>
        )}

        {fetcher.data?.success && !fetcher.data?.alreadySubscribed && (
          <Banner tone="success" title="Subscription cancelled">
            <p>Your shop is back on the Free plan. Existing logs are kept, but paid features are locked.</p>
          </Banner>
        )}

        {fetcher.data?.error && (
          <Banner tone="critical" title="Billing error">
            <p>{fetcher.data.error}</p>
          </Banner>
        )}

        <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
          {plans.map((plan) => (
            <Card key={plan.key}>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    {plan.name}
                  </Text>
                  {currentPlan === plan.key && <Badge tone="success">Current</Badge>}
                </InlineStack>

                <Text as="p" variant="headingXl">
                  {plan.price === 0 ? "Free" : `$${plan.price}`}
                  {plan.price > 0 && (
                    <Text as="span" variant="bodySm" tone="subdued">
                      /month
                    </Text>
                  )}
                </Text>

                {plan.trialDays > 0 && <Badge tone="info">{`${plan.trialDays}-day trial`}</Badge>}

                <Divider />

                <List>
                  {plan.features.map((feature, i) => (
                    <List.Item key={i}>{feature}</List.Item>
                  ))}
                </List>

                {currentPlan !== plan.key && plan.key !== "free" && (
                  <fetcher.Form method="post">
                    <input type="hidden" name="action" value="subscribe" />
                    <input type="hidden" name="plan" value={plan.key} />
                    <Button submit variant="primary" fullWidth loading={isLoading}>
                      Upgrade to {plan.name}
                    </Button>
                  </fetcher.Form>
                )}

                {currentPlan === plan.key && plan.key !== "free" && subscription && (
                  <fetcher.Form method="post">
                    <input type="hidden" name="action" value="cancel" />
                    <input type="hidden" name="subscriptionId" value={subscription.id} />
                    <Button submit tone="critical" variant="plain" loading={isLoading}>
                      Cancel subscription
                    </Button>
                  </fetcher.Form>
                )}
              </BlockStack>
            </Card>
          ))}
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}
