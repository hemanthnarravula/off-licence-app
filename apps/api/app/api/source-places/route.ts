import { asc, eq } from "drizzle-orm";
import { sourcePlaces } from "@offlicence/db";
import { sourcePlaceInputSchema } from "@offlicence/shared";
import { requireRoles } from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const { membership } = await requireRoles(["owner", "manager"]);
    const rows = await db
      .select()
      .from(sourcePlaces)
      .where(eq(sourcePlaces.organisationId, membership.organisationId))
      .orderBy(asc(sourcePlaces.sortOrder), asc(sourcePlaces.name));
    return Response.json({ sourcePlaces: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { membership } = await requireRoles(["owner"]);
    const body = sourcePlaceInputSchema.parse(await request.json());
    const [created] = await db
      .insert(sourcePlaces)
      .values({
        organisationId: membership.organisationId,
        name: body.name,
        sortOrder: body.sortOrder ?? 0,
      })
      .returning();
    return Response.json({ sourcePlace: created }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
