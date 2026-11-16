import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, beforeEach, after, test } from "node:test";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../app.js";
import { createPool } from "../db/pool.js";
import { initializeDatabase } from "../db/seed.js";
import { migrateMedia } from "../db/migrate.js";
import { drainImageDeletions } from "../media.js";
import { fixtureStrategy } from "../testing/auth-fixture.js";

const schema = `skillforge_test_${randomUUID().replaceAll("-", "")}`;
const adminPool = createPool({ max: 1 });
let pool, app, png, owner, stranger, admin, quest;
let uploadFailure = false,
  deleteFailure = false,
  uploaded = [],
  destroyed = [];
const storage = {
  configured: true,
  async upload(buffer, publicId) {
    if (uploadFailure) throw new Error("private provider failure");
    const metadata = await sharp(buffer).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.exif, undefined);
    uploaded.push(publicId);
    return {
      public_id: publicId,
      secure_url: `https://images.example.test/${publicId}.webp`,
      width: metadata.width,
      height: metadata.height,
    };
  },
  async destroy(id) {
    if (deleteFailure) throw new Error("provider unavailable");
    destroyed.push(id);
    return { result: "ok" };
  },
};
before(async () => {
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  pool = createPool({ max: 5, options: `-c search_path=${schema}` });
  assert.equal(
    (await pool.query("SELECT current_schema() AS name")).rows[0].name,
    schema,
  );
  app = createApp({
    pool,
    media: storage,
    auth: {
      schemaName: schema,
      sessionSecret: "isolated-media-test-secret",
      clientID: "fixture",
      clientSecret: "fixture",
      clientOrigin: "http://127.0.0.1:5173",
      callbackURL: "http://127.0.0.1:5173/auth/callback",
      strategyFactory: fixtureStrategy,
    },
  });
  png = await sharp({
    create: { width: 48, height: 32, channels: 3, background: "#a2dd45" },
  })
    .withExif({ IFD0: { Artist: "Private test metadata" } })
    .png()
    .toBuffer();
});
async function signIn(name) {
  const agent = request.agent(app);
  const start = await agent
    .get("/auth/github")
    .query({ returnTo: "/trees/1" })
    .expect(302);
  await agent
    .get("/auth/callback")
    .query({
      code: name,
      state: new URL(start.headers.location).searchParams.get("state"),
    })
    .expect(302);
  return agent;
}
beforeEach(async () => {
  storage.configured = true;
  uploadFailure = deleteFailure = false;
  uploaded = [];
  destroyed = [];
  await initializeDatabase(pool);
  await pool.query("TRUNCATE image_deletion_jobs");
  owner = await signIn("owner");
  stranger = await signIn("stranger");
  admin = await signIn("admin");
  quest = (
    await owner
      .post("/api/quests")
      .send({
        skill_tree_id: 1,
        title: "Image quest",
        description: "Project screenshot",
        requirements: "Ship it",
        difficulty: "beginner",
        xp_reward: 100,
        position: 4,
      })
      .expect(201)
  ).body.quest;
});
after(async () => {
  await app?.locals.sessionStore?.close();
  await pool?.end();
  if (/^skillforge_test_[a-f0-9]{32}$/.test(schema))
    await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await adminPool.end();
});
const sendImage = (
  agent = owner,
  id = quest.id,
  buffer = png,
  mime = "image/png",
  alt = "Project screenshot",
) =>
  agent
    .post(`/api/quests/${id}/image`)
    .field("alt_text", alt)
    .attach("image", buffer, { filename: "screenshot.png", contentType: mime });
const imageRow = async () =>
  (await pool.query("SELECT * FROM quest_images WHERE quest_id=$1", [quest.id]))
    .rows[0];

test("media migration is additive, repeatable, and preserves accounts, sessions and progress", async () => {
  const counts = async () =>
    (
      await pool.query(
        "SELECT (SELECT count(*) FROM users)::int AS users,(SELECT count(*) FROM quests)::int AS quests,(SELECT count(*) FROM user_quests)::int AS progress,(SELECT count(*) FROM user_sessions)::int AS sessions",
      )
    ).rows[0];
  const before = await counts();
  await pool.query("DROP TABLE quest_images, image_deletion_jobs");
  await migrateMedia(pool);
  await migrateMedia(pool);
  assert.deepEqual(await counts(), before);
  assert.equal(
    (await admin.get("/auth/me").expect(200)).body.user.role,
    "admin",
  );
});
test("real image bytes are normalized, saved once per quest and exposed safely to guests", async () => {
  assert.equal(
    (await request(app).get(`/api/quests/${quest.id}`)).body.image,
    null,
  );
  const result = await sendImage().expect(201);
  assert.equal(result.body.image.alt_text, "Project screenshot");
  assert.equal(result.body.image.width, 48);
  assert.deepEqual(
    (await request(app).get(`/api/quests/${quest.id}`).expect(200)).body.image,
    result.body.image,
  );
  assert.equal(result.body.image.public_id, undefined);
  await assert.rejects(
    pool.query(
      "INSERT INTO quest_images SELECT * FROM quest_images WHERE quest_id=$1",
      [quest.id],
    ),
    { code: "23505", constraint: "quest_images_pkey" },
  );
  await assert.rejects(
    pool.query(
      "INSERT INTO quest_images(quest_id,public_id,secure_url,alt_text,width,height) VALUES (2147483647,'orphan','https://example.com/x','x',1,1)",
    ),
    { code: "23503" },
  );
});
test("image writes enforce authentication and owner/admin authorization before uploading", async () => {
  await sendImage(request(app)).expect(401);
  await sendImage(stranger).expect(403);
  await sendImage(owner, 1).expect(403);
  await sendImage(owner, 2147483647).expect(404);
  assert.equal(uploaded.length, 0);
  await sendImage(admin, 1).expect(201);
  await stranger.delete(`/api/quests/${quest.id}/image`).expect(403);
  await request(app).delete(`/api/quests/${quest.id}/image`).expect(401);
});
test("image validation rejects oversized, forged, animated, invalid and missing inputs", async () => {
  await sendImage(owner, quest.id, Buffer.alloc(5 * 1024 * 1024 + 1)).expect(
    413,
  );
  await sendImage(owner, quest.id, Buffer.from("not an image")).expect(415);
  await sendImage(owner, quest.id, png, "image/svg+xml").expect(415);
  await sendImage(owner, quest.id, png, "image/jpeg").expect(415);
  await sendImage(owner, quest.id, png, "image/png", " ").expect(400);
  await sendImage(owner, quest.id, png, "image/png", "x".repeat(201)).expect(
    400,
  );
  await owner
    .post(`/api/quests/${quest.id}/image`)
    .field("alt_text", "Missing file")
    .expect(400);
  const large = await sharp({
    create: { width: 5000, height: 4100, channels: 3, background: "black" },
  })
    .png()
    .toBuffer();
  await sendImage(owner, quest.id, large).expect(415);
  const animated = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAIBRAA7",
    "base64",
  );
  await sendImage(owner, quest.id, animated, "image/webp").expect(415);
  assert.equal(uploaded.length, 0);
  assert.equal(await imageRow(), undefined);
});
test("replacement keeps one row, trims alt text, and queues only the previous cloud asset", async () => {
  await sendImage().expect(201);
  const previous = await imageRow();
  await sendImage(owner, quest.id, png, "image/png", "  New cover  ").expect(
    200,
  );
  assert.equal((await imageRow()).alt_text, "New cover");
  assert.notEqual((await imageRow()).public_id, previous.public_id);
  assert.deepEqual(
    (await pool.query("SELECT public_id FROM image_deletion_jobs")).rows,
    [{ public_id: previous.public_id }],
  );
});
test("provider failure preserves the previous cover and returns safe retryable feedback", async () => {
  await sendImage().expect(201);
  const previous = await imageRow();
  uploadFailure = true;
  const result = await sendImage().expect(503);
  assert.ok(!JSON.stringify(result.body).includes("private provider"));
  assert.deepEqual(await imageRow(), previous);
});
test("database failure rolls back replacement and compensates the new upload", async () => {
  await sendImage().expect(201);
  const previous = await imageRow();
  await pool.query(
    "CREATE FUNCTION fail_image() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private failure'; END $$; CREATE TRIGGER fail_image BEFORE UPDATE ON quest_images FOR EACH ROW EXECUTE FUNCTION fail_image()",
  );
  try {
    await sendImage().expect(503);
    assert.deepEqual(await imageRow(), previous);
    assert.ok(destroyed.includes(uploaded[1]));
  } finally {
    await pool.query(
      "DROP TRIGGER fail_image ON quest_images; DROP FUNCTION fail_image()",
    );
  }
});
test("removal is idempotent and queues cleanup; failed cloud cleanup retries later", async () => {
  await sendImage().expect(201);
  const previous = await imageRow();
  await owner.delete(`/api/quests/${quest.id}/image`).expect(204);
  await owner.delete(`/api/quests/${quest.id}/image`).expect(204);
  assert.equal(await imageRow(), undefined);
  deleteFailure = true;
  await drainImageDeletions(pool, storage);
  const job = (await pool.query("SELECT * FROM image_deletion_jobs")).rows[0];
  assert.equal(job.attempts, 1);
  assert.equal(job.public_id, previous.public_id);
  deleteFailure = false;
  await pool.query("UPDATE image_deletion_jobs SET next_attempt_at=now()");
  await drainImageDeletions(pool, storage);
  assert.equal(
    (await pool.query("SELECT * FROM image_deletion_jobs")).rowCount,
    0,
  );
});
test("quest deletion and global reset cascade covers and queue remote cleanup after commit", async () => {
  await sendImage().expect(201);
  const previous = await imageRow();
  await owner.delete(`/api/quests/${quest.id}`).expect(204);
  assert.equal(await imageRow(), undefined);
  assert.ok(
    (
      await pool.query("SELECT * FROM image_deletion_jobs WHERE public_id=$1", [
        previous.public_id,
      ])
    ).rowCount,
  );
  await sendImage(admin, 1).expect(201);
  await admin.post("/api/reset").expect(200);
  assert.equal((await pool.query("SELECT * FROM quest_images")).rowCount, 0);
  assert.equal(
    (await admin.get("/api/me/progress")).body.summary.total_quests,
    12,
  );
  assert.equal((await admin.get("/auth/me")).body.user.role, "admin");
});
test("concurrent replacements serialize and leave exactly one current cover", async () => {
  const responses = await Promise.all([sendImage(), sendImage()]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 201]);
  assert.equal(
    (
      await pool.query("SELECT * FROM quest_images WHERE quest_id=$1", [
        quest.id,
      ])
    ).rowCount,
    1,
  );
  assert.equal(
    (await pool.query("SELECT * FROM image_deletion_jobs")).rowCount,
    1,
  );
});
test("unconfigured uploads fail gracefully while public reads and other features remain available", async () => {
  storage.configured = false;
  await sendImage().expect(503);
  await request(app).get(`/api/quests/${quest.id}`).expect(200);
  await owner
    .put(`/api/quests/${quest.id}/progress`)
    .send({ status: "completed" })
    .expect(200);
});

test("failed reset preserves covers and rolls back queued cloud deletions", async () => {
  await sendImage(admin, 1).expect(201);
  const previous = (
    await pool.query("SELECT * FROM quest_images WHERE quest_id=1")
  ).rows[0];
  await pool.query(
    "CREATE FUNCTION fail_media_reset() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'rollback reset'; END $$; CREATE TRIGGER fail_media_reset BEFORE INSERT ON skill_trees FOR EACH ROW EXECUTE FUNCTION fail_media_reset()",
  );
  try {
    await admin.post("/api/reset").expect(503);
    assert.deepEqual(
      (await pool.query("SELECT * FROM quest_images WHERE quest_id=1")).rows[0],
      previous,
    );
    assert.equal(
      (await pool.query("SELECT * FROM image_deletion_jobs")).rowCount,
      0,
    );
  } finally {
    await pool.query(
      "DROP TRIGGER fail_media_reset ON skill_trees; DROP FUNCTION fail_media_reset()",
    );
  }
});

test("reset waits for an in-flight upload and cannot attach it to a reused quest ID", async () => {
  const original = storage.upload;
  let release, entered;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const started = new Promise((resolve) => {
    entered = resolve;
  });
  storage.upload = async (...args) => {
    entered();
    await gate;
    return original(...args);
  };
  try {
    const pending = sendImage(admin, 1).then((response) => response);
    await started;
    const reset = admin.post("/api/reset").then((response) => response);
    release();
    assert.equal((await pending).status, 201);
    assert.equal((await reset).status, 200);
    assert.equal((await pool.query("SELECT * FROM quest_images")).rowCount, 0);
    assert.equal(
      (await pool.query("SELECT * FROM image_deletion_jobs")).rowCount,
      1,
    );
  } finally {
    release();
    storage.upload = original;
  }
});

test("disposable-schema uploads do not contend with another schema's catalog backup lock", async () => {
  const blocker = await adminPool.connect();
  try {
    await blocker.query("BEGIN");
    await blocker.query("SELECT pg_advisory_xact_lock(103005)");
    await blocker.query(
      "SELECT pg_advisory_xact_lock(103005, hashtext(current_schema()))",
    );
    await sendImage().expect(201);
  } finally {
    await blocker.query("ROLLBACK");
    blocker.release();
  }
});
