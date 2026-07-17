import { asc, eq } from "drizzle-orm";
import { stores } from "@offlicence/db";
import { storeInputSchema } from "@offlicence/shared";
import { requireRoles } from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const { membership } = await requireRoles([
      "owner",
      "manager",
      "staff",
      "customer",
    ]);

    const rows = await db
      .select()
      .from(stores)
      .where(eq(stores.organisationId, membership.organisationId))
      .orderBy(asc(stores.name));

    const filtered =
      membership.storeIds === null
        ? rows
        : rows.filter((store) => membership.storeIds!.includes(store.id));

    return Response.json({ stores: filtered });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { membership } = await requireRoles(["owner"]);
    const body = storeInputSchema.parse(await request.json());
    const [created] = await db
      .insert(stores)
      .values({
        organisationId: membership.organisationId,
        name: body.name,
        address: body.address ?? null,
        openingHours: body.openingHours ?? null,
      })
      .returning();
    return Response.json({ store: created }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
