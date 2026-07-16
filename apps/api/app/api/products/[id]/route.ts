import { and, eq } from "drizzle-orm";
import { products, sourcePlaces } from "@offlicence/db";
import { productUpdateSchema } from "@offlicence/shared";
import { requireRoles } from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { membership } = await requireRoles(["owner", "manager"]);
    const { id } = await params;

    const [product] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.organisationId, membership.organisationId),
        ),
      )
      .limit(1);

    if (!product) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json({ product });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { membership } = await requireRoles(["owner", "manager"]);
    const { id } = await params;
    const body = productUpdateSchema.parse(await request.json());

    if (body.sourcePlaceId) {
      const [place] = await db
        .select()
        .from(sourcePlaces)
        .where(
          and(
            eq(sourcePlaces.id, body.sourcePlaceId),
            eq(sourcePlaces.organisationId, membership.organisationId),
          ),
        )
        .limit(1);
      if (!place) {
        return Response.json(
          { error: "sourcePlaceId not found for organisation" },
          { status: 400 },
        );
      }
    }

    const [updated] = await db
      .update(products)
      .set({
        ...(body.barcode !== undefined ? { barcode: body.barcode } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.brand !== undefined ? { brand: body.brand } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.sourcePlaceId !== undefined
          ? { sourcePlaceId: body.sourcePlaceId }
          : {}),
        ...(body.size !== undefined ? { size: body.size } : {}),
        ...(body.abv !== undefined ? { abv: body.abv } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
      })
      .where(
        and(
          eq(products.id, id),
          eq(products.organisationId, membership.organisationId),
        ),
      )
      .returning();

    if (!updated) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json({ product: updated });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      return Response.json(
        { error: "Product with this barcode already exists" },
        { status: 409 },
      );
    }
    return jsonError(error);
  }
}
