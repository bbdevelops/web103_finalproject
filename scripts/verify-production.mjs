import assert from "node:assert/strict";
import { createApp } from "../server/app.js";

// Read-only smoke check: exercise built-file routing without changing application data.
const app = createApp({
  pool: { query: async () => ({ rows: [] }) },
  auth: { sessionSecret: "", clientID: "", clientSecret: "" },
  serveClient: true,
});
const server = await new Promise((resolve) => {
  const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
});
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of [
    "/",
    "/dashboard",
    "/trees/1",
    "/trees/1?quest=3",
    "/unknown-page",
  ]) {
    const response = await fetch(base + path, {
      headers: { Accept: "text/html" },
    });
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type"), /text\/html/);
    const html = await response.text();
    assert.match(html, /id="root"/);
    const asset = html.match(/src="([^"]+\.js)"/)[1];
    assert.equal((await fetch(base + asset)).status, 200);
  }
  for (const path of ["/api/missing", "/auth/missing"]) {
    const response = await fetch(base + path, {
      headers: { Accept: "text/html" },
    });
    assert.equal(response.status, 404);
    assert.match(response.headers.get("content-type"), /application\/json/);
  }
  for (const path of ["/assets/missing.js", "/assets/missing", "/missing.svg"])
    assert.equal((await fetch(base + path)).status, 404);
  assert.deepEqual(await (await fetch(base + "/api/health")).json(), {
    ok: true,
  });
  console.log(
    "PASS built React deep links, assets, API/auth JSON 404s, missing assets, and health.",
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}
