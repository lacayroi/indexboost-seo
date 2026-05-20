/**
 * Smart Alt Text Generator
 * Generates descriptive, SEO-optimized alt text from product metadata.
 * Uses product title, type, vendor, variant info, and image position.
 */

interface ProductData {
  title: string;
  productType?: string;
  vendor?: string;
  tags?: string[];
  variants?: Array<{ title: string; selectedOptions?: Array<{ name: string; value: string }> }>;
}

export function generateAltText(
  product: ProductData,
  imageIndex: number,
  totalImages: number,
): string {
  const title = product.title.trim();
  const type = product.productType?.trim();
  const vendor = product.vendor?.trim();

  // First image: main product shot
  if (imageIndex === 0) {
    if (type && vendor && vendor.toLowerCase() !== title.toLowerCase()) {
      return `${title} - ${type} by ${vendor}`;
    }
    if (type) {
      return `${title} - ${type}`;
    }
    return title;
  }

  // If variants exist, try to match image to variant by position
  if (product.variants && product.variants.length > 1 && imageIndex < product.variants.length) {
    const variant = product.variants[imageIndex];
    const options = variant.selectedOptions
      ?.map((o) => o.value)
      .filter((v) => v.toLowerCase() !== "default title")
      .join(", ");

    if (options) {
      return `${title} - ${options}`;
    }
  }

  // Descriptive labels based on position
  const positionLabels = [
    "", // index 0 handled above
    "side view",
    "detail view",
    "close-up",
    "back view",
    "lifestyle shot",
    "packaging",
    "size guide",
    "texture detail",
    "color swatch",
  ];

  if (imageIndex < positionLabels.length && positionLabels[imageIndex]) {
    return `${title} - ${positionLabels[imageIndex]}`;
  }

  return `${title} - image ${imageIndex + 1} of ${totalImages}`;
}

export function generateFileName(
  productHandle: string,
  imageIndex: number,
  originalUrl: string,
): { current: string; suggested: string } {
  // Extract current filename from URL
  const urlParts = originalUrl.split("/");
  const currentFile = urlParts[urlParts.length - 1]?.split("?")[0] || "unknown";

  // Generate SEO-friendly filename
  const suffix = imageIndex === 0 ? "" : `-${imageIndex + 1}`;
  const extension = currentFile.split(".").pop() || "jpg";
  const suggested = `${productHandle}${suffix}.${extension}`;

  return { current: currentFile, suggested };
}
