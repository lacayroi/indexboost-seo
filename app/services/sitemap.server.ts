const GOOGLE_PING_URL = "https://www.google.com/ping";
const BING_PING_URL = "https://www.bing.com/ping";

export async function submitSitemapToGoogle(
  sitemapUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${GOOGLE_PING_URL}?sitemap=${encodeURIComponent(sitemapUrl)}`;
    const response = await fetch(url);
    return { success: response.ok };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function submitSitemapToBing(
  sitemapUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${BING_PING_URL}?sitemap=${encodeURIComponent(sitemapUrl)}`;
    const response = await fetch(url);
    return { success: response.ok };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function submitSitemapToAll(shopDomain: string) {
  const sitemapUrl = `https://${shopDomain}/sitemap.xml`;

  const [google, bing] = await Promise.all([
    submitSitemapToGoogle(sitemapUrl),
    submitSitemapToBing(sitemapUrl),
  ]);

  return { sitemapUrl, google, bing };
}

export async function getSitemapUrls(
  shopDomain: string,
): Promise<string[]> {
  try {
    const response = await fetch(`https://${shopDomain}/sitemap.xml`);
    if (!response.ok) return [];

    const xml = await response.text();
    // Extract all <loc> URLs from sitemap
    const urls: string[] = [];
    const locRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
      urls.push(match[1]);
    }
    return urls;
  } catch {
    return [];
  }
}
