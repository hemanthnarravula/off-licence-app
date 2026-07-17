import { createDb } from "@off-licence/db";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

export const db = createDb(databaseUrl);
