import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/products", label: "Products" },
  { href: "/dashboard/products/import", label: "Import" },
  { href: "/dashboard/requests", label: "Requests" },
  { href: "/dashboard/suggestions", label: "Suggestions" },
  { href: "/dashboard/stores", label: "Stores" },
  { href: "/dashboard/source-places", label: "Source places" },
  { href: "/dashboard/team", label: "Team" },
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

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
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md bg-zinc-100 px-3 py-1.5 text-zinc-700 hover:bg-zinc-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
