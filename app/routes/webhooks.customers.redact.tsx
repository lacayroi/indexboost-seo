import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic } = await authenticate.webhook(request);
  console.log(`[IndexBoost] ${topic} - No customer data to redact`);

  return new Response(JSON.stringify({ message: "No customer data stored" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
