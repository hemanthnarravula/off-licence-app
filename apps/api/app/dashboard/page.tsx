import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getMembershipForUser } from "@/lib/authz";

export default async function DashboardHomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const membership = session?.user
    ? await getMembershipForUser(session.user.id).catch(() => null)
    : null;

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
      <p className="mt-2 max-w-xl text-zinc-600">
        Membership role: <strong>{membership?.role ?? "none yet"}</strong>
        {membership
          ? ` · org ${membership.organisationId.slice(0, 8)}…`
          : " — run seed after sign-up to attach an organisation."}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/products"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Manage products
        </Link>
        <Link
          href="/dashboard/products/import"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900"
        >
          Import CSV
        </Link>
      </div>
    </div>
  );
}
