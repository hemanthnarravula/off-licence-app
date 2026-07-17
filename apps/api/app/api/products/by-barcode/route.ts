import { and, eq } from "drizzle-orm";
import { inventory, products, sourcePlaces, stores } from "@offlicence/db";
import {
  assertStoreAccess,
  requireRoles,
} from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const { membership } = await requireRoles([
      "owner",
      "manager",
      "staff",
      "customer",
    ]);
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode")?.trim();
    const storeId = searchParams.get("storeId")?.trim();

    if (!barcode) {
      return Response.json({ error: "barcode is required" }, { status: 400 });
    }

    const [product] = await db
      .select({
        id: products.id,
        barcode: products.barcode,
        name: products.name,
        brand: products.brand,
        category: products.category,
        size: products.size,
        abv: products.abv,
        imageUrl: products.imageUrl,
        sourcePlaceId: products.sourcePlaceId,
        sourcePlaceName: sourcePlaces.name,
      })
      .from(products)
      .leftJoin(sourcePlaces, eq(products.sourcePlaceId, sourcePlaces.id))
      .where(
        and(
          eq(products.organisationId, membership.organisationId),
          eq(products.barcode, barcode),
        ),
      )
      .limit(1);

    if (!product) {
      return Response.json({
        found: false,
        barcode,
      });
    }

    // Customer: availability across stores with qty > 0
    if (membership.role === "customer") {
      const rows = await db
        .select({
          storeId: stores.id,
          storeName: stores.name,
          address: stores.address,
          quantity: inventory.quantity,
          sellPricePence: inventory.sellPricePence,
        })
        .from(inventory)
        .innerJoin(stores, eq(inventory.storeId, stores.id))
        .where(
          and(
            eq(inventory.productId, product.id),
            eq(stores.organisationId, membership.organisationId),
          ),
        );

      return Response.json({
        found: true,
        product,
        stores: rows.filter(
          (row) => row.quantity != null && row.quantity > 0,
        ),
      });
    }

    if (!storeId) {
      return Response.json(
        { error: "storeId is required for staff/manager/owner lookup" },
        { status: 400 },
      );
    }

    assertStoreAccess(membership, storeId);

    const [store] = await db
      .select()
      .from(stores)
      .where(
        and(
          eq(stores.id, storeId),
          eq(stores.organisationId, membership.organisationId),
        ),
      )
      .limit(1);
    if (!store) {
      return Response.json({ error: "Store not found" }, { status: 404 });
    }

    const [inv] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.storeId, storeId),
          eq(inventory.productId, product.id),
        ),
      )
      .limit(1);

    return Response.json({
      found: true,
      product,
      store: {
        id: store.id,
        name: store.name,
      },
      inventory: inv
        ? {
            id: inv.id,
            quantity: inv.quantity,
            sellPricePence: inv.sellPricePence,
            reorderLevel: inv.reorderLevel,
            quantityUnset: inv.quantity == null,
          }
        : {
            id: null,
            quantity: null,
            sellPricePence: null,
            reorderLevel: null,
            quantityUnset: true,
          },
    });
  } catch (error) {
    return jsonError(error);
  }
}
