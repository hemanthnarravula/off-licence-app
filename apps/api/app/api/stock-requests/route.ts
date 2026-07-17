import { and, asc, eq, inArray } from "drizzle-orm";
import {
  products,
  sourcePlaces,
  stockRequests,
  stores,
  user,
} from "@offlicence/db";
import {
  stockRequestInputSchema,
  stockRequestStatusSchema,
} from "@offlicence/shared";
import {
  assertStoreAccess,
  filterStoreIdList,
  requireRoles,
} from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const { membership } = await requireRoles([
      "owner",
      "manager",
      "staff",
    ]);
    const { searchParams } = new URL(request.url);
    const status = stockRequestStatusSchema
      .catch("open")
      .parse(searchParams.get("status") ?? "open");

    const scoped = filterStoreIdList(membership) ?? [];
    if (membership.storeIds !== null && scoped.length === 0) {
      return Response.json({ groups: [], requests: [] });
    }

    const orgStoreRows = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.organisationId, membership.organisationId));
    const orgStoreIds = orgStoreRows.map((row) => row.id);
    const storeFilter =
      membership.storeIds === null ? orgStoreIds : scoped;

    if (!storeFilter.length) {
      return Response.json({ groups: [], requests: [] });
    }

    const rows = await db
      .select({
        id: stockRequests.id,
        storeId: stockRequests.storeId,
        storeName: stores.name,
        productId: stockRequests.productId,
        productName: products.name,
        barcode: products.barcode,
        category: products.category,
        sourcePlaceId: products.sourcePlaceId,
        sourcePlaceName: sourcePlaces.name,
        quantityRequested: stockRequests.quantityRequested,
        note: stockRequests.note,
        status: stockRequests.status,
        requestedByUserId: stockRequests.requestedByUserId,
        requestedByName: user.name,
        requestedByEmail: user.email,
        createdAt: stockRequests.createdAt,
        quantityBought: stockRequests.quantityBought,
        fulfilledAt: stockRequests.fulfilledAt,
      })
      .from(stockRequests)
      .innerJoin(stores, eq(stockRequests.storeId, stores.id))
      .innerJoin(products, eq(stockRequests.productId, products.id))
      .leftJoin(sourcePlaces, eq(products.sourcePlaceId, sourcePlaces.id))
      .innerJoin(user, eq(stockRequests.requestedByUserId, user.id))
      .where(
        and(
          eq(stockRequests.status, status),
          inArray(stockRequests.storeId, storeFilter),
        ),
      )
      .orderBy(
        asc(sourcePlaces.name),
        asc(products.category),
        asc(products.name),
      );

    const groupMap = new Map<
      string,
      {
        sourcePlaceId: string | null;
        sourcePlaceName: string;
        categories: Map<
          string,
          {
            category: string;
            requests: typeof rows;
          }
        >;
      }
    >();

    for (const row of rows) {
      const placeKey = row.sourcePlaceId ?? "none";
      const placeName = row.sourcePlaceName ?? "Unassigned source";
      if (!groupMap.has(placeKey)) {
        groupMap.set(placeKey, {
          sourcePlaceId: row.sourcePlaceId,
          sourcePlaceName: placeName,
          categories: new Map(),
        });
      }
      const place = groupMap.get(placeKey)!;
      if (!place.categories.has(row.category)) {
        place.categories.set(row.category, {
          category: row.category,
          requests: [],
        });
      }
      place.categories.get(row.category)!.requests.push(row);
    }

    const groups = [...groupMap.values()].map((place) => ({
      sourcePlaceId: place.sourcePlaceId,
      sourcePlaceName: place.sourcePlaceName,
      categories: [...place.categories.values()],
    }));

    return Response.json({ groups, requests: rows });
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
    const body = stockRequestInputSchema.parse(await request.json());
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

    const [existing] = await db
      .select()
      .from(stockRequests)
      .where(
        and(
          eq(stockRequests.storeId, body.storeId),
          eq(stockRequests.productId, body.productId),
          eq(stockRequests.status, "open"),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(stockRequests)
        .set({
          quantityRequested: body.quantityRequested,
          note: body.note ?? null,
          requestedByUserId: session.user.id,
        })
        .where(eq(stockRequests.id, existing.id))
        .returning();
      return Response.json({ request: updated, upserted: true });
    }

    const [created] = await db
      .insert(stockRequests)
      .values({
        storeId: body.storeId,
        productId: body.productId,
        requestedByUserId: session.user.id,
        quantityRequested: body.quantityRequested,
        note: body.note ?? null,
        status: "open",
      })
      .returning();

    return Response.json({ request: created, upserted: false }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
