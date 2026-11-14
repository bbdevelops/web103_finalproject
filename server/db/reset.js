import { seedUsers, seedCatalog } from "./seed.js";

export async function resetCatalog(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize resets; TRUNCATE also protects the catalog from overlapping writes.
    await client.query("SELECT pg_advisory_xact_lock(103005)");
    await seedUsers(client);
    await seedCatalog(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
