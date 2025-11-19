// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { sql as drizzleSql } from "drizzle-orm";
import { Pool } from "pg";

/**
 * Connection string is required. Example (local):
 * postgresql://rentpilot_local:RentPilotLocal2025!@127.0.0.1:5432/rentpilotdb_local?sslmode=disable
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set");
}

/**
 * SSL handling:
 * - Local (127.0.0.1 / localhost): no SSL
 * - Remote (e.g. Neon): SSL with rejectUnauthorized:false (fine for dev/staging)
 */
const isLocal =
  /localhost|127\.0\.0\.1/i.test(connectionString) ||
  /sslmode=disable/i.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  keepAlive: true,
});

export const db = drizzle(pool);
export const sql = drizzleSql;

/**
 * Lightweight init for local/dev.
 * Creates minimal tables/extensions used by sessions or functions.
 * Safe to call at startup; statements are idempotent.
 */
export async function initializeEnterpriseDatabase() {
  try {
    // sessions table (for express-session, if used)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid varchar PRIMARY KEY,
        sess json NOT NULL,
        expire timestamp NOT NULL
      );
    `);

    // helpful extensions (ignore errors if not permitted)
    try {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    } catch {}
    try {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    } catch {}
  } catch (e) {
    // Keep startup resilient; the server will still run and log warnings elsewhere.
    // You can log e here if you want verbose diagnostics.
  }
}

/**
 * Optional: simple connectivity probe you can call once during boot.
 */
export async function verifyDbConnectionOnce() {
  try {
    await pool.query("SELECT 1");
    // console.log("[db] connected");
  } catch (err) {
    console.warn("[db] connection check failed:", (err as Error).message);
  }
}
