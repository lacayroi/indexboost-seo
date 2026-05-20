import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

loadEnvFile(".env.postgres.local");

const prisma = new PrismaClient();
const demoDomain = "postgres-smoke-test.myshopify.com";
const expectedTables = ["Shop", "Session", "Submission", "QueueItem", "Redirect", "SeoAudit"];

try {
  console.log("Checking PostgreSQL tables...");
  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  const tableNames = tables.map((table) => table.table_name);
  console.log(`Tables found: ${tableNames.join(", ") || "(none)"}`);

  const missingTables = expectedTables.filter((table) => !tableNames.includes(table));
  if (missingTables.length > 0) {
    console.log(`Missing expected tables: ${missingTables.join(", ")}`);
  }

  console.log("Cleaning previous smoke data...");
  await prisma.session.deleteMany({ where: { shop: demoDomain } });
  await prisma.shop.deleteMany({ where: { domain: demoDomain } });

  console.log("Inserting demo Shop...");
  const shop = await prisma.shop.create({
    data: {
      domain: demoDomain,
      indexNowKey: "0123456789abcdef0123456789abcdef",
      quotaResetAt: new Date(),
    },
  });

  console.log("Inserting demo Session...");
  await prisma.session.create({
    data: {
      id: `offline_${demoDomain}`,
      shop: demoDomain,
      state: "postgres-smoke-test",
      isOnline: false,
      accessToken: "postgres-smoke-test-token",
    },
  });

  console.log("Inserting demo QueueItem...");
  await prisma.queueItem.create({
    data: {
      shopId: shop.id,
      url: `https://${demoDomain}/products/demo-product`,
      contentType: "product",
      engine: "indexnow",
      action: "update",
      priority: 10,
    },
  });

  console.log("Inserting demo Submission...");
  await prisma.submission.create({
    data: {
      shopId: shop.id,
      url: `https://${demoDomain}/products/demo-product`,
      contentType: "product",
      engine: "indexnow",
      action: "update",
      status: "success",
      statusCode: 200,
    },
  });

  console.log("Querying demo data...");
  const [shopCount, sessionCount, queueCount, submissionCount] = await Promise.all([
    prisma.shop.count({ where: { domain: demoDomain } }),
    prisma.session.count({ where: { shop: demoDomain } }),
    prisma.queueItem.count({ where: { shopId: shop.id } }),
    prisma.submission.count({ where: { shopId: shop.id } }),
  ]);

  assertCount("Shop", shopCount);
  assertCount("Session", sessionCount);
  assertCount("QueueItem", queueCount);
  assertCount("Submission", submissionCount);

  console.log("Deleting demo data...");
  await prisma.session.deleteMany({ where: { shop: demoDomain } });
  await prisma.shop.delete({ where: { id: shop.id } });

  console.log("Confirming cleanup...");
  const [remainingShops, remainingSessions, remainingQueueItems, remainingSubmissions] =
    await Promise.all([
      prisma.shop.count({ where: { domain: demoDomain } }),
      prisma.session.count({ where: { shop: demoDomain } }),
      prisma.queueItem.count({ where: { shopId: shop.id } }),
      prisma.submission.count({ where: { shopId: shop.id } }),
    ]);

  if (
    remainingShops !== 0 ||
    remainingSessions !== 0 ||
    remainingQueueItems !== 0 ||
    remainingSubmissions !== 0
  ) {
    throw new Error(
      `Cleanup failed: Shop=${remainingShops}, Session=${remainingSessions}, QueueItem=${remainingQueueItems}, Submission=${remainingSubmissions}`,
    );
  }

  console.log("PostgreSQL smoke test passed.");

  if (missingTables.includes("Redirect") || missingTables.includes("SeoAudit")) {
    console.log(
      "Note: Redirect and SeoAudit tables are not present because there are no Redirect or SeoAudit Prisma models in the current schema.",
    );
  }
} catch (error) {
  console.error("PostgreSQL smoke test failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

function assertCount(label, count) {
  if (count !== 1) {
    throw new Error(`${label} count expected 1, got ${count}`);
  }
  console.log(`${label}: ${count}`);
}

function loadEnvFile(fileName) {
  const envPath = path.join(process.cwd(), fileName);
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

    process.env[key] = value;
  }
}
