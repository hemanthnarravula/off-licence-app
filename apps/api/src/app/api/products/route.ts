import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { inventory, organisation, product, store } from "@off-licence/db/schema";
import { categories } from "@off-licence/shared";
import { corsHeaders, preflight } from "@/lib/cors";
import { db } from "@/lib/db";

export function OPTIONS(request: NextRequest) {
  return preflight(request);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    const body = (await request.json()) as {
      barcode?: string;
      name?: string;
      brand?: string;
      category?: string;
      sourcePlace?: string;
      size?: string;
      abv?: string;
      imageUrl?: string;
      /** Sell price in pence, or decimal pounds via sellPrice */
      sellPricePence?: number;
      sellPrice?: string | number;
      quantity?: number;
    };

    const barcode = body.barcode?.trim();
    const name = body.name?.trim();

    if (!barcode || !name) {
      return NextResponse.json(
        { error: "barcode and name are required" },
        { status: 400, headers },
      );
    }

    const quantity =
      typeof body.quantity === "number" && Number.isFinite(body.quantity)
        ? Math.max(0, Math.floor(body.quantity))
        : 0;

    let sellPricePence = 0;
    if (
      typeof body.sellPricePence === "number" &&
      Number.isFinite(body.sellPricePence)
    ) {
      sellPricePence = Math.max(0, Math.round(body.sellPricePence));
    } else if (body.sellPrice !== undefined && body.sellPrice !== "") {
      const pounds = Number(body.sellPrice);
      if (!Number.isFinite(pounds) || pounds < 0) {
        return NextResponse.json(
          { error: "sellPrice must be a non-negative number (pounds)" },
          { status: 400, headers },
        );
      }
      sellPricePence = Math.round(pounds * 100);
    }

    const category = categories.includes(body.category as (typeof categories)[number])
      ? (body.category as (typeof categories)[number])
      : "other";

    const [org] = await db.select().from(organisation).limit(1);
    if (!org) {
      return NextResponse.json(
        { error: "No organisation found. Run db:seed first." },
        { status: 400, headers },
      );
    }

    const existing = await db
      .select({ id: product.id })
      .from(product)
      .where(eq(product.barcode, barcode))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A product with this barcode already exists" },
        { status: 409, headers },
      );
    }

    const [created] = await db
      .insert(product)
      .values({
        organisationId: org.id,
        barcode,
        name,
        brand: body.brand?.trim() || null,
        category,
        sourcePlace: body.sourcePlace?.trim() || "Booker",
        size: body.size?.trim() || null,
        abv: body.abv?.trim() || null,
        imageUrl: body.imageUrl?.trim() || null,
      })
      .returning();

    const stores = await db
      .select({ id: store.id })
      .from(store)
      .where(eq(store.organisationId, org.id));

    if (stores.length > 0) {
      await db.insert(inventory).values(
        stores.map((s) => ({
          storeId: s.id,
          productId: created.id,
          quantity,
          sellPricePence,
          reorderLevel: 0,
        })),
      );
    }

    return NextResponse.json(
      {
        product: {
          id: created.id,
          barcode: created.barcode,
          name: created.name,
          brand: created.brand,
          category: created.category,
          sourcePlace: created.sourcePlace,
          size: created.size,
          abv: created.abv,
          imageUrl: created.imageUrl,
        },
        inventory: {
          quantity,
          sellPricePence,
          storeCount: stores.length,
        },
      },
      { status: 201, headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create product",
      },
      { status: 500, headers },
    );
  }
}
