import { createDb, type Db } from "@offlicence/db";

let cached: Db | null = null;

export function getDb(): Db {
  if (!cached) {
    cached = createDb(process.env.DATABASE_URL);
  }
  return cached;
}

/** Lazy proxy so Next.js can evaluate modules during build without DATABASE_URL. */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb(), prop, receiver);
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});
