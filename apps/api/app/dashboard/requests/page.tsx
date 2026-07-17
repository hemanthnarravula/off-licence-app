"use client";

import { useEffect, useState } from "react";

type RequestRow = {
  id: string;
  storeName: string;
  productName: string;
  barcode: string;
  category: string;
  quantityRequested: number;
  note: string | null;
  requestedByName: string;
  requestedByEmail: string;
};

type Group = {
  sourcePlaceId: string | null;
  sourcePlaceName: string;
  categories: {
    category: string;
    requests: RequestRow[];
  }[];
};

export default function RequestsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [status, setStatus] = useState<"open" | "done" | "cancelled">("open");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(nextStatus = status) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/stock-requests?status=${nextStatus}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load requests");
      setGroups([]);
    } else {
      setGroups(data.groups ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load("open");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fulfil(id: string, quantityRequested: number) {
    const raw = window.prompt(
      "Quantity bought (cash & carry)",
      String(quantityRequested),
    );
    if (raw == null) return;
    const quantityBought = Number(raw);
    if (!Number.isInteger(quantityBought) || quantityBought < 0) {
      setError("Enter a valid non-negative integer");
      return;
    }

    setBusyId(id);
    const res = await fetch(`/api/stock-requests/${id}/fulfil`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantityBought }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Fulfil failed");
      return;
    }
    await load(status);
  }

  async function cancel(id: string) {
    if (!window.confirm("Cancel this open request?")) return;
    setBusyId(id);
    const res = await fetch(`/api/stock-requests/${id}/cancel`, {
      method: "POST",
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Cancel failed");
      return;
    }
    await load(status);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Requests</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Cash-and-carry board grouped by source place, then category. Mark
            done after buying offline to bump store inventory.
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => {
            const next = e.target.value as typeof status;
            setStatus(next);
            void load(next);
          }}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="open">Open</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}

      {!loading && !groups.length ? (
        <p className="text-sm text-zinc-600">No {status} requests.</p>
      ) : null}

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.sourcePlaceId ?? "none"}>
            <h3 className="text-lg font-semibold tracking-tight">
              {group.sourcePlaceName}
            </h3>
            <div className="mt-3 space-y-5">
              {group.categories.map((bucket) => (
                <div key={bucket.category}>
                  <h4 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    {bucket.category.replace("_", " ")}
                  </h4>
                  <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
                    {bucket.requests.map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center gap-3 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{row.productName}</p>
                          <p className="text-sm text-zinc-500">
                            {row.storeName} · qty {row.quantityRequested} ·{" "}
                            {row.requestedByName || row.requestedByEmail}
                            {row.note ? ` · ${row.note}` : ""}
                          </p>
                        </div>
                        {status === "open" ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() =>
                                void fulfil(row.id, row.quantityRequested)
                              }
                              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                            >
                              Mark done
                            </button>
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => void cancel(row.id)}
                              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
