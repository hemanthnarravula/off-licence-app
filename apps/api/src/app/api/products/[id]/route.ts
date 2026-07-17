import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { product } from "@off-licence/db/schema";
import { corsHeaders, preflight } from "@/lib/cors";
import { db } from "@/lib/db";

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "product id is required" },
      { status: 400, headers },
    );
  }

  try {
    const [existing] = await db
      .select()
      .from(product)
      .where(eq(product.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404, headers },
      );
    }

    if (
      existing.imageUrl &&
      process.env.BLOB_READ_WRITE_TOKEN &&
      existing.imageUrl.includes("blob.vercel-storage.com")
    ) {
      try {
        await del(existing.imageUrl);
      } catch {
        // Product delete should still proceed if blob cleanup fails
      }
    }

    await db.delete(product).where(eq(product.id, id));

    return NextResponse.json(
      { ok: true, id },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete product",
      },
      { status: 500, headers },
    );
  }
}
