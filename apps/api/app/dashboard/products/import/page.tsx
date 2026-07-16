"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductImportSummary } from "@offlicence/shared";

export default function ImportProductsPage() {
  const [summary, setSummary] = useState<ProductImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSummary(null);

    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/products/import", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setPending(false);

    if (!res.ok) {
      setError(data.error ?? "Import failed");
      return;
    }
    setSummary(data.summary);
  }

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
          Import catalogue CSV
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600">
          Use the documented template. Minimum columns:{" "}
          <code>barcode</code>, <code>name</code>. Recommended:{" "}
          <code>brand</code>, <code>category</code>, <code>sourcePlace</code>,{" "}
          <code>size</code>, <code>abv</code>, optional <code>imageUrl</code>.
          Optional inventory columns: <code>storeName</code>/<code>storeId</code>,{" "}
          <code>quantity</code>, <code>sellPricePence</code>,{" "}
          <code>reorderLevel</code>.
        </p>
      </div>

      <p className="text-sm">
        <a
          href="/sample-products.csv"
          className="font-medium underline"
          download
        >
          Download sample CSV
        </a>
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          required
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="block text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Importing…" : "Upload & import"}
        </button>
      </form>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {summary ? (
        <div className="rounded-md border border-zinc-200 bg-white p-4 text-sm">
          <p className="font-medium">Import summary</p>
          <ul className="mt-2 space-y-1 text-zinc-700">
            <li>Created: {summary.created}</li>
            <li>Updated: {summary.updated}</li>
            <li>Skipped: {summary.skipped}</li>
            <li>Inventory upserts: {summary.inventoryUpserts}</li>
            <li>Row errors: {summary.errors.length}</li>
          </ul>
          {summary.errors.length ? (
            <ul className="mt-3 max-h-48 overflow-auto text-red-700">
              {summary.errors.map((item) => (
                <li key={`${item.row}-${item.message}`}>
                  Row {item.row}: {item.message}
                </li>
              ))}
            </ul>
          ) : null}
          <Link
            href="/dashboard/products"
            className="mt-4 inline-block font-medium underline"
          >
            View products
          </Link>
        </div>
      ) : null}
    </div>
  );
}
