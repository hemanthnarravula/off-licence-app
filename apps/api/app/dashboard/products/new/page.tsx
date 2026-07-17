import Link from "next/link";
import { ProductForm } from "../product-form";

type Props = {
  searchParams: Promise<{ barcode?: string }>;
};

export default async function NewProductPage({ searchParams }: Props) {
  const { barcode } = await searchParams;

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
          Add product
        </h2>
      </div>
      <ProductForm initial={{ barcode: barcode ?? "" }} />
    </div>
  );
}
