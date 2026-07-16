import Link from "next/link";

const nav = [
  "Requests",
  "Products",
  "Suggestions",
  "Stores",
  "Source places",
  "Team",
] as const;

export default function DashboardPage() {
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
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
            Home
          </Link>
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
        <h2 className="text-2xl font-semibold tracking-tight">Coming next</h2>
        <p className="mt-2 max-w-xl text-zinc-600">
          Auth, Neon, catalogue CRUD/CSV import, and the fulfil board land after
          this scaffold. This page is a placeholder for owner/manager desk work.
        </p>
      </main>
    </div>
  );
}
