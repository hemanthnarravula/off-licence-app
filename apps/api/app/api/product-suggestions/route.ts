import { and, desc, eq } from "drizzle-orm";
import { productSuggestions, stores, user } from "@offlicence/db";
import { productSuggestionInputSchema } from "@offlicence/shared";
import {
  assertStoreAccess,
  requireRoles,
} from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const { membership } = await requireRoles(["owner", "manager"]);
    const status = new URL(request.url).searchParams.get("status") ?? "open";

    const rows = await db
      .select({
        id: productSuggestions.id,
        barcode: productSuggestions.barcode,
        note: productSuggestions.note,
        status: productSuggestions.status,
        storeId: productSuggestions.storeId,
        storeName: stores.name,
        suggestedByName: user.name,
        suggestedByEmail: user.email,
        createdAt: productSuggestions.createdAt,
      })
      .from(productSuggestions)
      .innerJoin(stores, eq(productSuggestions.storeId, stores.id))
      .innerJoin(user, eq(productSuggestions.suggestedByUserId, user.id))
      .where(
        and(
          eq(productSuggestions.organisationId, membership.organisationId),
          eq(
            productSuggestions.status,
            status as "open" | "accepted" | "dismissed",
          ),
        ),
      )
      .orderBy(desc(productSuggestions.createdAt));

    return Response.json({ suggestions: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, membership } = await requireRoles([
      "owner",
      "manager",
      "staff",
    ]);
    const body = productSuggestionInputSchema.parse(await request.json());
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

    const [created] = await db
      .insert(productSuggestions)
      .values({
        organisationId: membership.organisationId,
        storeId: body.storeId,
        barcode: body.barcode,
        note: body.note ?? null,
        suggestedByUserId: session.user.id,
        status: "open",
      })
      .returning();

    return Response.json({ suggestion: created }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
