/**
 * LLMs.txt Generator
 * Generates a llms.txt file that helps AI search engines (ChatGPT, Claude, Perplexity)
 * understand and index the store's content better.
 * See: https://llmstxt.org/
 */

interface StoreData {
  shopName: string;
  shopDomain: string;
  description?: string;
  products: Array<{ title: string; handle: string; description?: string; price?: string }>;
  collections: Array<{ title: string; handle: string; description?: string }>;
  pages: Array<{ title: string; handle: string }>;
}

export function generateLlmsTxt(data: StoreData): string {
  const lines: string[] = [];

  lines.push(`# ${data.shopName}`);
  lines.push("");

  if (data.description) {
    lines.push(`> ${data.description}`);
    lines.push("");
  }

  lines.push(`This is the llms.txt file for ${data.shopName} (https://${data.shopDomain}).`);
  lines.push(`It provides structured information about the store for AI assistants and search engines.`);
  lines.push("");

  // Collections
  if (data.collections.length > 0) {
    lines.push("## Collections");
    lines.push("");
    for (const col of data.collections) {
      const url = `https://${data.shopDomain}/collections/${col.handle}`;
      lines.push(`- [${col.title}](${url})${col.description ? `: ${cleanText(col.description)}` : ""}`);
    }
    lines.push("");
  }

  // Products
  if (data.products.length > 0) {
    lines.push("## Products");
    lines.push("");
    for (const product of data.products) {
      const url = `https://${data.shopDomain}/products/${product.handle}`;
      const desc = product.description ? `: ${cleanText(product.description)}` : "";
      const price = product.price ? ` ($${product.price})` : "";
      lines.push(`- [${product.title}](${url})${price}${desc}`);
    }
    lines.push("");
  }

  // Pages
  if (data.pages.length > 0) {
    lines.push("## Pages");
    lines.push("");
    for (const page of data.pages) {
      const url = `https://${data.shopDomain}/pages/${page.handle}`;
      lines.push(`- [${page.title}](${url})`);
    }
    lines.push("");
  }

  // Store links
  lines.push("## Links");
  lines.push("");
  lines.push(`- [Home](https://${data.shopDomain})`);
  lines.push(`- [All Products](https://${data.shopDomain}/collections/all)`);
  lines.push(`- [Sitemap](https://${data.shopDomain}/sitemap.xml)`);
  lines.push("");

  return lines.join("\n");
}

export function generateLlmsFullTxt(data: StoreData): string {
  const lines: string[] = [];

  lines.push(`# ${data.shopName} - Full Content`);
  lines.push("");

  if (data.description) {
    lines.push(`> ${data.description}`);
    lines.push("");
  }

  // Detailed product info
  for (const product of data.products) {
    lines.push(`## ${product.title}`);
    lines.push("");
    lines.push(`URL: https://${data.shopDomain}/products/${product.handle}`);
    if (product.price) lines.push(`Price: $${product.price}`);
    if (product.description) {
      lines.push("");
      lines.push(cleanText(product.description));
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function cleanText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 200);
}
