import { and, eq } from "drizzle-orm";
import { productSuggestions } from "@offlicence/db";
import { requireRoles } from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { membership } = await requireRoles(["owner", "manager"]);
    const { id } = await params;

    const [suggestion] = await db
      .select()
      .from(productSuggestions)
      .where(
        and(
          eq(productSuggestions.id, id),
          eq(productSuggestions.organisationId, membership.organisationId),
        ),
      )
      .limit(1);

    if (!suggestion) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (suggestion.status !== "open") {
      return Response.json(
        { error: "Suggestion is not open" },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(productSuggestions)
      .set({ status: "dismissed" })
      .where(eq(productSuggestions.id, id))
      .returning();

    return Response.json({ suggestion: updated });
  } catch (error) {
    return jsonError(error);
  }
}
