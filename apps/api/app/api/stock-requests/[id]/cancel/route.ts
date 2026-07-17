import { eq } from "drizzle-orm";
import { stockRequests, stores } from "@offlicence/db";
import {
  assertStoreAccess,
  requireRoles,
} from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { session, membership } = await requireRoles([
      "owner",
      "manager",
      "staff",
    ]);
    const { id } = await params;

    const [row] = await db
      .select({
        request: stockRequests,
        storeOrgId: stores.organisationId,
      })
      .from(stockRequests)
      .innerJoin(stores, eq(stockRequests.storeId, stores.id))
      .where(eq(stockRequests.id, id))
      .limit(1);

    if (!row || row.storeOrgId !== membership.organisationId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    assertStoreAccess(membership, row.request.storeId);

    const canCancel =
      membership.role === "owner" ||
      membership.role === "manager" ||
      row.request.requestedByUserId === session.user.id;

    if (!canCancel) {
      return Response.json(
        { error: "Only the creator or a manager/owner can cancel" },
        { status: 403 },
      );
    }

    if (row.request.status !== "open") {
      return Response.json(
        { error: "Only open requests can be cancelled" },
        { status: 400 },
      );
    }

    const [cancelled] = await db
      .update(stockRequests)
      .set({ status: "cancelled" })
      .where(eq(stockRequests.id, id))
      .returning();

    return Response.json({ request: cancelled });
  } catch (error) {
    return jsonError(error);
  }
}
