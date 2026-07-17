import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { inventory, product, store } from "@off-licence/db/schema";
import { corsHeaders, preflight } from "@/lib/cors";
import { db } from "@/lib/db";

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get("barcode");

  if (!barcode) {
    return NextResponse.json(
      { error: "barcode query param is required" },
      { status: 400, headers: corsHeaders(origin) },
    );
  }

  const rows = await db
    .select({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      sourcePlace: product.sourcePlace,
      size: product.size,
      abv: product.abv,
      barcode: product.barcode,
      imageUrl: product.imageUrl,
      storeId: store.id,
      storeName: store.name,
      storeAddress: store.address,
      quantity: inventory.quantity,
      sellPricePence: inventory.sellPricePence,
    })
    .from(product)
    .innerJoin(inventory, eq(inventory.productId, product.id))
    .innerJoin(store, eq(store.id, inventory.storeId))
    .where(and(eq(product.barcode, barcode)));

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404, headers: corsHeaders(origin) },
    );
  }

  const first = rows[0];
  return NextResponse.json(
    {
      product: {
        id: first.productId,
        barcode: first.barcode,
        name: first.name,
        brand: first.brand,
        category: first.category,
        sourcePlace: first.sourcePlace,
        size: first.size,
        abv: first.abv,
        imageUrl: first.imageUrl,
      },
      availability: rows
        .filter((r) => r.quantity > 0)
        .map((r) => ({
          storeId: r.storeId,
          storeName: r.storeName,
          storeAddress: r.storeAddress,
          quantity: r.quantity,
          sellPricePence: r.sellPricePence,
        })),
    },
    { headers: corsHeaders(origin) },
  );
}
