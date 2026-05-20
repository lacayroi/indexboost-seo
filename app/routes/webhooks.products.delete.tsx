import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { handleProductWebhook } from "../services/webhook-handler.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`[IndexBoost] ${topic} webhook for ${shop}`);

  try {
    await handleProductWebhook(shop, payload, "delete");
  } catch (error) {
    console.error(`[IndexBoost] Error handling ${topic}:`, error);
  }

  return new Response();
};
