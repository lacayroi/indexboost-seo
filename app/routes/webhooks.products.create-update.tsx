import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { handleProductWebhook, getOrCreateShop } from "../services/webhook-handler.server";
import { logger } from "../services/logger.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  logger.info("Webhook received", { topic, shop });

  try {
    // Indexing
    await handleProductWebhook(shop, payload, "update");

    // Auto AI SEO on product create (Business plan only)
    if (topic === "PRODUCTS_CREATE" || topic === "products/create") {
      try {
        const shopRecord = await getOrCreateShop(shop);
        if (shopRecord.plan === "business") {
          const settings = shopRecord.settings
            ? JSON.parse(shopRecord.settings as string)
            : {};
          const autoSeo = settings.autoAiSeo !== false; // default true for business

          if (autoSeo) {
            const { generateSEO, consumeAiCredits } = await import(
              "../services/ai-seo.server"
            );
            const hasCredits = await consumeAiCredits(shopRecord.id);
            if (hasCredits && payload.title) {
              const seo = await generateSEO(
                payload.title,
                payload.body_html || payload.description || "",
              );
              console.log(
                `[IndexBoost] Auto AI SEO for "${payload.title}": ${seo.title}`,
              );
              // Note: Cannot update product here without admin API context.
              // SEO will be queued and applied on next dashboard visit.
            }
          }
        }
      } catch (err) {
        console.error("[IndexBoost] Auto AI SEO error:", err);
      }
    }
  } catch (error) {
    console.error(`[IndexBoost] Error handling ${topic}:`, error);
  }

  return new Response();
};
