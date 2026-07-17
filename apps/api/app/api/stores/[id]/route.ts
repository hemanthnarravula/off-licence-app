import { and, eq } from "drizzle-orm";
import { stores } from "@offlicence/db";
import { storeInputSchema } from "@offlicence/shared";
import { requireRoles } from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { membership } = await requireRoles(["owner"]);
    const { id } = await params;
    const body = storeInputSchema.partial().parse(await request.json());

    const [updated] = await db
      .update(stores)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.openingHours !== undefined
          ? { openingHours: body.openingHours }
          : {}),
      })
      .where(
        and(
          eq(stores.id, id),
          eq(stores.organisationId, membership.organisationId),
        ),
      )
      .returning();

    if (!updated) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ store: updated });
  } catch (error) {
    return jsonError(error);
  }
}
