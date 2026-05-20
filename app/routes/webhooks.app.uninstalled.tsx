import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { logger } from "../services/logger.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  logger.info("Webhook received", { topic, shop });

  // Wrap all deletions in a transaction so partial failures don't leave orphaned data.
  // Session cleanup is unconditional — we must clean up even if the session was already
  // deleted (e.g. by a concurrent reinstall) before this webhook arrived.
  await db.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { shop } });

    const shopRecord = await tx.shop.findUnique({ where: { domain: shop } });
    if (shopRecord) {
      await tx.queueItem.deleteMany({ where: { shopId: shopRecord.id } });
      await tx.submission.deleteMany({ where: { shopId: shopRecord.id } });
      await tx.shop.delete({ where: { id: shopRecord.id } });
    }
  });

  return new Response();
};
