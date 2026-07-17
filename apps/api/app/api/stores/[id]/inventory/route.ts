import { and, asc, eq, isNotNull, lte, sql } from "drizzle-orm";
import { inventory, products, sourcePlaces, stores } from "@offlicence/db";
import {
  assertStoreAccess,
  requireRoles,
} from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { membership } = await requireRoles([
      "owner",
      "manager",
      "staff",
    ]);
    const { id: storeId } = await params;
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

    const lowStock =
      new URL(request.url).searchParams.get("lowStock") === "1";

    const conditions = [eq(inventory.storeId, storeId)];
    if (lowStock) {
      conditions.push(isNotNull(inventory.quantity));
      conditions.push(isNotNull(inventory.reorderLevel));
      conditions.push(
        lte(inventory.quantity, sql`${inventory.reorderLevel}`),
      );
    }

    const rows = await db
      .select({
        inventoryId: inventory.id,
        productId: products.id,
        barcode: products.barcode,
        name: products.name,
        brand: products.brand,
        category: products.category,
        sourcePlaceName: sourcePlaces.name,
        quantity: inventory.quantity,
        sellPricePence: inventory.sellPricePence,
        reorderLevel: inventory.reorderLevel,
        imageUrl: products.imageUrl,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .leftJoin(sourcePlaces, eq(products.sourcePlaceId, sourcePlaces.id))
      .where(and(...conditions))
      .orderBy(asc(products.category), asc(products.name));

    return Response.json({ store, inventory: rows });
  } catch (error) {
    return jsonError(error);
  }
}
