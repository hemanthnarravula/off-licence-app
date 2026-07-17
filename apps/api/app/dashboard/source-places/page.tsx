"use client";

import { useEffect, useState } from "react";

type SourcePlace = {
  id: string;
  name: string;
  sortOrder: number;
};

export default function SourcePlacesPage() {
  const [places, setPlaces] = useState<SourcePlace[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/source-places");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load");
      return;
    }
    setPlaces(data.sourcePlaces ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/source-places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sortOrder: places.length + 1 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Create failed");
      return;
    }
    setName("");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Source places</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Where stock is sourced (Booker, Bestway, local cash & carry…). Used
          to group the fulfil board.
        </p>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
        {places.map((place) => (
          <li key={place.id} className="px-4 py-3 font-medium">
            {place.name}
          </li>
        ))}
      </ul>

      <form onSubmit={onCreate} className="flex max-w-md gap-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New source place"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add
        </button>
      </form>
    </div>
  );
}
