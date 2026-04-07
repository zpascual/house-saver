import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";

let database: ReturnType<typeof drizzle> | null = null;

export function getDatabase() {
  if (!env.DATABASE_URL) {
    return null;
  }

  if (!database) {
    const pool = new Pool({
      connectionString: env.DATABASE_URL,
    });

    database = drizzle(pool);
  }

  return database;
}
