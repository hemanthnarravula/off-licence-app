import { requireRoles } from "@/lib/authz";
import {
  extractProductFieldsFromImage,
  isAiExtractionConfigured,
} from "@/lib/ai/extract-product-label";
import { jsonError } from "@/lib/http";
import {
  isAllowedImageType,
  storeProductImage,
} from "@/lib/product-image-storage";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireRoles(["owner", "manager"]);

    const form = await request.formData();
    const file = form.get("file") ?? form.get("photo");
    if (!(file instanceof File)) {
      return Response.json(
        { error: "photo file is required (field name: file or photo)" },
        { status: 400 },
      );
    }

    const contentType = file.type || "image/jpeg";
    if (!isAllowedImageType(contentType)) {
      return Response.json(
        { error: "Only JPEG, PNG, WebP, or GIF images are allowed" },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: "Image must be 8MB or smaller" },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const imageUrl = await storeProductImage(bytes, contentType, "draft");

    let extracted: {
      name: string | null;
      brand: string | null;
      category: string | null;
      size: string | null;
    } | null = null;
    let extractionWarning: string | null = null;

    if (!isAiExtractionConfigured()) {
      extractionWarning =
        "Image saved. AI extraction is not configured — set AI_GATEWAY_API_KEY to auto-fill name, brand, size, and category.";
    } else {
      try {
        extracted = await extractProductFieldsFromImage(bytes, contentType);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "AI extraction failed";
        extractionWarning = `Image saved, but label extraction failed: ${message}`;
      }
    }

    return Response.json({
      imageUrl,
      extracted,
      extractionWarning,
    });
  } catch (error) {
    return jsonError(error);
  }
}
