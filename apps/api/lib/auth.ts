import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@offlicence/db/schema";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  // Allow any trycloudflare / localhost / Expo origin during local device testing.
  trustedOrigins: async (request) => {
    const origin = request?.headers?.get?.("origin") ?? "";
    const defaults = [
      baseURL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "exp://",
      "mobile://",
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://localhost:8090",
      "http://127.0.0.1:8090",
      process.env.EXPO_PUBLIC_API_URL ?? "",
      process.env.NEXT_PUBLIC_APP_URL ?? "",
      ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").filter(Boolean) ??
        []),
    ].filter(Boolean);

    if (
      origin.endsWith(".trycloudflare.com") ||
      origin.endsWith(".exp.direct") ||
      origin.endsWith(".expo.dev") ||
      origin.startsWith("exp://") ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:")
    ) {
      return [...defaults, origin];
    }
    return defaults;
  },
  plugins: [expo(), nextCookies()],
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
});

export type Session = typeof auth.$Infer.Session;
