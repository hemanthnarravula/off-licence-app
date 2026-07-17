import { and, asc, eq, ilike, or } from "drizzle-orm";
import { products, sourcePlaces } from "@offlicence/db";
import { productInputSchema } from "@offlicence/shared";
import { requireRoles } from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const { membership } = await requireRoles(["owner", "manager"]);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    const conditions = [eq(products.organisationId, membership.organisationId)];
    if (q) {
      conditions.push(
        or(
          ilike(products.name, `%${q}%`),
          ilike(products.barcode, `%${q}%`),
          ilike(products.brand, `%${q}%`),
        )!,
      );
    }

    const rows = await db
      .select({
        id: products.id,
        barcode: products.barcode,
        name: products.name,
        brand: products.brand,
        category: products.category,
        sourcePlaceId: products.sourcePlaceId,
        sourcePlaceName: sourcePlaces.name,
        size: products.size,
        abv: products.abv,
        imageUrl: products.imageUrl,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(sourcePlaces, eq(products.sourcePlaceId, sourcePlaces.id))
      .where(and(...conditions))
      .orderBy(asc(products.name));

    return Response.json({ products: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { membership } = await requireRoles(["owner", "manager"]);
    const body = productInputSchema.parse(await request.json());

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

    const [created] = await db
      .insert(products)
      .values({
        organisationId: membership.organisationId,
        barcode: body.barcode,
        name: body.name,
        brand: body.brand ?? null,
        category: body.category,
        sourcePlaceId: body.sourcePlaceId ?? null,
        size: body.size ?? null,
        abv: body.abv ?? null,
        imageUrl: body.imageUrl ?? null,
      })
      .returning();

    return Response.json({ product: created }, { status: 201 });
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
