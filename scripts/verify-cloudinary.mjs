import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import request from "supertest";
import sharp from "sharp";
import { createPool } from "../server/db/pool.js";
import { initializeDatabase } from "../server/db/seed.js";
import { createApp } from "../server/app.js";
import { cloudStorage, drainImageDeletions } from "../server/media.js";
import { fixtureStrategy } from "../server/testing/auth-fixture.js";

const storage = cloudStorage();
assert.ok(
  storage.configured,
  "Configure the three private CLOUDINARY_ values in root .env.",
);
const schema = `skillforge_cloud_${randomUUID().replaceAll("-", "")}`;
const control = createPool({ max: 1 });
let pool, app;
const ids = new Set();
try {
  await control.query(`CREATE SCHEMA "${schema}"`);
  pool = createPool({ max: 3, options: `-c search_path=${schema}` });
  assert.equal(
    (await pool.query("SELECT current_schema() AS name")).rows[0].name,
    schema,
  );
  await initializeDatabase(pool);
  app = createApp({
    pool,
    media: storage,
    auth: {
      schemaName: schema,
      sessionSecret: "isolated-cloud-check-secret",
      clientID: "fixture",
      clientSecret: "fixture",
      clientOrigin: "http://127.0.0.1:5173",
      callbackURL: "http://127.0.0.1:5173/auth/callback",
      strategyFactory: fixtureStrategy,
    },
  });
  const agent = request.agent(app);
  const start = await agent.get("/auth/github").expect(302);
  await agent
    .get("/auth/callback")
    .query({
      code: "alex",
      state: new URL(start.headers.location).searchParams.get("state"),
    })
    .expect(302);
  const quest = (
    await agent
      .post("/api/quests")
      .send({
        skill_tree_id: 1,
        title: "Cloud storage check",
        description: "Disposable image check",
        requirements: "Upload and remove",
        difficulty: "beginner",
        xp_reward: 0,
        position: 4,
      })
      .expect(201)
  ).body.quest;
  let previous;
  for (const background of ["#a2dd45", "#f7cf72"]) {
    const file = await sharp({
      create: { width: 480, height: 300, channels: 3, background },
    })
      .png()
      .toBuffer();
    const response = await agent
      .post(`/api/quests/${quest.id}/image`)
      .field("alt_text", "Disposable Cloudinary verification image")
      .attach("image", file, {
        filename: "cloud-check.png",
        contentType: "image/png",
      })
      .expect(previous ? 200 : 201);
    const row = (
      await pool.query("SELECT public_id FROM quest_images WHERE quest_id=$1", [
        quest.id,
      ])
    ).rows[0];
    ids.add(row.public_id);
    assert.notEqual(response.body.image.url, previous);
    const delivered = await fetch(response.body.image.url, {
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(delivered.status, 200);
    assert.equal(
      (await sharp(Buffer.from(await delivered.arrayBuffer())).metadata())
        .width,
      480,
    );
    assert.deepEqual(
      (await request(app).get(`/api/quests/${quest.id}`)).body.image,
      response.body.image,
    );
    previous = response.body.image.url;
  }
  await agent.delete(`/api/quests/${quest.id}/image`).expect(204);
  await drainImageDeletions(pool, storage);
  assert.equal(
    (await pool.query("SELECT * FROM image_deletion_jobs")).rowCount,
    0,
  );
  assert.equal(
    (await request(app).get(`/api/quests/${quest.id}`)).body.image,
    null,
  );
  await mkdir(resolve(".artifacts/m5"), { recursive: true });
  await writeFile(
    resolve(".artifacts/m5/cloudinary-checks.json"),
    JSON.stringify(
      {
        realCloudinary: true,
        apiMocked: false,
        schemaIsolated: true,
        authentication:
          "isolated provider fixture; real Passport and database sessions",
        uploadReplacementDeliveryAndRemoval: true,
        recordedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS real Cloudinary file upload, CDN delivery, replacement, guest reads, removal and remote cleanup in an isolated schema.",
  );
} finally {
  if (pool) {
    const remaining = await pool
      .query("SELECT public_id FROM quest_images")
      .catch(() => ({ rows: [] }));
    for (const row of remaining.rows) ids.add(row.public_id);
  }
  for (const id of ids)
    await storage
      .destroy(id)
      .catch(() => console.error("Cloud test asset needs cleanup:", id));
  await app?.locals.sessionStore?.close();
  await pool?.end();
  if (/^skillforge_cloud_[a-f0-9]{32}$/.test(schema))
    await control.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await control.end();
}
