import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function createDb(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

/** Singleton for server runtimes (Next.js / scripts). */
export function getDb() {
  if (!cached) {
    cached = createDb();
  }
  return cached;
}

export type Db = ReturnType<typeof createDb>;
