import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

const checks = [];

function check(name, pass, details = "") {
  checks.push({ name, pass, details });
}

const billingService = read("app/services/billing.server.ts");
const billingRoute = read("app/routes/app.billing.tsx");
const schema = read("prisma/schema.prisma");
const uninstallRoute = read("app/routes/webhooks.app.uninstalled.tsx");

check("Free plan is $0", /free:[\s\S]*?price:\s*0/.test(billingService));
check("Pro plan is $9.95/month", /pro:[\s\S]*?price:\s*9\.95[\s\S]*?interval:\s*"EVERY_30_DAYS"/.test(billingService));
check("Business plan is $19.95/month", /business:[\s\S]*?price:\s*19\.95[\s\S]*?interval:\s*"EVERY_30_DAYS"/.test(billingService));
check("Trial is explicit", /trialDays:\s*0/.test(billingService));
check("Subscription create redirects to confirmation URL", /confirmationUrl/.test(billingRoute) && /redirect\(result\.confirmationUrl\)/.test(billingRoute));
check("Billing test mode is env-controlled", /SHOPIFY_BILLING_TEST/.test(billingService) && /test:\s*\$test/.test(billingService));
check("Billing callback syncs Shopify active subscription", /syncShopBillingStatus/.test(billingRoute));
check("Only ACTIVE subscriptions unlock paid plans", /activeSub\.status !== "ACTIVE"/.test(billingService));
check("Shop billing state is persisted", /billingStatus/.test(schema) && /subscriptionId/.test(schema));
check("Cancel marks shop back to Free", /markShopCancelled/.test(billingRoute) && /plan:\s*"free"/.test(billingService));
check("Billing UI shows success banner", /Subscription active/.test(billingRoute));
check("Billing UI shows error banner", /Billing error/.test(billingRoute));

const proActionRoutes = [
  ["Bulk indexing", "app/routes/app.submit.tsx", /actionType === "bulk_index"[\s\S]*?requirePlan\(admin,\s*"pro"\)/],
  ["Sitemap generator", "app/routes/app.sitemap.tsx", /requirePlan\(admin,\s*"pro"\)/],
  ["Meta tags editor", "app/routes/app.meta-tags.tsx", /requirePlan\(admin,\s*"pro"\)/],
  ["Robots.txt editor", "app/routes/app.robots-txt.tsx", /requirePlan\(admin,\s*"pro"\)/],
  ["Broken link scanner", "app/routes/app.broken-links.tsx", /requirePlan\(admin,\s*"pro"\)/],
  ["Redirect manager", "app/routes/app.redirects.tsx", /requirePlan\(admin,\s*"pro"\)/],
];

const proLoaderRoutes = [
  ["Schema generator", "app/routes/app.schema.tsx", /plan === "free"/],
  ["LLMs.txt generator", "app/routes/app.llms-txt.tsx", /plan === "free"/],
  ["HTML sitemap generator", "app/routes/app.html-sitemap.tsx", /plan === "free"/],
  ["SEO audit", "app/routes/app.seo-audit.tsx", /plan === "free"/],
];

const businessRoutes = [
  ["AI alt text", "app/routes/app.image-seo.tsx", /requirePlan\(admin,\s*"business"\)/],
  ["Email alerts", "app/routes/app.alerts.tsx", /requirePlan\(admin,\s*"business"\)/],
  ["GSC index health check", "app/routes/app.index-health.tsx", /plan !== "business"/],
];

for (const [name, path, pattern] of proActionRoutes) {
  check(`${name} action requires Pro+`, pattern.test(read(path)), path);
}

for (const [name, path, pattern] of proLoaderRoutes) {
  check(`${name} UI is gated for Free`, pattern.test(read(path)), path);
}

for (const [name, path, pattern] of businessRoutes) {
  check(`${name} requires Business`, pattern.test(read(path)), path);
}

check("Uninstall deletes sessions", /db\.session\.deleteMany/.test(uninstallRoute));
check("Uninstall deletes queue items", /db\.queueItem\.deleteMany/.test(uninstallRoute));
check("Uninstall deletes sensitive shop record", /db\.shop\.delete/.test(uninstallRoute));

const failed = checks.filter((item) => !item.pass);

for (const item of checks) {
  const status = item.pass ? "PASS" : "FAIL";
  console.log(`${status} ${item.name}${item.details ? ` (${item.details})` : ""}`);
}

if (failed.length > 0) {
  console.error(`\nBilling dry run failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log("\nBilling dry run passed.");
