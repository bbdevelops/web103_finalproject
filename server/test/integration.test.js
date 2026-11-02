import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";
import express from "express";
import request from "supertest";
import { createApp } from "../app.js";
import { DEMO_GITHUB_ID } from "../config.js";
import { createPool } from "../db/pool.js";
import {
  initializeDatabase,
  rebuildSchema,
  seedCatalog,
  seedUsers,
} from "../db/seed.js";
import { requireUser } from "../middleware/user.js";

// Every destructive test operation is restricted to a schema created by this test run.
const schema = `skillforge_test_${randomUUID().replaceAll("-", "")}`;
const adminPool = createPool({ max: 1 });
let pool;
let app;
let created = false;

before(async () => {
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  created = true;
  pool = createPool({ max: 2, options: `-c search_path=${schema}` });
  const {
    rows: [result],
  } = await pool.query("SELECT current_schema() AS schema");
  assert.equal(
    result.schema,
    schema,
    "Test pool must never use the development schema",
  );
  app = createApp({ pool, demoAuth: true });
});

beforeEach(async () => {
  await initializeDatabase(pool);
});

after(async () => {
  await pool?.end();
  if (created && /^skillforge_test_[a-f0-9]{32}$/.test(schema)) {
    await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`);
  }
  await adminPool.end();
});

test("health, four trees, twelve quests, and example progress are database-backed", async () => {
  assert.deepEqual((await request(app).get("/api/health").expect(200)).body, {
    ok: true,
  });
  const { body } = await request(app).get("/api/trees").expect(200);
  assert.equal(body.trees.length, 4);
  assert.deepEqual(body.summary, {
    total_xp: 100,
    total_quests: 12,
    completed_quests: 1,
    in_progress_quests: 1,
  });
  assert.equal(body.user.display_name, "Alex Chen");
  assert.deepEqual(
    body.trees.map((tree) => [tree.quest_count, tree.completed_count]),
    [
      [3, 1],
      [3, 0],
      [3, 0],
      [3, 0],
    ],
  );
});

test("another user cannot inflate demo counts or leak personal quest status", async () => {
  const {
    rows: [other],
  } =
    await pool.query(`INSERT INTO users (github_id, github_username, display_name)
    VALUES ('other-user', 'other', 'Other Developer') RETURNING id`);
  await pool.query(
    `INSERT INTO user_quests (user_id, quest_id, status, xp_earned, completed_at)
    VALUES ($1, 2, 'completed', 150, now()), ($1, 4, 'completed', 100, now())`,
    [other.id],
  );
  const { body } = await request(app).get("/api/trees").expect(200);
  assert.equal(body.summary.total_xp, 100);
  assert.equal(body.summary.completed_quests, 1);
  assert.equal(body.trees[1].completed_count, 0);
  const { body: detail } = await request(app).get("/api/trees/1").expect(200);
  assert.equal(detail.quests[1].status, "in_progress");
  const { body: backend } = await request(app).get("/api/trees/2").expect(200);
  assert.ok(backend.quests.every((quest) => quest.status === "backlog"));
});

test("guest reads remain public and do not expose the demo user progress", async () => {
  const guestApp = createApp({ pool, demoAuth: false });
  const { body } = await request(guestApp).get("/api/trees").expect(200);
  assert.equal(body.user, null);
  assert.deepEqual(body.summary, {
    total_xp: 0,
    total_quests: 12,
    completed_quests: 0,
    in_progress_quests: 0,
  });
  assert.ok(body.trees.every((tree) => tree.completed_count === 0));
  const { body: detail } = await request(guestApp)
    .get("/api/trees/1")
    .expect(200);
  assert.ok(detail.quests.every((quest) => quest.status === "backlog"));
});

test("tree detail is ordered by position then ID, and missing progress is Backlog", async () => {
  await pool.query(
    "UPDATE quests SET position = CASE WHEN id = 3 THEN 0 ELSE 5 END WHERE skill_tree_id = 1",
  );
  const { body } = await request(app).get("/api/trees/1").expect(200);
  assert.deepEqual(
    body.quests.map((quest) => quest.id),
    [3, 1, 2],
  );
  assert.equal(body.tree.completed_count, 1);
  assert.equal(body.tree.quest_count, 3);
  assert.ok(
    body.quests.every(
      (quest) => quest.prerequisite_notes && quest.documentation_urls.length,
    ),
  );
  await pool.query("DELETE FROM user_quests WHERE quest_id = 2");
  const { body: changed } = await request(app).get("/api/trees/1").expect(200);
  assert.equal(
    changed.quests.find((quest) => quest.id === 2).status,
    "backlog",
  );
});

test("invalid and missing tree IDs return useful HTTP errors", async () => {
  for (const id of ["0", "-1", "abc", "1.5", "2147483648", "1%3BDROP"]) {
    await request(app).get(`/api/trees/${id}`).expect(400);
  }
  await request(app).get("/api/trees/999999").expect(404);
  await request(app).get("/api/missing").expect(404);
  const { body } = await request(app).get("/api/trees").expect(200);
  assert.equal(body.trees.length, 4);
});

test("empty catalog and empty trees have zero counts without dividing by zero", async () => {
  await pool.query(
    "TRUNCATE user_quests, quests, skill_trees RESTART IDENTITY",
  );
  const { body } = await request(app).get("/api/trees").expect(200);
  assert.deepEqual(body.trees, []);
  assert.deepEqual(body.summary, {
    total_xp: 0,
    total_quests: 0,
    completed_quests: 0,
    in_progress_quests: 0,
  });
  const {
    rows: [tree],
  } = await pool.query(
    "INSERT INTO skill_trees (title, description) VALUES ('Empty tree', 'A fresh track') RETURNING id",
  );
  const { body: detail } = await request(app)
    .get(`/api/trees/${tree.id}`)
    .expect(200);
  assert.deepEqual(detail.quests, []);
  assert.equal(detail.tree.quest_count, 0);
  assert.equal(detail.tree.completed_count, 0);
});

test("schema enforces roles, identity uniqueness, quest constraints, and required text", async () => {
  const invalidQueries = [
    ["UPDATE users SET role = 'owner' WHERE id = 1", "23514"],
    [
      "INSERT INTO users (github_id, github_username, display_name) SELECT github_id, github_username, display_name FROM users WHERE id = 1",
      "23505",
    ],
    ["UPDATE quests SET difficulty = 'legendary' WHERE id = 1", "23514"],
    ["UPDATE quests SET xp_reward = -1 WHERE id = 1", "23514"],
    ["UPDATE quests SET position = -1 WHERE id = 1", "23514"],
    ["UPDATE quests SET title = '  ' WHERE id = 1", "23514"],
    ["UPDATE quests SET requirements = '' WHERE id = 1", "23514"],
    ["UPDATE skill_trees SET description = ' ' WHERE id = 1", "23514"],
  ];
  for (const [sql, code] of invalidQueries)
    await assert.rejects(pool.query(sql), { code });
  await assert.rejects(
    pool.query("UPDATE quests SET xp_reward = $1 WHERE id = 1", ["1.5"]),
    { code: "22P02" },
  );
});

test("join table enforces unique progress, valid statuses, and completion consistency", async () => {
  for (const [sql, code] of [
    ["INSERT INTO user_quests (user_id, quest_id) VALUES (1, 1)", "23505"],
    ["UPDATE user_quests SET status = 'unknown' WHERE quest_id = 2", "23514"],
    ["UPDATE user_quests SET xp_earned = -1 WHERE quest_id = 2", "23514"],
    ["UPDATE user_quests SET status = 'completed' WHERE quest_id = 2", "23514"],
    ["UPDATE user_quests SET completed_at = now() WHERE quest_id = 2", "23514"],
    ["UPDATE user_quests SET xp_earned = 1 WHERE quest_id = 2", "23514"],
    ["UPDATE user_quests SET status = 'backlog' WHERE quest_id = 1", "23514"],
  ])
    await assert.rejects(pool.query(sql), { code });
  await pool.query("UPDATE user_quests SET xp_earned = 0 WHERE quest_id = 1");
  assert.equal(
    (await request(app).get("/api/trees")).body.summary.completed_quests,
    1,
  );
});

test("referenced trees/authors are restricted and quest deletion cascades to progress", async () => {
  const restricted = (error) => ["23001", "23503"].includes(error.code);
  await assert.rejects(
    pool.query("DELETE FROM skill_trees WHERE id = 1"),
    restricted,
  );
  await assert.rejects(
    pool.query("DELETE FROM users WHERE id = 1"),
    restricted,
  );
  await pool.query("DELETE FROM quests WHERE id = 3");
  assert.equal(
    (await pool.query("SELECT COUNT(*)::int AS count FROM user_quests")).rows[0]
      .count,
    2,
  );
  await pool.query("DELETE FROM users WHERE id = 1");
  assert.equal(
    (await pool.query("SELECT COUNT(*)::int AS count FROM user_quests")).rows[0]
      .count,
    0,
  );
});

test("catalog reseed preserves identities/roles and resolves demo identity without a fixed user ID", async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await rebuildSchema(client);
    await client.query(
      "INSERT INTO users (github_id, github_username, display_name, role) VALUES ('existing', 'existing', 'Existing Admin', 'admin')",
    );
    await seedUsers(client);
    const {
      rows: [demo],
    } = await client.query("SELECT id FROM users WHERE github_id = $1", [
      DEMO_GITHUB_ID,
    ]);
    assert.notEqual(demo.id, 1);
    await client.query("UPDATE users SET role = $1 WHERE id = $2", [
      "admin",
      demo.id,
    ]);
    await seedCatalog(client);
    await seedCatalog(client);
    assert.equal(
      (await client.query("SELECT COUNT(*)::int AS count FROM users")).rows[0]
        .count,
      3,
    );
    assert.equal(
      (await client.query("SELECT role FROM users WHERE id = $1", [demo.id]))
        .rows[0].role,
      "admin",
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  const { body } = await request(app).get("/api/trees").expect(200);
  assert.equal(body.summary.total_xp, 100);
  assert.equal(body.summary.completed_quests, 1);
});

test("full seed can run repeatedly with the same catalog, identities, and starter progress", async () => {
  const before = (await request(app).get("/api/trees")).body;
  await initializeDatabase(pool);
  assert.deepEqual((await request(app).get("/api/trees")).body, before);
  const { rows } = await pool.query("SELECT role FROM users ORDER BY id");
  assert.deepEqual(
    rows.map((row) => row.role),
    ["developer", "admin"],
  );
});

test("a failed seed rolls back schema replacement and preserves the previous catalog", async () => {
  const expected = (await request(app).get("/api/trees")).body;
  const failingPool = {
    async connect() {
      const client = await pool.connect();
      return {
        query: (sql, ...args) =>
          sql.startsWith("INSERT INTO skill_trees")
            ? Promise.reject(new Error("Simulated seed failure"))
            : client.query(sql, ...args),
        release: () => client.release(),
      };
    },
  };
  await assert.rejects(
    initializeDatabase(failingPool),
    /Simulated seed failure/,
  );
  assert.deepEqual((await request(app).get("/api/trees")).body, expected);
});

test("requireUser supplies the demo identity and rejects unsigned requests outside demo mode", async () => {
  const privateApp = express();
  privateApp.get("/demo", requireUser(pool, { demoAuth: true }), (req, res) =>
    res.json({ name: req.user.display_name }),
  );
  privateApp.get(
    "/guest",
    requireUser(pool, { demoAuth: false }),
    (_req, res) => res.json({ ok: true }),
  );
  assert.deepEqual((await request(privateApp).get("/demo").expect(200)).body, {
    name: "Alex Chen",
  });
  await request(privateApp).get("/guest").expect(401);
});

test("database failures return safe retryable responses without error details", async () => {
  const failingApp = createApp({
    pool: {
      query: async () => {
        throw new Error("Private connection details");
      },
    },
    demoAuth: true,
  });
  assert.deepEqual(
    (await request(failingApp).get("/api/health").expect(503)).body,
    { ok: false },
  );
  const { body } = await request(failingApp).get("/api/trees").expect(503);
  assert.deepEqual(body, {
    error: "Unable to load your roadmap. Please try again.",
  });
});
