import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`[IndexBoost] ${topic} for ${shop}`);

  // Clean up all shop data
  const shopRecord = await db.shop.findUnique({ where: { domain: shop } });
  if (shopRecord) {
    await db.queueItem.deleteMany({ where: { shopId: shopRecord.id } });
    await db.submission.deleteMany({ where: { shopId: shopRecord.id } });
    await db.shop.delete({ where: { id: shopRecord.id } });
  }

  return new Response(JSON.stringify({ message: "Shop data redacted" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
