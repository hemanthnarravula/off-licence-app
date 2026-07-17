import { and, eq } from "drizzle-orm";
import { inventory, stockRequests, stores } from "@offlicence/db";
import { fulfilStockRequestSchema } from "@offlicence/shared";
import {
  assertStoreAccess,
  requireRoles,
} from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

async function loadScopedRequest(
  organisationId: string,
  id: string,
  storeIds: string[] | null,
) {
  const [row] = await db
    .select({
      request: stockRequests,
      storeOrgId: stores.organisationId,
    })
    .from(stockRequests)
    .innerJoin(stores, eq(stockRequests.storeId, stores.id))
    .where(eq(stockRequests.id, id))
    .limit(1);

  if (!row || row.storeOrgId !== organisationId) return null;
  if (storeIds !== null && !storeIds.includes(row.request.storeId)) return null;
  return row.request;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { session, membership } = await requireRoles(["owner", "manager"]);
    const { id } = await params;
    const body = fulfilStockRequestSchema.parse(await request.json());

    const existing = await loadScopedRequest(
      membership.organisationId,
      id,
      membership.storeIds,
    );
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.status !== "open") {
      return Response.json(
        { error: "Only open requests can be fulfilled" },
        { status: 400 },
      );
    }

    assertStoreAccess(membership, existing.storeId);

    const [fulfilled] = await db
      .update(stockRequests)
      .set({
        status: "done",
        quantityBought: body.quantityBought,
        fulfilledByUserId: session.user.id,
        fulfilledAt: new Date(),
      })
      .where(eq(stockRequests.id, id))
      .returning();

    const [inv] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.storeId, existing.storeId),
          eq(inventory.productId, existing.productId),
        ),
      )
      .limit(1);

    if (inv) {
      await db
        .update(inventory)
        .set({
          quantity: (inv.quantity ?? 0) + body.quantityBought,
        })
        .where(eq(inventory.id, inv.id));
    } else {
      await db.insert(inventory).values({
        storeId: existing.storeId,
        productId: existing.productId,
        quantity: body.quantityBought,
      });
    }

    return Response.json({ request: fulfilled });
  } catch (error) {
    return jsonError(error);
  }
}
