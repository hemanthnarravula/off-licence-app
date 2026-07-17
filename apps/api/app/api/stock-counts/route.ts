import { and, eq } from "drizzle-orm";
import { inventory, products, stockCounts, stores } from "@offlicence/db";
import { stockCountInputSchema } from "@offlicence/shared";
import {
  assertStoreAccess,
  requireRoles,
} from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

function needsLargeDeltaConfirm(
  previous: number | null | undefined,
  counted: number,
) {
  if (previous == null) {
    return counted >= 20;
  }
  const delta = Math.abs(counted - previous);
  return delta >= Math.max(5, Math.ceil(previous * 0.25));
}

export async function POST(request: Request) {
  try {
    const { session, membership } = await requireRoles([
      "owner",
      "manager",
      "staff",
    ]);
    const body = stockCountInputSchema.parse(await request.json());
    assertStoreAccess(membership, body.storeId);

    const [store] = await db
      .select()
      .from(stores)
      .where(
        and(
          eq(stores.id, body.storeId),
          eq(stores.organisationId, membership.organisationId),
        ),
      )
      .limit(1);
    if (!store) {
      return Response.json({ error: "Store not found" }, { status: 404 });
    }

    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, body.productId),
          eq(products.organisationId, membership.organisationId),
        ),
      )
      .limit(1);
    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    const [inv] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.storeId, body.storeId),
          eq(inventory.productId, body.productId),
        ),
      )
      .limit(1);

    const previousQuantity = inv?.quantity ?? null;
    const requiresConfirm = needsLargeDeltaConfirm(
      previousQuantity,
      body.quantityCounted,
    );

    if (requiresConfirm && !body.confirmLargeDelta) {
      return Response.json(
        {
          error: "Large stock delta — confirm required",
          requiresConfirm: true,
          previousQuantity,
          quantityCounted: body.quantityCounted,
        },
        { status: 409 },
      );
    }

    const [count] = await db
      .insert(stockCounts)
      .values({
        storeId: body.storeId,
        productId: body.productId,
        countedByUserId: session.user.id,
        quantityCounted: body.quantityCounted,
        previousQuantity,
      })
      .returning();

    let inventoryRow;
    if (inv) {
      [inventoryRow] = await db
        .update(inventory)
        .set({ quantity: body.quantityCounted })
        .where(eq(inventory.id, inv.id))
        .returning();
    } else {
      [inventoryRow] = await db
        .insert(inventory)
        .values({
          storeId: body.storeId,
          productId: body.productId,
          quantity: body.quantityCounted,
        })
        .returning();
    }

    return Response.json({
      stockCount: count,
      inventory: inventoryRow,
      previousQuantity,
    });
  } catch (error) {
    return jsonError(error);
  }
}
