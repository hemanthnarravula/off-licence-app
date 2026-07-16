import { del, put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { products } from "@offlicence/db";
import { requireRoles } from "@/lib/authz";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

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

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return Response.json(
        {
          error:
            "BLOB_READ_WRITE_TOKEN is not configured. Set Vercel Blob to enable image uploads.",
        },
        { status: 503 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "Only image uploads allowed" }, { status: 400 });
    }

    const blob = await put(
      `products/${membership.organisationId}/${id}/${file.name}`,
      file,
      {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
      },
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
      .set({ imageUrl: blob.url })
      .where(eq(products.id, id))
      .returning();

    return Response.json({ product: updated, imageUrl: blob.url });
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
