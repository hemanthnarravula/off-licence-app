import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import {
  extractProductLabelFromImage,
  hasAiSdkAuth,
} from "@/lib/ai/extract-product-label";
import { corsHeaders, preflight } from "@/lib/cors";

export const runtime = "nodejs";

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

function guessMime(filename: string | null, fallback: string) {
  const lower = (filename ?? "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  if (fallback.startsWith("image/")) return fallback;
  return "image/jpeg";
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error:
            "BLOB_READ_WRITE_TOKEN is not set. Add a Vercel Blob token to upload product photos.",
        },
        { status: 500, headers },
      );
    }

    const form = await request.formData();
    const file = form.get("photo");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "photo file is required" },
        { status: 400, headers },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length === 0) {
      return NextResponse.json(
        { error: "Empty photo upload" },
        { status: 400, headers },
      );
    }

    if (bytes.length > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Photo must be under 8MB" },
        { status: 400, headers },
      );
    }

    const mime = guessMime(file.name, file.type || "image/jpeg");
    const ext =
      mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : "jpg";
    const pathname = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const contentType = mime === "image/heic" ? "image/jpeg" : mime;

    const blob = await put(pathname, bytes, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });

    const imageUrl = blob.url;

    if (!hasAiSdkAuth()) {
      return NextResponse.json(
        {
          imageUrl,
          extracted: null,
          message:
            "Photo saved to Vercel Blob. Add AI_GATEWAY_API_KEY (or run vercel env pull for OIDC) so the AI SDK can extract name and brand.",
        },
        { headers },
      );
    }

    const extracted = await extractProductLabelFromImage({
      image: bytes,
      mediaType: contentType,
    });

    return NextResponse.json(
      {
        imageUrl,
        extracted,
      },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process product photo",
      },
      { status: 500, headers },
    );
  }
}
