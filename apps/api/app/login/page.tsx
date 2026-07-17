"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("Owner Demo");
  const [email, setEmail] = useState("owner@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
        });
        if (result.error) {
          setError(result.error.message ?? "Sign up failed");
          return;
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });
        if (result.error) {
          setError(result.error.message ?? "Sign in failed");
          return;
        }
      }

      // Confirm cookie session landed before leaving the page.
      const session = await authClient.getSession();
      if (!session.data?.user) {
        setError(
          "Signed in, but no session cookie was stored. Try again or use Safari.",
        );
        return;
      }

      // Full navigation so the dashboard RSC request always includes the cookie.
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-zinc-50 px-6 py-16 text-zinc-900">
      <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
        Off-licence
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
        {mode === "sign-in" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Owner/manager dashboard access. Staff and customers use the mobile app.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        {mode === "sign-up" ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
              autoComplete="name"
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            autoComplete="email"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Password</span>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
            autoComplete={
              mode === "sign-in" ? "current-password" : "new-password"
            }
          />
        </label>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending
            ? "Please wait…"
            : mode === "sign-in"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <button
        type="button"
        className="mt-4 text-left text-sm text-zinc-600 underline"
        onClick={() => {
          setMode((current) =>
            current === "sign-in" ? "sign-up" : "sign-in",
          );
          setError(null);
        }}
      >
        {mode === "sign-in"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>

      <Link href="/" className="mt-8 text-sm text-zinc-500 hover:text-zinc-800">
        ← Back home
      </Link>
    </main>
  );
}
