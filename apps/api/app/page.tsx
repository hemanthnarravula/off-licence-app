import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
        Off-licence
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
        API + owner dashboard
      </h1>
      <p className="text-lg text-zinc-600">
        Bare monorepo scaffold. Staff and customers use the Expo app; owners
        manage catalogue and fulfilment here.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Dashboard (stub)
        </Link>
        <Link
          href="/api/health"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900"
        >
          Health check
        </Link>
      </div>
    </main>
  );
}
