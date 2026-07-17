"use client";

import { useEffect, useState } from "react";

type Store = {
  id: string;
  name: string;
  address: string | null;
  openingHours: string | null;
};

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/stores");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load stores");
      return;
    }
    setStores(data.stores ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        address: address || null,
        openingHours: openingHours || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Create failed");
      return;
    }
    setName("");
    setAddress("");
    setOpeningHours("");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Stores</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Locations in this organisation.
        </p>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
        {stores.map((store) => (
          <li key={store.id} className="px-4 py-3">
            <p className="font-medium">{store.name}</p>
            <p className="text-sm text-zinc-500">
              {store.address || "No address"}
              {store.openingHours ? ` · ${store.openingHours}` : ""}
            </p>
          </li>
        ))}
      </ul>

      <form onSubmit={onCreate} className="max-w-lg space-y-3">
        <h3 className="font-medium">Add store</h3>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          value={openingHours}
          onChange={(e) => setOpeningHours(e.target.value)}
          placeholder="Opening hours"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Create store
        </button>
      </form>
    </div>
  );
}
