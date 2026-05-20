const INVALID_APP_URL_HOSTS = new Set([
  "admin.shopify.com",
  "shopify.dev",
  "localhost",
]);

function isPlaceholderUrl(value: string) {
  return value.includes("YOUR_PRODUCTION_APP_DOMAIN") || value.includes("default-app-home");
}

function validatePublicAppUrl(errors: string[]) {
  const rawUrl = process.env.SHOPIFY_APP_URL;

  if (!rawUrl) {
    errors.push("SHOPIFY_APP_URL is required.");
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    errors.push("SHOPIFY_APP_URL must be a valid absolute URL.");
    return;
  }

  if (parsed.protocol !== "https:") {
    errors.push("SHOPIFY_APP_URL must use https.");
  }

  if (INVALID_APP_URL_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith(".shopify.dev")) {
    errors.push("SHOPIFY_APP_URL must point to the public app origin, not a Shopify admin/dev/localhost URL.");
  }

  if (isPlaceholderUrl(rawUrl)) {
    errors.push("SHOPIFY_APP_URL still contains a production placeholder.");
  }
}

export function validateServerEnv() {
  const errors: string[] = [];

  validatePublicAppUrl(errors);

  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required.");
  }

  if (!process.env.SHOPIFY_API_KEY) {
    errors.push("SHOPIFY_API_KEY is required.");
  }

  if (!process.env.SHOPIFY_API_SECRET) {
    errors.push("SHOPIFY_API_SECRET is required.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.SHOPIFY_BILLING_TEST === "true"
  ) {
    errors.push("SHOPIFY_BILLING_TEST must be false in production.");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid server environment:\n- ${errors.join("\n- ")}`);
  }
}
