import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, beforeEach, after, test } from "node:test";
import request from "supertest";
import { createPool } from "../db/pool.js";
import { initializeDatabase } from "../db/seed.js";
import { createApp } from "../app.js";
import { safeReturnPath } from "../auth.js";
import { fixtureStrategy } from "../testing/auth-fixture.js";

const schema = `skillforge_test_${randomUUID().replaceAll("-", "")}`;
const adminPool = createPool({ max: 1 });
let pool, app;
const newQuest = {
  skill_tree_id: 1,
  title: "Ship a portfolio",
  description: "Build a useful portfolio",
  requirements: "Deploy and document it",
  difficulty: "intermediate",
  xp_reward: 250,
  position: 4,
  tech_stack_tags: [" React ", ""],
  documentation_urls: [" https://react.dev ", ""],
};
before(async () => {
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  pool = createPool({ max: 4, options: `-c search_path=${schema}` });
  assert.equal(
    (await pool.query("SELECT current_schema() AS name")).rows[0].name,
    schema,
  );
  app = createApp({
    pool,
    auth: {
      schemaName: schema,
      sessionSecret: "isolated-test-secret-with-adequate-entropy",
      clientID: "test",
      clientSecret: "test",
      callbackURL: "http://127.0.0.1:5173/auth/callback",
      clientOrigin: "http://127.0.0.1:5173",
      strategyFactory: fixtureStrategy,
    },
  });
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
async function signIn(name, returnTo = "/trees/1") {
  const agent = request.agent(app);
  const start = await agent.get("/auth/github").query({ returnTo }).expect(302);
  const state = new URL(start.headers.location).searchParams.get("state");
  assert.ok(state);
  const result = await agent
    .get("/auth/callback")
    .query({ code: name, state })
    .expect(302);
  assert.equal(
    new URL(result.headers.location).pathname,
    safeReturnPath(returnTo).split("?")[0],
  );
  return agent;
}
async function create(agent, changes = {}) {
  return (
    await agent
      .post("/api/quests")
      .send({ ...newQuest, ...changes })
      .expect(201)
  ).body.quest;
}

test("OAuth persists identity and PostgreSQL sessions, updates profile without changing role, and logs out", async () => {
  const admin = await signIn("admin");
  const user = (await admin.get("/auth/me").expect(200)).body.user;
  assert.equal(user.role, "admin");
  assert.ok(
    (await pool.query("SELECT COUNT(*)::integer AS count FROM user_sessions"))
      .rows[0].count,
  );
  const cookie = (await admin.get("/auth/github")).headers["set-cookie"] ?? [];
  assert.ok(cookie.every((value) => !value.includes("fixture:")));
  await admin.post("/auth/logout").expect(204);
  await admin.get("/auth/me").expect(401);
  await admin.post("/api/quests").send(newQuest).expect(401);
  const again = await signIn("admin");
  assert.equal((await again.get("/auth/me")).body.user.id, user.id);
  assert.equal(
    (
      await pool.query(
        "SELECT COUNT(*)::integer AS count FROM users WHERE github_id='skillforge:admin'",
      )
    ).rows[0].count,
    1,
  );
  const stored = (await pool.query("SELECT sess FROM user_sessions")).rows;
  assert.ok(
    stored.every((row) => !JSON.stringify(row).includes("fixture:admin")),
  );
});

test("OAuth rejects missing/incorrect state and cancellation, and constrains return URLs", async () => {
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\nmalicious",
  ])
    assert.equal(safeReturnPath(value), "/");
  assert.equal(
    safeReturnPath("/trees/2?view=quest#details"),
    "/trees/2?view=quest#details",
  );
  const agent = request.agent(app);
  await agent
    .get("/auth/github")
    .query({ returnTo: "//evil.example" })
    .expect(302);
  const invalid = await agent
    .get("/auth/callback?code=alex&state=incorrect")
    .expect(302);
  assert.equal(
    new URL(invalid.headers.location).origin,
    "http://127.0.0.1:5173",
  );
  assert.equal(
    new URL(invalid.headers.location).searchParams.get("authError"),
    "failed",
  );
  await agent.get("/auth/me").expect(401);
  await agent.get("/auth/callback?code=alex").expect(302);
  await agent.get("/auth/callback?error=access_denied").expect(302);
  await agent.get("/auth/me").expect(401);
  const unconfigured = createApp({
    pool,
    auth: { sessionSecret: "", clientID: "", clientSecret: "" },
  });
  assert.equal(
    new URL(
      (await request(unconfigured).get("/auth/github").expect(302)).headers
        .location,
    ).searchParams.get("authError"),
    "unavailable",
  );
});

test("new accounts have no progress; public reads and session/user isolation are enforced", async () => {
  await request(app).get("/api/trees").expect(200);
  await request(app).get("/api/quests/1").expect(200);
  await request(app).get("/api/me/progress").expect(401);
  await request(app)
    .put("/api/quests/1/progress")
    .send({ status: "completed" })
    .expect(401);
  const newcomer = await signIn("newcomer");
  const { summary, trees } = (
    await newcomer.get("/api/me/progress").expect(200)
  ).body;
  assert.deepEqual(summary, {
    total_xp: 0,
    total_quests: 12,
    completed_quests: 0,
    in_progress_quests: 0,
  });
  assert.equal(trees.length, 4);
  assert.equal((await newcomer.get("/api/quests/1")).body.progress, null);
  const alex = await signIn("alex");
  assert.equal((await alex.get("/api/quests/1")).body.progress.xp_earned, 100);
  const id = (await newcomer.get("/auth/me")).body.user.id;
  assert.equal(
    (
      await pool.query(
        "SELECT COUNT(*)::integer AS count FROM user_quests WHERE user_id=$1",
        [id],
      )
    ).rows[0].count,
    0,
  );
});

test("quest CRUD normalizes arrays, supports partial changes and tree moves, and keeps server ownership", async () => {
  const owner = await signIn("owner");
  const user = (await owner.get("/auth/me")).body.user;
  const quest = await create(owner, { created_by_user_id: 2, role: "admin" });
  assert.equal(quest.created_by_user_id, user.id);
  assert.deepEqual(quest.tech_stack_tags, ["React"]);
  assert.deepEqual(quest.documentation_urls, ["https://react.dev"]);
  const moved = (
    await owner
      .patch(`/api/quests/${quest.id}`)
      .send({ skill_tree_id: 2, xp_reward: 0 })
      .expect(200)
  ).body.quest;
  assert.equal(moved.title, quest.title);
  assert.equal(moved.xp_reward, 0);
  assert.ok(
    !(await owner.get("/api/trees/1")).body.quests.some(
      (row) => row.id === quest.id,
    ),
  );
  assert.ok(
    (await owner.get("/api/trees/2")).body.quests.some(
      (row) => row.id === quest.id,
    ),
  );
  await owner.delete(`/api/quests/${quest.id}`).expect(204);
  await owner.get(`/api/quests/${quest.id}`).expect(404);
});

test("quest writes enforce owner/admin permissions including seeded quests", async () => {
  const owner = await signIn("owner"),
    stranger = await signIn("stranger"),
    admin = await signIn("admin");
  const quest = await create(owner);
  for (const id of [quest.id, 1]) {
    await stranger
      .patch(`/api/quests/${id}`)
      .send({ title: "Forbidden" })
      .expect(403);
    await stranger.delete(`/api/quests/${id}`).expect(403);
  }
  await owner.patch("/api/quests/1").send({ title: "Forbidden" }).expect(403);
  await admin.patch("/api/quests/1").send({ title: "Admin edit" }).expect(200);
  await admin.delete(`/api/quests/${quest.id}`).expect(204);
  await owner
    .post("/api/quests")
    .set("Origin", "https://evil.example")
    .send(newQuest)
    .expect(403);
});

test("quest validation returns field errors for invalid bodies, links, enums, integers, and tree IDs", async () => {
  const owner = await signIn("owner");
  const { errors } = (
    await owner
      .post("/api/quests")
      .send({
        ...newQuest,
        title: " ",
        description: "",
        requirements: " ",
        difficulty: "expert",
        xp_reward: -1,
        position: 1.5,
        skill_tree_id: 99999,
        documentation_urls: ["javascript:alert(1)"],
      })
      .expect(400)
  ).body;
  for (const field of [
    "title",
    "description",
    "requirements",
    "difficulty",
    "xp_reward",
    "position",
    "skill_tree_id",
    "documentation_urls",
  ])
    assert.ok(errors[field], field);
  await owner.post("/api/quests").send([]).expect(400);
  await owner
    .post("/api/quests")
    .set("Content-Type", "application/json")
    .send("{")
    .expect(400);
  for (const id of ["0", "no", "2147483648"])
    await owner.get(`/api/quests/${id}`).expect(400);
  await owner.patch("/api/quests/99999").send({ title: "Missing" }).expect(404);
  await owner.delete("/api/quests/99999").expect(404);
});

test("completion snapshots once, preserves omitted fields, reopening clears XP, and recompletion uses new reward", async () => {
  const owner = await signIn("owner");
  const quest = await create(owner);
  const url = `/api/quests/${quest.id}/progress`;
  const first = (
    await owner
      .put(url)
      .send({
        status: "completed",
        notes: " shipped ",
        repository_url: " https://github.com/example/project ",
        user_id: 1,
        xp_earned: 999999,
      })
      .expect(200)
  ).body.progress;
  assert.equal(first.xp_earned, 250);
  assert.equal(first.notes, "shipped");
  await owner
    .patch(`/api/quests/${quest.id}`)
    .send({ xp_reward: 400 })
    .expect(200);
  const again = (await owner.put(url).send({ status: "completed" }).expect(200))
    .body.progress;
  assert.deepEqual(again, first);
  const reopened = (
    await owner.put(url).send({ status: "in_progress" }).expect(200)
  ).body.progress;
  assert.equal(reopened.xp_earned, 0);
  assert.equal(reopened.completed_at, null);
  assert.equal(reopened.notes, "shipped");
  assert.equal(reopened.repository_url, "https://github.com/example/project");
  assert.equal(
    (
      await owner
        .put(url)
        .send({ status: "completed", notes: null, repository_url: "" })
        .expect(200)
    ).body.progress.xp_earned,
    400,
  );
  const summary = (await owner.get("/api/me/progress")).body;
  assert.equal(summary.summary.total_xp, 400);
  assert.equal(summary.trees[0].completed_count, 1);
});

test("concurrent completions produce one progress row and one XP award", async () => {
  const owner = await signIn("owner"),
    quest = await create(owner);
  const results = await Promise.all(
    [1, 2, 3].map(() =>
      owner
        .put(`/api/quests/${quest.id}/progress`)
        .send({ status: "completed" })
        .expect(200),
    ),
  );
  assert.equal(
    new Set(results.map((result) => result.body.progress.completed_at)).size,
    1,
  );
  assert.equal(
    (await owner.get("/api/me/progress")).body.summary.total_xp,
    250,
  );
  assert.equal(
    (
      await pool.query(
        "SELECT COUNT(*)::integer AS count FROM user_quests WHERE quest_id=$1",
        [quest.id],
      )
    ).rows[0].count,
    1,
  );
});

test("progress validates input, supports notes-only saves, and cascade deletion refreshes totals", async () => {
  const owner = await signIn("owner"),
    other = await signIn("other"),
    quest = await create(owner);
  const url = `/api/quests/${quest.id}/progress`;
  const errors = (
    await owner
      .put(url)
      .send({ status: "invalid", notes: 3, repository_url: "file:///private" })
      .expect(400)
  ).body.errors;
  assert.ok(errors.status && errors.notes && errors.repository_url);
  assert.equal(
    (await owner.put(url).send({ notes: "Notes only" }).expect(200)).body
      .progress.status,
    "backlog",
  );
  await owner.put(url).send({ status: "completed" }).expect(200);
  await other.put(url).send({ status: "completed" }).expect(200);
  await owner.delete(`/api/quests/${quest.id}`).expect(204);
  assert.equal((await owner.get("/api/me/progress")).body.summary.total_xp, 0);
  assert.equal((await other.get("/api/me/progress")).body.summary.total_xp, 0);
  await owner
    .put("/api/quests/999999/progress")
    .send({ status: "completed" })
    .expect(404);
});

test("failed progress writes roll back, and development reseeding invalidates authenticated sessions", async () => {
  const owner = await signIn("owner"),
    quest = await create(owner);
  await pool.query(
    `CREATE FUNCTION fail_progress() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated'; END $$`,
  );
  await pool.query(
    "CREATE TRIGGER fail_progress BEFORE INSERT ON user_quests FOR EACH ROW EXECUTE FUNCTION fail_progress()",
  );
  await owner
    .put(`/api/quests/${quest.id}/progress`)
    .send({ status: "completed" })
    .expect(503);
  assert.equal(
    (await owner.get(`/api/quests/${quest.id}`)).body.progress,
    null,
  );
  await pool.query("DROP TRIGGER fail_progress ON user_quests");
  await owner
    .put(`/api/quests/${quest.id}/progress`)
    .send({ status: "completed" })
    .expect(200);
  await initializeDatabase(pool);
  await owner.get("/auth/me").expect(401);
});
