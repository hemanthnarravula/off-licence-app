import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 bg-zinc-50 px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
        Off-licence
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
        API + owner dashboard
      </h1>
      <p className="text-lg text-zinc-600">
        Staff and customers use the Expo app; owners manage catalogue and
        fulfilment here.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          Sign in
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900"
        >
          Dashboard
        </Link>
        <Link
          href="/api/health"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900"
        >
          Health check
        </Link>
      </div>
    </main>
  );
}
