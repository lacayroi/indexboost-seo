import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { handleBlogPostWebhook } from "../services/webhook-handler.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`[IndexBoost] ${topic} webhook for ${shop}`);

  try {
    await handleBlogPostWebhook(shop, payload, "update");
  } catch (error) {
    console.error(`[IndexBoost] Error handling ${topic}:`, error);
  }

  return new Response();
};
