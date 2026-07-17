"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Omit baseURL in the browser so Better Auth uses same-origin `/api/auth`.
 * That keeps login working on localhost and changing tunnel URLs.
 */
export const authClient = createAuthClient(
  typeof window === "undefined"
    ? {
        baseURL:
          process.env.NEXT_PUBLIC_APP_URL ??
          process.env.BETTER_AUTH_URL ??
          "http://localhost:3000",
      }
    : {},
);
