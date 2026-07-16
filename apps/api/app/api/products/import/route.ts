import { and, eq } from "drizzle-orm";
import {
  inventory,
  products,
  sourcePlaces,
  stores,
} from "@offlicence/db";
import {
  productCategorySchema,
  type ProductCategory,
  type ProductImportSummary,
} from "@offlicence/shared";
import { requireRoles } from "@/lib/authz";
import { parseCsv, rowToRecord } from "@/lib/csv";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const { membership } = await requireRoles(["owner"]);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "file is required" }, { status: 400 });
    }

    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    if (!headers.length) {
      return Response.json({ error: "CSV is empty" }, { status: 400 });
    }

    const required = ["barcode", "name"];
    for (const key of required) {
      if (!headers.includes(key)) {
        return Response.json(
          { error: `Missing required column: ${key}` },
          { status: 400 },
        );
      }
    }

    const orgStores = await db
      .select()
      .from(stores)
      .where(eq(stores.organisationId, membership.organisationId));
    const storeByName = new Map(
      orgStores.map((store) => [store.name.toLowerCase(), store]),
    );
    const storeById = new Map(orgStores.map((store) => [store.id, store]));

    const places = await db
      .select()
      .from(sourcePlaces)
      .where(eq(sourcePlaces.organisationId, membership.organisationId));
    const placeByName = new Map(
      places.map((place) => [place.name.toLowerCase(), place]),
    );

    const summary: ProductImportSummary = {
      created: 0,
      updated: 0,
      skipped: 0,
      inventoryUpserts: 0,
      errors: [],
    };

    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = index + 2;
      const record = rowToRecord(headers, rows[index]);
      const barcode = record.barcode?.trim();
      const name = record.name?.trim();

      if (!barcode && !name) {
        summary.skipped += 1;
        continue;
      }
      if (!barcode || !name) {
        summary.errors.push({
          row: rowNumber,
          message: "barcode and name are required",
        });
        continue;
      }

      let category: ProductCategory = "other";
      if (record.category) {
        const parsed = productCategorySchema.safeParse(record.category);
        if (!parsed.success) {
          summary.errors.push({
            row: rowNumber,
            message: `Invalid category: ${record.category}`,
          });
          continue;
        }
        category = parsed.data;
      }

      let sourcePlaceId: string | null = null;
      if (record.sourcePlace) {
        const key = record.sourcePlace.toLowerCase();
        let place = placeByName.get(key);
        if (!place) {
          const [createdPlace] = await db
            .insert(sourcePlaces)
            .values({
              organisationId: membership.organisationId,
              name: record.sourcePlace,
              sortOrder: placeByName.size + 1,
            })
            .returning();
          place = createdPlace;
          placeByName.set(key, place);
        }
        sourcePlaceId = place.id;
      }

      const existing = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.organisationId, membership.organisationId),
            eq(products.barcode, barcode),
          ),
        )
        .limit(1);

      let productId: string;
      if (existing[0]) {
        const [updated] = await db
          .update(products)
          .set({
            name,
            brand: record.brand || null,
            category,
            sourcePlaceId,
            size: record.size || null,
            abv: record.abv || null,
            imageUrl: record.imageUrl || existing[0].imageUrl,
          })
          .where(eq(products.id, existing[0].id))
          .returning();
        productId = updated.id;
        summary.updated += 1;
      } else {
        const [created] = await db
          .insert(products)
          .values({
            organisationId: membership.organisationId,
            barcode,
            name,
            brand: record.brand || null,
            category,
            sourcePlaceId,
            size: record.size || null,
            abv: record.abv || null,
            imageUrl: record.imageUrl || null,
          })
          .returning();
        productId = created.id;
        summary.created += 1;
      }

      const hasInventoryCols =
        record.storeId ||
        record.storeName ||
        record.quantity ||
        record.sellPricePence ||
        record.reorderLevel;

      if (!hasInventoryCols) continue;

      let store =
        (record.storeId && storeById.get(record.storeId)) ||
        (record.storeName &&
          storeByName.get(record.storeName.toLowerCase())) ||
        null;

      if (!store) {
        summary.errors.push({
          row: rowNumber,
          message: "Inventory columns present but store not found",
        });
        continue;
      }

      const quantity =
        record.quantity === "" || record.quantity == null
          ? null
          : Number(record.quantity);
      const sellPricePence =
        record.sellPricePence === "" || record.sellPricePence == null
          ? null
          : Number(record.sellPricePence);
      const reorderLevel =
        record.reorderLevel === "" || record.reorderLevel == null
          ? null
          : Number(record.reorderLevel);

      if (
        (quantity != null && Number.isNaN(quantity)) ||
        (sellPricePence != null && Number.isNaN(sellPricePence)) ||
        (reorderLevel != null && Number.isNaN(reorderLevel))
      ) {
        summary.errors.push({
          row: rowNumber,
          message: "Invalid inventory number",
        });
        continue;
      }

      const [existingInv] = await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.storeId, store.id),
            eq(inventory.productId, productId),
          ),
        )
        .limit(1);

      if (existingInv) {
        await db
          .update(inventory)
          .set({
            quantity,
            sellPricePence,
            reorderLevel,
          })
          .where(eq(inventory.id, existingInv.id));
      } else {
        await db.insert(inventory).values({
          storeId: store.id,
          productId,
          quantity,
          sellPricePence,
          reorderLevel,
        });
      }
      summary.inventoryUpserts += 1;
    }

    return Response.json({ summary });
  } catch (error) {
    return jsonError(error);
  }
}
