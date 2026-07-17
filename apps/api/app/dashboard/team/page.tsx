"use client";

import { useEffect, useState } from "react";
import { roleSchema } from "@offlicence/shared";

type Member = {
  id: string;
  role: string;
  storeId: string | null;
  email: string;
  name: string;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
};

type Store = { id: string; name: string };

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [storeId, setStoreId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [teamRes, storesRes] = await Promise.all([
      fetch("/api/team"),
      fetch("/api/stores"),
    ]);
    const teamData = await teamRes.json();
    const storesData = await storesRes.json();
    if (!teamRes.ok) {
      setError(teamData.error ?? "Failed to load team");
      return;
    }
    setMembers(teamData.members ?? []);
    setInvites(teamData.invites ?? []);
    setStores(storesData.stores ?? []);
    if (!storeId && storesData.stores?.[0]) {
      setStoreId(storesData.stores[0].id);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onInvite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        role,
        storeId: role === "staff" || role === "manager" ? storeId || null : null,
        storeIds: role === "manager" && storeId ? [storeId] : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Invite failed");
      return;
    }
    setMessage(
      data.attachedExistingUser
        ? `Attached ${email} as ${role}`
        : `Invite created for ${email}`,
    );
    setEmail("");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Team</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Members and invites. If the email already has an account, membership
          is attached immediately; otherwise an open invite is stored.
        </p>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <section>
        <h3 className="mb-2 font-medium">Members</h3>
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
          {members.map((member) => (
            <li key={member.id} className="px-4 py-3 text-sm">
              <span className="font-medium">{member.name || member.email}</span>
              <span className="text-zinc-500">
                {" "}
                · {member.role}
                {member.email ? ` · ${member.email}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-medium">Open invites</h3>
        {!invites.length ? (
          <p className="text-sm text-zinc-500">None</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
            {invites.map((invite) => (
              <li key={invite.id} className="px-4 py-3 text-sm">
                {invite.email} · {invite.role}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={onInvite} className="max-w-lg space-y-3">
        <h3 className="font-medium">Invite / attach member</h3>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          {roleSchema.options.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        {(role === "staff" || role === "manager") && (
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            required={role === "staff"}
          >
            <option value="">Select store</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Invite
        </button>
      </form>
    </div>
  );
}
