import Anthropic from "@anthropic-ai/sdk";
import db from "../db.server";

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in your environment variables.",
    );
  }
  return new Anthropic({ apiKey });
}

export interface SeoResult {
  title: string;
  description: string;
}

export async function generateSEO(
  productTitle: string,
  productDescription: string,
): Promise<SeoResult> {
  const cleanDesc = productDescription
    .replace(/<[^>]*>/g, "")
    .trim()
    .substring(0, 500);

  const client = getClient();
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `You are a world-class Shopify SEO copywriter.

Write:
1. SEO title (max 70 chars)
2. Meta description (max 160 chars)

Rules:
- Include primary keyword naturally
- Add emotional trigger
- Focus on benefits, not features
- Increase click-through rate (CTR)
- Make it compelling and persuasive

Avoid:
- Generic phrases
- Keyword stuffing

Product:
${productTitle}
Description:
${cleanDesc || "No description provided"}

Respond in EXACTLY this format (no extra text):
TITLE: [your seo title here]
DESCRIPTION: [your meta description here]`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return parseSEOResponse(text, productTitle);
}

function parseSEOResponse(text: string, fallbackTitle: string): SeoResult {
  const titleMatch = text.match(/TITLE:\s*(.+)/i);
  const descMatch = text.match(/DESCRIPTION:\s*(.+)/i);

  return {
    title: (titleMatch?.[1]?.trim() || fallbackTitle).substring(0, 70),
    description: (descMatch?.[1]?.trim() || "").substring(0, 160),
  };
}

export async function bulkGenerateSEO(
  products: Array<{ id: string; title: string; description: string }>,
): Promise<Array<{ id: string; seo: SeoResult; error?: string }>> {
  const results = [];

  for (const product of products) {
    try {
      const seo = await generateSEO(product.title, product.description);
      results.push({ id: product.id, seo });
    } catch (error) {
      results.push({
        id: product.id,
        seo: { title: product.title, description: "" },
        error: error instanceof Error ? error.message : "AI generation failed",
      });
    }
  }

  return results;
}

function parseSettings(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Credit tracking
export async function consumeAiCredits(shopId: string, count: number = 1): Promise<boolean> {
  // Use a transaction to make the read-check-write atomic and prevent double-spend
  // under concurrent AI generation requests from the same shop.
  return db.$transaction(async (tx) => {
    const shop = await tx.shop.findUnique({ where: { id: shopId } });
    if (!shop) return false;

    const settings = parseSettings(shop.settings);
    const credits = (settings.aiCreditsRemaining as number) ?? getDefaultCredits(shop.plan);

    if (credits < count) return false;

    settings.aiCreditsRemaining = credits - count;
    await tx.shop.update({
      where: { id: shopId },
      data: { settings: JSON.stringify(settings) },
    });

    return true;
  });
}

export async function getCreditsRemaining(shopId: string): Promise<number> {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) return 0;

  const settings = parseSettings(shop.settings);
  return (settings.aiCreditsRemaining as number) ?? getDefaultCredits(shop.plan);
}

export async function resetMonthlyCredits(shopId: string): Promise<void> {
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) return;

  const settings = parseSettings(shop.settings);
  settings.aiCreditsRemaining = getDefaultCredits(shop.plan);
  settings.creditsResetAt = getNextMonthReset().toISOString();

  await db.shop.update({
    where: { id: shopId },
    data: { settings: JSON.stringify(settings) },
  });
}

function getDefaultCredits(plan: string): number {
  switch (plan) {
    case "business":
      return 1000;
    case "pro":
      return 200;
    default:
      return 10;
  }
}

function getNextMonthReset(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function seoScore(product: {
  seoTitle?: string;
  seoDescription?: string;
  title?: string;
}): { score: number; issues: string[] } {
  const issues: string[] = [];
  const title = product.seoTitle || product.title || "";
  const desc = product.seoDescription || "";

  if (!title) {
    issues.push("Missing SEO title");
  } else if (title.length < 30) {
    issues.push(`Title too short (${title.length}/70 chars)`);
  } else if (title.length > 70) {
    issues.push(`Title too long (${title.length}/70 chars)`);
  }

  if (!desc) {
    issues.push("Missing meta description");
  } else if (desc.length < 100) {
    issues.push(`Description too short (${desc.length}/160 chars)`);
  } else if (desc.length > 160) {
    issues.push(`Description too long (${desc.length}/160 chars)`);
  }

  const errorWeight = issues.filter((i) => i.includes("Missing")).length * 30;
  const warningWeight = (issues.length - issues.filter((i) => i.includes("Missing")).length) * 10;
  const score = Math.max(0, 100 - errorWeight - warningWeight);

  return { score, issues };
}
