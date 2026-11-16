import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import sharp from "sharp";
import { createApp } from "../server/app.js";

const base = "6c7b64c";
const output = resolve(".artifacts/m5/toast-visuals");
await mkdir(output, { recursive: true });
for (const path of [
  "client/src/components/Toast.jsx",
  "client/src/hooks/useToast.js",
  "client/src/lib/toastKeys.js",
  "client/src/lib/toastProgress.js",
  "client/src/styles.css",
]) {
  assert.equal(
    await readFile(path, "utf8").then((s) => s.replaceAll("\r\n", "\n")),
    execFileSync("git", ["show", `${base}:${path}`], {
      encoding: "utf8",
    }).replaceAll("\r\n", "\n"),
    `Toast/feedback source changed: ${path}`,
  );
}
const baseline = resolve(output, "baseline");
if (!existsSync(resolve(baseline, "client/src/main.jsx"))) {
  await mkdir(baseline, { recursive: true });
  execFileSync("tar", ["-xf", "-", "-C", baseline], {
    input: execFileSync("git", ["archive", "--format=tar", base, "client"], {
      maxBuffer: 5000000,
    }),
  });
}
const quest = {
  id: 1,
  skill_tree_id: 1,
  created_by_user_id: null,
  title: "HTML & CSS foundations",
  description: "Build a responsive page.",
  requirements: "Test keyboard navigation.",
  difficulty: "beginner",
  xp_reward: 100,
  position: 1,
  prerequisite_notes: null,
  tech_stack_tags: [],
  documentation_urls: [],
  status: "backlog",
};
const tree = {
  id: 1,
  title: "Frontend Mastery with React",
  description: "Build useful interfaces.",
  quest_count: 1,
  completed_count: 0,
};
const fakePool = {
  async query(sql) {
    let rows = [];
    if (sql.includes("FROM skill_trees t LEFT")) rows = [tree];
    else if (sql.includes("AS total_xp"))
      rows = [
        {
          total_xp: 0,
          total_quests: 1,
          completed_quests: 0,
          in_progress_quests: 0,
        },
      ];
    else if (sql.includes("FROM skill_trees WHERE id")) rows = [tree];
    else if (
      sql.includes("FROM quests q LEFT") ||
      sql.startsWith("SELECT * FROM quests")
    )
      rows = [quest];
    return { rows, rowCount: rows.length };
  },
};
const api = createApp({
  pool: fakePool,
  auth: { sessionSecret: "", clientID: "", clientSecret: "" },
});
const apiServer = await new Promise((resolveServer) => {
  const server = api.listen(0, "127.0.0.1", () => resolveServer(server));
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ??
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  chromiumSandbox: true,
});
const captures = {};
try {
  for (const [label, root] of [
    ["before", resolve(baseline, "client")],
    ["after", resolve("client")],
  ]) {
    const vite = await createServer({
      configFile: false,
      root,
      plugins: [react()],
      server: {
        host: "127.0.0.1",
        port: 5186,
        strictPort: true,
        fs: { allow: [process.cwd()] },
        proxy: {
          "/api": `http://127.0.0.1:${apiServer.address().port}`,
          "/auth": `http://127.0.0.1:${apiServer.address().port}`,
        },
      },
    });
    await vite.listen();
    try {
      for (const [name, width, modal] of [
        ["desktop", 1280, false],
        ["mobile", 390, false],
        ["dialog", 1280, true],
      ]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          reducedMotion: "reduce",
        });
        await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
          route.abort(),
        );
        const page = await context.newPage();
        await page.goto(
          `http://127.0.0.1:5186/${modal ? "trees/1" : "dashboard"}?authError=failed`,
        );
        const toast = page.locator(".toast.tone-error");
        await toast.waitFor();
        if (modal) {
          await page.getByRole("button", { name: "View quest" }).click();
          await page.locator("dialog .toast").waitFor();
        }
        await toast.hover();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(850);
        captures[`${label}-${name}`] = await toast.screenshot({
          path: resolve(output, `${label}-${name}.png`),
          animations: "disabled",
        });
        await context.close();
      }
    } finally {
      await vite.close();
    }
  }
  for (const name of ["desktop", "mobile", "dialog"]) {
    const before = await sharp(captures[`before-${name}`])
      .raw()
      .toBuffer({ resolveWithObject: true });
    const after = await sharp(captures[`after-${name}`])
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.deepEqual(after.info, before.info, `${name} geometry changed`);
    assert.ok(after.data.equals(before.data), `${name} toast pixels changed`);
    console.log(
      `PASS ${name} toast is pixel-identical to the teammate's merged version.`,
    );
  }
  await writeFile(
    resolve(output, "checks.json"),
    JSON.stringify(
      {
        baseline: base,
        sourceUnchanged: true,
        pixelIdentical: ["desktop", "mobile", "dialog"],
        verifiedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await new Promise((done) => apiServer.close(done));
}
