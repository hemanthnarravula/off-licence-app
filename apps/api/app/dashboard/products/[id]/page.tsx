import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { products } from "@offlicence/db";
import { AuthzError, requireRoles } from "@/lib/authz";
import { db } from "@/lib/db";
import { ProductForm } from "../product-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  let membership;
  try {
    ({ membership } = await requireRoles(["owner", "manager"]));
  } catch (error) {
    if (error instanceof AuthzError && error.status === 401) {
      redirect("/login");
    }
    throw error;
  }

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

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/products"
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          ← Products
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Edit product
        </h2>
      </div>
      <ProductForm
        productId={product.id}
        initialImageUrl={product.imageUrl}
        initial={{
          barcode: product.barcode,
          name: product.name,
          brand: product.brand ?? "",
          category: product.category,
          sourcePlaceId: product.sourcePlaceId ?? "",
          size: product.size ?? "",
          abv: product.abv ?? "",
        }}
      />
    </div>
  );
}
