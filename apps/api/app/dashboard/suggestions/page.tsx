"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Suggestion = {
  id: string;
  barcode: string;
  note: string | null;
  storeName: string;
  suggestedByName: string;
  suggestedByEmail: string;
  createdAt: string;
};

export default function SuggestionsPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/product-suggestions?status=open");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load");
      setSuggestions([]);
    } else {
      setSuggestions(data.suggestions ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function accept(id: string) {
    const res = await fetch(`/api/product-suggestions/${id}/accept`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Accept failed");
      return;
    }
    router.push(data.next);
  }

  async function dismiss(id: string) {
    const res = await fetch(`/api/product-suggestions/${id}/dismiss`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Dismiss failed");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Suggestions</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Unknown barcodes flagged by staff. Accept to add a product, or
          dismiss.
        </p>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
      {!loading && !suggestions.length ? (
        <p className="text-sm text-zinc-600">No open suggestions.</p>
      ) : null}

      <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
        {suggestions.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-3 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.barcode}</p>
              <p className="text-sm text-zinc-500">
                {item.storeName} · {item.suggestedByName || item.suggestedByEmail}
                {item.note ? ` · ${item.note}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void accept(item.id)}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => void dismiss(item.id)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              >
                Dismiss
              </button>
              <Link
                href={`/dashboard/products/new?barcode=${encodeURIComponent(item.barcode)}`}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              >
                Add product
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
