import fs from "node:fs";
import path from "node:path";
import process from "node:process";

loadDotEnvIfPresent();

const invalidHosts = new Set(["admin.shopify.com", "shopify.dev", "localhost"]);
const errors = [];
const warnings = [];

validatePublicAppUrl();
validateDatabaseUrl();
validateBillingMode();

if (warnings.length > 0) {
  for (const warning of warnings) {
    console.warn(`[env] ${warning}`);
  }
}

if (errors.length > 0) {
  console.error(`Invalid server environment:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

function validatePublicAppUrl() {
  const rawUrl = process.env.SHOPIFY_APP_URL;

  if (!rawUrl) {
    errors.push("SHOPIFY_APP_URL is required.");
    return;
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    errors.push("SHOPIFY_APP_URL must be a valid absolute URL.");
    return;
  }

  if (parsed.protocol !== "https:") {
    errors.push("SHOPIFY_APP_URL must use https.");
  }

  if (invalidHosts.has(parsed.hostname) || parsed.hostname.endsWith(".shopify.dev")) {
    errors.push("SHOPIFY_APP_URL must point to the public app origin, not a Shopify admin/dev/localhost URL.");
  }

  if (rawUrl.includes("YOUR_PRODUCTION_APP_DOMAIN") || rawUrl.includes("default-app-home")) {
    errors.push("SHOPIFY_APP_URL still contains a production placeholder.");
  }
}

function validateDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required.");
  }

  if (process.env.NODE_ENV === "production") {
    const runtimeUrl = process.env.DATABASE_URL || "";
    const productionPrismaUrl = process.env.POSTGRES_DATABASE_URL || "";

    if (!runtimeUrl.startsWith("postgresql://") && !runtimeUrl.startsWith("postgres://")) {
      errors.push("DATABASE_URL must be a PostgreSQL URL in production.");
    }

    if (!productionPrismaUrl.startsWith("postgresql://") && !productionPrismaUrl.startsWith("postgres://")) {
      errors.push("POSTGRES_DATABASE_URL must be set to the PostgreSQL URL when using prisma/schema.production.prisma.");
    }

    if (runtimeUrl && productionPrismaUrl && runtimeUrl !== productionPrismaUrl) {
      warnings.push("DATABASE_URL and POSTGRES_DATABASE_URL differ. Use the same PostgreSQL database for runtime and production Prisma commands unless this is intentional.");
    }
  }
}

function validateBillingMode() {
  if (process.env.NODE_ENV === "production" && process.env.SHOPIFY_BILLING_TEST === "true") {
    errors.push("SHOPIFY_BILLING_TEST must be false in production.");
  }
}

function loadDotEnvIfPresent() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
