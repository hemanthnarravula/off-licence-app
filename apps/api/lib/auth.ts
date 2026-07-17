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
  trustedOrigins: [
    baseURL,
    "exp://",
    "mobile://",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8090",
    "http://127.0.0.1:8090",
    process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
    // Device testing via Cloudflare / Expo tunnels
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").filter(Boolean) ??
      []),
  ].filter(Boolean),
  plugins: [expo(), nextCookies()],
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
});

export type Session = typeof auth.$Infer.Session;
