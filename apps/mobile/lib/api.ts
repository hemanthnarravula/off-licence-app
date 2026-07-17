import { authClient } from "@/lib/auth-client";

const baseURL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type ApiOptions = RequestInit & {
  json?: unknown;
};

type AuthClientWithCookie = typeof authClient & {
  getCookie?: () => string;
};

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<{ ok: boolean; status: number; data: T }> {
  const headers = new Headers(options.headers);
  const cookie = (authClient as AuthClientWithCookie).getCookie?.() ?? "";
  if (cookie) {
    headers.set("Cookie", cookie);
  }

  let body = options.body;
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }

  const res = await fetch(`${baseURL}${path}`, {
    ...options,
    headers,
    body,
  });

  const text = await res.text();
  let data: T = undefined as T;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as T;
    }
  }

  return { ok: res.ok, status: res.status, data };
}
