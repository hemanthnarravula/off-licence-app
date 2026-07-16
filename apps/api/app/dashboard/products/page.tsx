"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { productCategorySchema } from "@offlicence/shared";

type ProductRow = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  category: string;
  sourcePlaceName: string | null;
  size: string | null;
  abv: string | null;
  imageUrl: string | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const categories = useMemo(() => productCategorySchema.options, []);

  async function load(search = q) {
    setLoading(true);
    setError(null);
    const params = search ? `?q=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/products${params}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load products");
      setProducts([]);
    } else {
      setProducts(data.products);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ProductRow[]>();
    for (const category of categories) map.set(category, []);
    for (const product of products) {
      const list = map.get(product.category) ?? [];
      list.push(product);
      map.set(product.category, list);
    }
    return [...map.entries()].filter(([, rows]) => rows.length > 0);
  }, [products, categories]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Products</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Org catalogue. Inventory qty stays unset until stock count or
            fulfil unless seeded via CSV.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/products/import"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            Import CSV
          </Link>
          <Link
            href="/dashboard/products/new"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
          >
            Add product
          </Link>
        </div>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void load(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, barcode, brand"
          className="w-full max-w-md rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
        >
          Search
        </button>
      </form>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}

      {!loading && !products.length ? (
        <p className="text-sm text-zinc-600">
          No products yet.{" "}
          <Link href="/dashboard/products/new" className="underline">
            Add one
          </Link>{" "}
          or{" "}
          <Link href="/dashboard/products/import" className="underline">
            import a CSV
          </Link>
          .
        </p>
      ) : null}

      <div className="space-y-8">
        {grouped.map(([category, rows]) => (
          <section key={category}>
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-zinc-500 uppercase">
              {category.replace("_", " ")}
            </h3>
            <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
              {rows.map((product) => (
                <li key={product.id} className="flex items-center gap-4 px-4 py-3">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400">
                      —
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="truncate text-sm text-zinc-500">
                      {product.barcode}
                      {product.brand ? ` · ${product.brand}` : ""}
                      {product.sourcePlaceName
                        ? ` · ${product.sourcePlaceName}`
                        : ""}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="text-sm font-medium text-zinc-900 underline"
                  >
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
