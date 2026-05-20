/**
 * Basic SEO Audit
 * Checks common SEO issues on products, collections, pages
 */

export interface SeoIssue {
  type: "error" | "warning" | "info";
  field: string;
  message: string;
}

export interface SeoAuditResult {
  url: string;
  title: string;
  score: number; // 0-100
  issues: SeoIssue[];
}

export function auditProduct(product: any, shopDomain: string): SeoAuditResult {
  const issues: SeoIssue[] = [];
  const url = `https://${shopDomain}/products/${product.handle}`;

  // Title checks
  const title = product.seo?.title || product.title || "";
  if (!title) {
    issues.push({ type: "error", field: "title", message: "Missing page title" });
  } else if (title.length < 30) {
    issues.push({ type: "warning", field: "title", message: `Title too short (${title.length} chars, recommend 50-60)` });
  } else if (title.length > 60) {
    issues.push({ type: "warning", field: "title", message: `Title too long (${title.length} chars, recommend 50-60)` });
  }

  // Description checks
  const description = product.seo?.description || product.bodyHtml || "";
  const descText = description.replace(/<[^>]*>/g, "").trim();
  if (!descText) {
    issues.push({ type: "error", field: "description", message: "Missing meta description" });
  } else if (descText.length < 120) {
    issues.push({ type: "warning", field: "description", message: `Description too short (${descText.length} chars, recommend 150-160)` });
  } else if (descText.length > 160) {
    issues.push({ type: "info", field: "description", message: `Description may be truncated in search results (${descText.length} chars)` });
  }

  // Image checks
  const images = product.images?.edges || product.images || [];
  if (images.length === 0) {
    issues.push({ type: "error", field: "images", message: "No product images" });
  } else {
    const imgNodes = images.map((i: any) => i.node || i);
    const missingAlt = imgNodes.filter((img: any) => !img.altText);
    if (missingAlt.length > 0) {
      issues.push({
        type: "warning",
        field: "images",
        message: `${missingAlt.length} image(s) missing alt text`,
      });
    }
  }

  // Handle check
  if (product.handle && product.handle.includes("--")) {
    issues.push({ type: "info", field: "url", message: "URL handle contains double hyphens" });
  }

  // Price check
  const variants = product.variants?.edges || product.variants || [];
  if (variants.length === 0) {
    issues.push({ type: "warning", field: "variants", message: "No variants/pricing set" });
  }

  // Calculate score
  const errorCount = issues.filter((i) => i.type === "error").length;
  const warningCount = issues.filter((i) => i.type === "warning").length;
  const score = Math.max(0, 100 - errorCount * 20 - warningCount * 10);

  return { url, title: product.title || "Untitled", score, issues };
}

export function auditCollection(collection: any, shopDomain: string): SeoAuditResult {
  const issues: SeoIssue[] = [];
  const url = `https://${shopDomain}/collections/${collection.handle}`;

  const title = collection.seo?.title || collection.title || "";
  if (!title) {
    issues.push({ type: "error", field: "title", message: "Missing page title" });
  } else if (title.length < 30) {
    issues.push({ type: "warning", field: "title", message: `Title too short (${title.length} chars)` });
  }

  const description = collection.seo?.description || collection.descriptionHtml || "";
  const descText = description.replace(/<[^>]*>/g, "").trim();
  if (!descText) {
    issues.push({ type: "error", field: "description", message: "Missing meta description" });
  } else if (descText.length < 120) {
    issues.push({ type: "warning", field: "description", message: `Description too short (${descText.length} chars)` });
  }

  const image = collection.image;
  if (!image) {
    issues.push({ type: "warning", field: "image", message: "No collection image" });
  } else if (!image.altText) {
    issues.push({ type: "warning", field: "image", message: "Collection image missing alt text" });
  }

  const errorCount = issues.filter((i) => i.type === "error").length;
  const warningCount = issues.filter((i) => i.type === "warning").length;
  const score = Math.max(0, 100 - errorCount * 20 - warningCount * 10);

  return { url, title: collection.title || "Untitled", score, issues };
}

export function getOverallScore(results: SeoAuditResult[]): number {
  if (results.length === 0) return 100;
  const total = results.reduce((sum, r) => sum + r.score, 0);
  return Math.round(total / results.length);
}
