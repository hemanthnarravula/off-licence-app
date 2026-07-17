"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";

export type LoginState = {
  error: string | null;
};

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

    // nextCookies() plugin persists the session cookie via next/headers.
    // Do NOT re-set Set-Cookie values manually — that double-encodes the token.
    if (mode === "sign-up") {
      await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: name || email.split("@")[0] || "User",
        },
        headers: requestHeaders,
      });
    } else {
      await auth.api.signInEmail({
        body: { email, password },
        headers: requestHeaders,
      });
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
