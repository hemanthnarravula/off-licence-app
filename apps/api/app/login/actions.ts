"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";

export type LoginState = {
  error: string | null;
};

function applySetCookieHeaders(headerList: Headers) {
  const raw = headerList.getSetCookie?.() ?? [];
  const fallback = headerList.get("set-cookie");
  const values = raw.length > 0 ? raw : fallback ? [fallback] : [];
  return values;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const mode = String(formData.get("mode") ?? "sign-in");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const requestHeaders = await headers();
    const cookieStore = await cookies();

    const result =
      mode === "sign-up"
        ? await auth.api.signUpEmail({
            body: {
              email,
              password,
              name: name || email.split("@")[0] || "User",
            },
            headers: requestHeaders,
            returnHeaders: true,
          })
        : await auth.api.signInEmail({
            body: { email, password },
            headers: requestHeaders,
            returnHeaders: true,
          });

    // Belt-and-suspenders: explicitly persist Set-Cookie from Better Auth.
    const headerBag =
      result && typeof result === "object" && "headers" in result
        ? (result.headers as Headers)
        : null;

    if (headerBag) {
      for (const setCookie of applySetCookieHeaders(headerBag)) {
        const [pair, ...attrs] = setCookie.split(";");
        const [cookieName, ...valueParts] = pair.split("=");
        if (!cookieName) continue;
        const value = valueParts.join("=");
        const attrMap = Object.fromEntries(
          attrs.map((part) => {
            const [k, ...rest] = part.trim().split("=");
            return [k.toLowerCase(), rest.join("=") ?? true] as const;
          }),
        );
        cookieStore.set(cookieName.trim(), value, {
          path: typeof attrMap.path === "string" ? attrMap.path : "/",
          httpOnly: "httponly" in attrMap,
          secure: "secure" in attrMap,
          sameSite: "none" in attrMap ? "none" : "lax",
          maxAge:
            typeof attrMap["max-age"] === "string"
              ? Number(attrMap["max-age"])
              : undefined,
        });
      }
    }
  } catch (err) {
    if (err instanceof APIError) {
      return { error: err.message || "Authentication failed." };
    }
    return {
      error: err instanceof Error ? err.message : "Authentication failed.",
    };
  }

  redirect("/dashboard");
}
