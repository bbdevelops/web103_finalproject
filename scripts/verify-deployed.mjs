import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const supplied = process.argv[2] ?? process.env.PREVIEW_URL;
if (!supplied)
  throw new Error(
    "Usage: npm run test:deployed -- https://your-service.onrender.com",
  );
const origin = new URL(supplied).origin;
assert.ok(origin.startsWith("https://"), "Use the deployed HTTPS origin.");
const output = resolve(".artifacts/m5");
await mkdir(output, { recursive: true });
const checks = [];
const proof = {
  origin,
  passed: false,
  verifiedAt: new Date().toISOString(),
  checks,
};
try {
  const get = (path) =>
    fetch(origin + path, { signal: AbortSignal.timeout(180000) });
  assert.deepEqual(await (await get("/api/health")).json(), { ok: true });
  checks.push("database health");
  const trees = await get("/api/trees");
  assert.equal(trees.status, 200);
  assert.ok(Array.isArray((await trees.json()).trees));
  checks.push("public catalog API");
  for (const path of ["/", "/trees/1", "/dashboard", "/trees/1?quest=1"]) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, /id="root"/);
    assert.equal((await get(html.match(/src="([^"]+\.js)"/)[1])).status, 200);
  }
  checks.push("React deep links and built assets");
  for (const path of ["/auth/me", "/api/me/progress"])
    assert.equal((await get(path)).status, 401);
  checks.push("private API rejects guest reads");
  for (const path of ["/api/missing", "/auth/missing"]) {
    const response = await get(path);
    assert.equal(response.status, 404);
    assert.match(response.headers.get("content-type"), /application\/json/);
  }
  assert.equal((await get("/assets/missing.js")).status, 404);
  checks.push("API/auth JSON 404s and missing assets");
  proof.passed = true;
  console.log(`PASS deployed read-only smoke checks at ${origin}`);
} finally {
  await writeFile(
    resolve(output, "deployment-checks.json"),
    JSON.stringify(proof, null, 2),
  );
}
