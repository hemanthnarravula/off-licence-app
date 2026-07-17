import { authClient } from "@/lib/auth-client";
import { Platform } from "react-native";

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
  if (Platform.OS !== "web") {
    const cookie = (authClient as AuthClientWithCookie).getCookie?.() ?? "";
    if (cookie) {
      headers.set("Cookie", cookie);
    }
  }

  let body = options.body;
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  } else if (body instanceof FormData) {
    // Let fetch set multipart boundary — do not force JSON Content-Type
    headers.delete("Content-Type");
  }

  const res = await fetch(`${baseURL}${path}`, {
    ...options,
    headers,
    body,
    credentials: Platform.OS === "web" ? "include" : options.credentials,
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
