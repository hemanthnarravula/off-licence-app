import { del } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { products } from "@offlicence/db";
import { requireRoles } from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import {
  isAllowedImageType,
  storeProductImage,
} from "@/lib/product-image-storage";

type Params = { params: Promise<{ id: string }> };

async function getOwnedProduct(organisationId: string, id: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, id),
        eq(products.organisationId, organisationId),
      ),
    )
    .limit(1);
  return product ?? null;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { membership } = await requireRoles(["owner", "manager"]);
    const { id } = await params;
    const product = await getOwnedProduct(membership.organisationId, id);
    if (!product) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "file is required" }, { status: 400 });
    }

    const contentType = file.type || "image/jpeg";
    if (!isAllowedImageType(contentType)) {
      return Response.json(
        { error: "Only JPEG, PNG, WebP, or GIF images are allowed" },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const imageUrl = await storeProductImage(
      bytes,
      contentType,
      `${membership.organisationId}-${id}`,
    );

    if (product.imageUrl?.includes("blob.vercel-storage.com")) {
      try {
        await del(product.imageUrl, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch {
        // best-effort cleanup
      }
    }

    const [updated] = await db
      .update(products)
      .set({ imageUrl })
      .where(eq(products.id, id))
      .returning();

    return Response.json({ product: updated, imageUrl });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { membership } = await requireRoles(["owner", "manager"]);
    const { id } = await params;
    const product = await getOwnedProduct(membership.organisationId, id);
    if (!product) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    if (
      product.imageUrl?.includes("blob.vercel-storage.com") &&
      process.env.BLOB_READ_WRITE_TOKEN
    ) {
      try {
        await del(product.imageUrl, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch {
        // best-effort cleanup
      }
    }

    const [updated] = await db
      .update(products)
      .set({ imageUrl: null })
      .where(eq(products.id, id))
      .returning();

    return Response.json({ product: updated });
  } catch (error) {
    return jsonError(error);
  }
}
