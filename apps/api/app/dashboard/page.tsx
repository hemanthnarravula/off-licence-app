import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getMembershipForUser } from "@/lib/authz";

const nav = [
  "Requests",
  "Products",
  "Suggestions",
  "Stores",
  "Source places",
  "Team",
] as const;

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const membership = await getMembershipForUser(session.user.id).catch(
    () => null,
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Owner dashboard
            </p>
            <h1 className="text-xl font-semibold">Off-licence</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-600">{session.user.email}</span>
            <Link href="/" className="text-zinc-600 hover:text-zinc-900">
              Home
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-4 overflow-x-auto px-6 pb-3 text-sm">
          {nav.map((item) => (
            <span
              key={item}
              className="whitespace-nowrap rounded-md bg-zinc-100 px-3 py-1.5 text-zinc-700"
            >
              {item}
            </span>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h2 className="text-2xl font-semibold tracking-tight">Signed in</h2>
        <p className="mt-2 max-w-xl text-zinc-600">
          Auth is live. Membership role:{" "}
          <strong>{membership?.role ?? "none yet"}</strong>
          {membership
            ? ` · org ${membership.organisationId.slice(0, 8)}…`
            : " — invite/seed will attach an organisation next."}
        </p>
        <p className="mt-4 max-w-xl text-sm text-zinc-500">
          Catalogue CRUD, CSV import, and the fulfil board come after authz +
          seed data.
        </p>
      </main>
    </div>
  );
}
