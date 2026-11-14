import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, beforeEach, after, test } from "node:test";
import request from "supertest";
import { createApp } from "../app.js";
import { createPool } from "../db/pool.js";
import { initializeDatabase } from "../db/seed.js";
import { fixtureStrategy } from "../testing/auth-fixture.js";
import { grantAdmin } from "../../scripts/grant-admin.mjs";

const schema = `skillforge_test_${randomUUID().replaceAll("-", "")}`;
const adminPool = createPool({ max: 1 });
let pool, app;
const auth = {
  schemaName: schema,
  sessionSecret: "isolated-m5-test-session-secret",
  clientID: "fixture",
  clientSecret: "fixture",
  callbackURL: "http://127.0.0.1:5173/auth/callback",
  clientOrigin: "http://127.0.0.1:5173",
  strategyFactory: fixtureStrategy,
};
before(async () => {
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  pool = createPool({ max: 3, options: `-c search_path=${schema}` });
  assert.equal(
    (await pool.query("SELECT current_schema() AS name")).rows[0].name,
    schema,
  );
  app = createApp({ pool, auth });
});
beforeEach(async () => {
  await initializeDatabase(pool);
});
after(async () => {
  await app?.locals.sessionStore?.close();
  await pool?.end();
  if (/^skillforge_test_[a-f0-9]{32}$/.test(schema))
    await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await adminPool.end();
});
async function signIn(name) {
  const agent = request.agent(app);
  const start = await agent
    .get("/auth/github")
    .query({ returnTo: "/dashboard" })
    .expect(302);
  const state = new URL(start.headers.location).searchParams.get("state");
  await agent.get("/auth/callback").query({ code: name, state }).expect(302);
  return agent;
}

test("dashboard recent history is private, limited to ten, and deterministically ordered", async () => {
  const alex = await signIn("alex"),
    other = await signIn("other");
  const user = (await alex.get("/auth/me")).body.user;
  await pool.query(
    `WITH new_quests AS (
    INSERT INTO quests (skill_tree_id, title, description, requirements, difficulty, xp_reward, position)
    SELECT 1, 'Recent ' || n, 'A recent quest', 'Build it', 'beginner', 50, n+3 FROM generate_series(1,12) n RETURNING id, position
    ) INSERT INTO user_quests (user_id,quest_id,status,xp_earned,completed_at,repository_url)
    SELECT $1,id,'completed',50,'2026-11-13T12:00:00Z'::timestamptz + (position / 2) * interval '1 minute','https://github.com/example/project' FROM new_quests`,
    [user.id],
  );
  const progress = (await alex.get("/api/me/progress").expect(200)).body;
  assert.equal(progress.recent_completions.length, 10);
  for (let index = 1; index < 10; index++) {
    const previous = progress.recent_completions[index - 1],
      current = progress.recent_completions[index];
    assert.ok(
      previous.completed_at > current.completed_at ||
        (previous.completed_at === current.completed_at &&
          previous.quest_id > current.quest_id),
    );
  }
  assert.equal(progress.summary.total_xp, 700);
  assert.ok(
    progress.recent_completions.every(
      (row) =>
        row.repository_url === "https://github.com/example/project" &&
        row.tree_title === "Frontend Mastery with React",
    ),
  );
  assert.deepEqual(
    (await other.get("/api/me/progress")).body.recent_completions,
    [],
  );
  await request(app).get("/api/me/progress").expect(401);
});

test("recent history follows quest moves and excludes reopened or deleted completions", async () => {
  const alex = await signIn("alex"),
    admin = await signIn("admin");
  await admin.patch("/api/quests/1").send({ skill_tree_id: 2 }).expect(200);
  let recent = (await alex.get("/api/me/progress")).body.recent_completions;
  assert.equal(recent[0].skill_tree_id, 2);
  assert.equal(recent[0].tree_title, "Backend & REST API Architecture");
  await alex
    .put("/api/quests/1/progress")
    .send({ status: "backlog" })
    .expect(200);
  assert.deepEqual(
    (await alex.get("/api/me/progress")).body.recent_completions,
    [],
  );
  await alex
    .put("/api/quests/2/progress")
    .send({ status: "completed" })
    .expect(200);
  await admin.delete("/api/quests/2").expect(204);
  assert.deepEqual(
    (await alex.get("/api/me/progress")).body.recent_completions,
    [],
  );
});

test("reset rejects unsigned and developer requests without changing data", async () => {
  const developer = await signIn("alex");
  const before = (await developer.get("/api/trees")).body;
  await request(app).post("/api/reset").expect(401);
  await developer.post("/api/reset").expect(403);
  assert.deepEqual((await developer.get("/api/trees")).body, before);
});

test("reset is repeatable and preserves real identities, roles, and active sessions", async () => {
  const admin = await signIn("admin"),
    developer = await signIn("owner");
  const before = (await pool.query("SELECT * FROM users ORDER BY id")).rows;
  const quest = (
    await developer
      .post("/api/quests")
      .send({
        skill_tree_id: 1,
        title: "Temporary",
        description: "A custom quest",
        requirements: "Build",
        difficulty: "beginner",
        xp_reward: 70,
        position: 4,
      })
      .expect(201)
  ).body.quest;
  await developer
    .put(`/api/quests/${quest.id}/progress`)
    .send({
      status: "completed",
      notes: "Private notes",
      repository_url: "https://example.com/project",
    })
    .expect(200);
  for (let run = 0; run < 2; run++) {
    assert.deepEqual((await admin.post("/api/reset").expect(200)).body, {
      ok: true,
    });
    assert.deepEqual(
      (await pool.query("SELECT * FROM users ORDER BY id")).rows,
      before,
    );
    assert.equal(
      (await admin.get("/auth/me").expect(200)).body.user.role,
      "admin",
    );
    const data = (await developer.get("/api/me/progress").expect(200)).body;
    assert.equal(data.summary.total_xp, 0);
    assert.equal(data.summary.total_quests, 12);
    assert.deepEqual(data.recent_completions, []);
    assert.equal(
      (await pool.query("SELECT COUNT(*)::integer AS count FROM user_quests"))
        .rows[0].count,
      3,
    );
    assert.equal(data.trees.length, 4);
  }
  assert.equal(
    (await pool.query("SELECT SUM(xp_earned)::integer AS xp FROM user_quests"))
      .rows[0].xp,
    100,
  );
});

test("a failed reset rolls back catalog replacement and keeps accounts and sessions", async () => {
  const admin = await signIn("admin");
  const before = (await admin.get("/api/trees")).body;
  await pool.query(
    "CREATE FUNCTION reject_reset() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated reset failure'; END $$",
  );
  await pool.query(
    "CREATE TRIGGER reject_reset BEFORE INSERT ON skill_trees FOR EACH ROW EXECUTE FUNCTION reject_reset()",
  );
  const failure = await admin.post("/api/reset").expect(503);
  assert.match(failure.body.error, /Existing data was preserved/);
  assert.deepEqual((await admin.get("/api/trees")).body, before);
  await admin.get("/auth/me").expect(200);
});

test("admin provisioning promotes only the selected existing numeric GitHub identity", async () => {
  await pool.query(
    "INSERT INTO users (github_id,github_username,display_name) VALUES ('215321334','bbdevelops','Project owner')",
  );
  await assert.rejects(grantAdmin(pool, "skillforge:admin"));
  await assert.rejects(grantAdmin(pool, "999999999999999"));
  const promoted = await grantAdmin(pool, "215321334");
  assert.equal(promoted.github_username, "bbdevelops");
  assert.equal(promoted.role, "admin");
  assert.deepEqual(await grantAdmin(pool, "215321334"), promoted);
  assert.equal(
    (
      await pool.query(
        "SELECT role FROM users WHERE github_id='skillforge:alex'",
      )
    ).rows[0].role,
    "developer",
  );
});

test("shared-origin production cookies are Secure, HttpOnly and SameSite=Lax", async () => {
  const previous = process.env.NODE_ENV;
  let productionApp;
  try {
    process.env.NODE_ENV = "production";
    productionApp = createApp({ pool, auth, serveClient: false });
    const response = await request(productionApp)
      .get("/auth/github")
      .set("X-Forwarded-Proto", "https")
      .expect(302);
    const cookie = response.headers["set-cookie"].join(";");
    assert.match(cookie, /; Secure/);
    assert.match(cookie, /; HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.equal(productionApp.get("trust proxy"), 1);
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
    await productionApp?.locals.sessionStore?.close();
  }
});
