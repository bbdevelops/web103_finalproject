import { readFile } from "node:fs/promises";

export async function ensureMediaTables(client) {
  await client.query(
    await readFile(new URL("./media.sql", import.meta.url), "utf8"),
  );
}

export async function migrateMedia(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(103006, hashtext(current_schema()))",
    );
    await ensureMediaTables(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
