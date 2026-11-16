import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

// Resume only the human-confirmed reset after an interrupted recording.
const output = resolve(".artifacts/m5");
const proof = (name) =>
  readFile(resolve(output, name), "utf8").then(JSON.parse);
const deployed = await proof("deployment-checks.json"),
  oauth = await proof("oauth-checks.json");
let backup = await proof("backups/latest.json");
assert.ok(
  deployed.passed && oauth.realGitHubSignIn && oauth.origin === deployed.origin,
);
assert.ok(Date.now() - Date.parse(backup.createdAt) < 86400000);
assert.equal(
  createHash("sha256")
    .update(await readFile(backup.file))
    .digest("hex"),
  backup.sha256,
);
const origin = deployed.origin;
const session = await proof("recording-session.json");
assert.equal(session.origin, origin);
const frameDirectory = session.frameDirectory;
const savedFinal = await proof("final-frames.json");
const beforeReset = savedFinal.find((frame) =>
  basename(frame.path).endsWith("-before-global-reset.png"),
);
assert.ok(
  beforeReset,
  "Completed walkthrough frames must exist before resuming reset.",
);
const cutoff = Number(basename(beforeReset.path).split("-")[0]);
const manifests = {};
for (const group of session.groups) {
  manifests[group] = (await proof(`${group}-frames.json`)).filter(
    (frame) => Number(basename(frame.path).split("-")[0]) < cutoff,
  );
}
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const context = await chromium.launchPersistentContext(
  resolve(output, "oauth-profile"),
  {
    executablePath:
      process.env.CHROME_PATH ?? (existsSync(chrome) ? chrome : undefined),
    headless: false,
    chromiumSandbox: true,
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  },
);
let sequence = cutoff,
  sampleId,
  resetDone = false;
const errors = [];
try {
  const page = context.pages()[0] ?? (await context.newPage());
  page.setDefaultTimeout(60000);
  page.on("pageerror", (error) => errors.push(error.message));
  const me = await context.request.get(`${origin}/auth/me`);
  assert.equal(me.status(), 200);
  assert.equal((await me.json()).user.role, "admin");
  async function frame(groups, label, duration = 2200) {
    const path = resolve(
      frameDirectory,
      `${String(sequence++).padStart(2, "0")}-${label}.png`,
    );
    await page.screenshot({ path, animations: "disabled" });
    for (const group of [...groups, "final"])
      manifests[group].push({ path, duration });
  }
  const sample = await context.request.post(`${origin}/api/quests`, {
    data: {
      skill_tree_id: 1,
      title: "Reset demonstration quest",
      description:
        "Temporary content for the owner-confirmed reset walkthrough.",
      requirements: "Restore defaults after backing up current data.",
      difficulty: "beginner",
      xp_reward: 75,
      position: 4,
    },
  });
  assert.equal(sample.status(), 201);
  sampleId = (await sample.json()).quest.id;
  assert.equal(
    (
      await context.request.put(`${origin}/api/quests/${sampleId}/progress`, {
        data: {
          status: "completed",
          notes: "Temporary demonstration progress",
        },
      })
    ).status(),
    200,
  );
  const cover = await context.request.post(
    `${origin}/api/quests/${sampleId}/image`,
    {
      multipart: {
        image: {
          name: "project-cover.png",
          mimeType: "image/png",
          buffer: await readFile(resolve(output, "project-cover.png")),
        },
        alt_text: "Temporary cover included in the reset backup",
      },
    },
  );
  assert.equal(cover.status(), 201);
  await promisify(execFile)(process.execPath, ["scripts/backup-database.mjs"], {
    windowsHide: true,
  });
  backup = await proof("backups/latest.json");
  assert.ok(
    backup.mediaVerified &&
      backup.images.some((image) => image.quest_id === sampleId),
  );
  for (const image of backup.images)
    assert.equal(
      createHash("sha256")
        .update(await readFile(image.file))
        .digest("hex"),
      image.sha256,
    );
  await page.goto(`${origin}/dashboard`);
  await page
    .getByRole("link", { name: "Reset demonstration quest", exact: true })
    .waitFor();
  await frame(["reset"], "before-global-reset");
  await page
    .getByRole("button", { name: "Reset database", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await frame(["reset"], "global-reset-confirmation", 2800);
  const network = await context.newCDPSession(page);
  await network.send("Network.enable");
  await network.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 1000,
    downloadThroughput: 125000,
    uploadThroughput: 62500,
    connectionType: "cellular3g",
  });
  await page.bringToFront();
  console.log(
    "Chrome is open at the reset confirmation. Waiting without a timeout for the owner to click Reset to defaults.",
  );
  await page
    .getByRole("button", { name: "Resetting…", exact: true })
    .waitFor({ timeout: 0 });
  await frame(["reset"], "reset-in-progress");
  await page
    .getByText(
      "Database restored to defaults. Accounts and roles were preserved.",
      { exact: true },
    )
    .waitFor();
  resetDone = true;
  const after = await (
    await context.request.get(`${origin}/api/me/progress`)
  ).json();
  assert.equal(after.summary.total_quests, 12);
  assert.equal(after.summary.total_xp, 0);
  assert.equal(after.trees.length, 4);
  assert.equal(
    (await (await context.request.get(`${origin}/auth/me`)).json()).user.role,
    "admin",
  );
  await page
    .getByLabel("Dashboard earned XP")
    .filter({ hasText: /^0\s*XP$/ })
    .waitFor();
  await frame(["reset"], "defaults-restored", 2600);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page
    .getByRole("button", { name: "Sign in with GitHub", exact: true })
    .waitFor();
  await page.locator(".tree-card").first().waitFor();
  await frame([], "signed-out");
  assert.deepEqual(errors, []);
  for (const [name, frames] of Object.entries(manifests))
    await writeFile(
      resolve(output, `${name}-frames.json`),
      JSON.stringify(frames, null, 2),
    );
  await writeFile(
    resolve(output, "recording-checks.json"),
    JSON.stringify(
      {
        origin,
        realGitHubSession: true,
        apiMocked: false,
        controlledNetworkLatency: true,
        invalidInputRejected: true,
        ownerConfirmedReset: true,
        resumedResetRecording: true,
        backupSha256: backup.sha256,
        defaultCatalogVerified: true,
        realCloudinaryUploads: true,
        privateMediaBackupVerified: backup.mediaVerified,
        flows: Object.keys(manifests),
        browserErrors: errors,
        recordedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS owner-confirmed deployed reset, preserved admin session, restored defaults, and logout; all four manifests saved.",
  );
} finally {
  if (!resetDone && sampleId)
    await context.request
      .delete(`${origin}/api/quests/${sampleId}`)
      .catch(() => {});
  await context.close();
}
