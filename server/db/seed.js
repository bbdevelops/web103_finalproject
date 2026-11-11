import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { ADMIN_GITHUB_ID, DEMO_GITHUB_ID } from "../config.js";
import { createPool } from "./pool.js";
import { catalog } from "./catalog.js";

export async function rebuildSchema(client) {
  // Full development rebuilds invalidate sessions before internal user IDs can be reused.
  const {
    rows: [sessions],
  } = await client.query("SELECT to_regclass('user_sessions') AS name");
  if (sessions.name) await client.query("DELETE FROM user_sessions");
  // The caller owns the transaction and search_path (public for development, isolated for tests).
  await client.query(
    "DROP TABLE IF EXISTS user_quests, quests, skill_trees, users",
  );
  await client.query(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
}

export async function seedUsers(client) {
  for (const [githubId, username, displayName, role] of [
    [DEMO_GITHUB_ID, "alex-chen-demo", "Alex Chen", "developer"],
    [ADMIN_GITHUB_ID, "skillforge-admin-demo", "Demo Administrator", "admin"],
  ]) {
    await client.query(
      `INSERT INTO users (github_id, github_username, display_name, role, created_at)
      VALUES ($1, $2, $3, $4, '2026-10-28T12:00:00Z') ON CONFLICT (github_id) DO NOTHING`,
      [githubId, username, displayName, role],
    );
  }
}

export async function seedCatalog(client) {
  const {
    rows: [demo],
  } = await client.query("SELECT id FROM users WHERE github_id = $1", [
    DEMO_GITHUB_ID,
  ]);
  if (!demo) throw new Error("Seed users before seeding the catalog.");
  // Preserve identities and roles so the future reset route can reuse this function.
  await client.query(
    "TRUNCATE TABLE user_quests, quests, skill_trees RESTART IDENTITY",
  );
  const reactQuestIds = [];
  for (const [treeIndex, tree] of catalog.entries()) {
    const {
      rows: [savedTree],
    } = await client.query(
      "INSERT INTO skill_trees (title, description) VALUES ($1, $2) RETURNING id",
      [tree.title, tree.description],
    );
    for (const [index, quest] of tree.quests.entries()) {
      const {
        rows: [savedQuest],
      } = await client.query(
        `INSERT INTO quests
        (skill_tree_id, created_by_user_id, title, description, requirements, difficulty,
         xp_reward, position, prerequisite_notes, tech_stack_tags, documentation_urls)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [
          savedTree.id,
          quest.custom ? demo.id : null,
          quest.title,
          quest.description,
          quest.requirements,
          ["beginner", "intermediate", "advanced"][index],
          [100, 150, 200][index],
          index + 1,
          quest.prerequisite,
          quest.tags,
          quest.docs,
        ],
      );
      if (treeIndex === 0) reactQuestIds.push(savedQuest.id);
    }
  }
  for (const [index, status] of [
    "completed",
    "in_progress",
    "backlog",
  ].entries()) {
    await client.query(
      `INSERT INTO user_quests
      (user_id, quest_id, status, xp_earned, completed_at, notes)
      VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        demo.id,
        reactQuestIds[index],
        status,
        index === 0 ? 100 : 0,
        index === 0 ? "2026-10-28T15:00:00Z" : null,
        index === 0
          ? "Built a responsive page and checked keyboard navigation."
          : null,
      ],
    );
  }
}

export async function initializeDatabase(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await rebuildSchema(client);
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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const pool = createPool();
  try {
    await initializeDatabase(pool);
    console.log(
      "Seeded 4 skill trees, 12 quests, 2 demo users, and 3 progress records.",
    );
  } catch {
    console.error(
      "Database seed failed. Check your root .env and database access. No partial changes were saved.",
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
