import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { logger } from "../services/logger.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  logger.info("Webhook received", { topic, shop });

  const current = payload.current as string[];
  if (session) {
    try {
      await db.session.update({
        where: { id: session.id },
        data: { scope: current.toString() },
      });
    } catch (err) {
      // Session may have been deleted (e.g. app reinstall race). Not fatal.
      logger.warn("Could not update session scope", { sessionId: session.id, shop });
    }
  }
  return new Response();
};
