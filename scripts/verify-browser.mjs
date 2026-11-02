import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.PREVIEW_URL ?? "http://127.0.0.1:5173";
const output = resolve(".artifacts/m3");
await mkdir(resolve(output, "frames"), { recursive: true });
const installedChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ??
    (existsSync(installedChrome) ? installedChrome : undefined),
  headless: true,
});
const checks = [];
const errors = [];
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
const pass = (name) => {
  checks.push(name);
  console.log(`PASS ${name}`);
};
const heading = (name) => page.getByRole("heading", { name, exact: true });
const visible = async (locator) => {
  await locator.waitFor({ state: "visible" });
};

try {
  await page.goto(baseURL);
  await visible(page.locator(".tree-card").first());
  assert.equal(await page.locator(".tree-card").count(), 4);
  assert.match(
    await page.locator(".stat-value").first().innerText(),
    /100\s*XP/,
  );
  assert.match(
    await page.locator(".stat-value").nth(1).innerText(),
    /1\s*\/\s*12/,
  );
  pass("real API renders four trees and seeded progress");
  await page.screenshot({
    path: resolve(output, "explorer-desktop.png"),
    fullPage: true,
  });

  await page.getByRole("link", { name: /Frontend Mastery with React/ }).click();
  await visible(heading("Frontend Mastery with React"));
  assert.match(page.url(), /\/trees\/\d+$/);
  assert.deepEqual(await page.locator(".quest-content h3").allTextContents(), [
    "HTML & CSS foundations",
    "Manage React state",
    "Build React routing",
  ]);
  assert.deepEqual(await page.locator(".status-badge").allTextContents(), [
    "Completed",
    "In Progress",
    "Backlog",
  ]);
  assert.equal(
    await page.getByRole("button", { name: /Forge Quest/ }).isDisabled(),
    true,
  );
  pass("card navigation opens ordered quests, statuses, and advisory guidance");
  await page.screenshot({
    path: resolve(output, "tree-desktop.png"),
    fullPage: true,
  });

  await page.reload();
  await visible(heading("Frontend Mastery with React"));
  pass("direct dynamic URL survives refresh");
  await page.getByRole("link", { name: "All skill trees" }).click();
  await visible(page.locator(".tree-card").first());
  pass("tree-to-Explorer navigation works");

  await page.goto(`${baseURL}/trees/999999`);
  await visible(heading("That skill tree isn’t here."));
  await page.getByRole("link", { name: "Back to skill trees" }).click();
  await visible(page.locator(".tree-card").first());
  await page.goto(`${baseURL}/trees/not-a-number`);
  await visible(heading("That skill tree isn’t here."));
  pass("missing and malformed tree routes offer recovery");

  await page.goto(`${baseURL}/dashboard`);
  await visible(heading("A home for your progress."));
  await page.getByRole("link", { name: "Explore skill trees" }).click();
  await visible(page.locator(".tree-card").first());
  await page.goto(`${baseURL}/missing-page`);
  await visible(heading("Let’s find your path."));
  pass(
    "dashboard placeholder and unknown-page recovery are honest and navigable",
  );

  await page.goto(baseURL);
  await visible(page.locator(".tree-card").first());
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "skip-link",
  );
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement.id), "main");
  pass("keyboard skip navigation moves focus to main content");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  await visible(page.locator(".tree-card").first());
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.equal(
    await page
      .locator(".tree-grid")
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      ),
    1,
  );
  await page.screenshot({
    path: resolve(output, "explorer-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: /Frontend Mastery with React/ }).click();
  await visible(heading("Frontend Mastery with React"));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  const list = await page.locator(".quest-list").boundingBox();
  const guidance = await page.locator(".guidance").boundingBox();
  assert.ok(guidance.y >= list.y + list.height);
  await page.screenshot({
    path: resolve(output, "tree-mobile.png"),
    fullPage: true,
  });
  pass(
    "390px layouts have one card column, no overflow, and guidance below quests",
  );

  await page.setViewportSize({ width: 1280, height: 900 });
  let failing = true;
  await page.route("**/api/trees", (route) =>
    failing
      ? route.fulfill({ status: 503, json: { error: "Temporary failure" } })
      : route.continue(),
  );
  await page.goto(baseURL);
  await visible(page.getByRole("alert"));
  failing = false;
  await page.getByRole("button", { name: /Try again/ }).click();
  await visible(page.locator(".tree-card").first());
  pass("failed fetch shows a useful error and Retry restores the real catalog");
  await page.unrouteAll({ behavior: "wait" });

  let releaseLoading;
  const loadingGate = new Promise((resolveGate) => {
    releaseLoading = resolveGate;
  });
  await page.route("**/api/trees", async (route) => {
    await loadingGate;
    await route.continue().catch(() => {});
  });
  await page.goto(baseURL);
  await visible(page.getByRole("status"));
  releaseLoading();
  await visible(page.locator(".tree-card").first());
  pass("loading state stays visible until the request completes");
  await page.unrouteAll({ behavior: "wait" });

  await page.route("**/api/trees", (route) =>
    route.fulfill({
      json: {
        trees: [],
        summary: {
          total_xp: 0,
          total_quests: 0,
          completed_quests: 0,
          in_progress_quests: 0,
        },
        user: null,
      },
    }),
  );
  await page.goto(baseURL);
  await visible(heading("New paths are on the way."));
  assert.equal(await page.locator(".tree-card").count(), 0);
  pass("empty catalog gives a readable next step");
  await page.unrouteAll({ behavior: "wait" });

  await page.route("**/api/trees/888", (route) =>
    route.fulfill({
      json: {
        tree: {
          id: 888,
          title: "Empty track",
          description: "A new roadmap",
          quest_count: 0,
          completed_count: 0,
        },
        quests: [],
        user: null,
      },
    }),
  );
  await page.goto(`${baseURL}/trees/888`);
  await visible(heading("A fresh canvas."));
  assert.ok(!(await page.locator("body").innerText()).includes("NaN"));
  assert.equal(
    await page.getByRole("progressbar").getAttribute("aria-valuetext"),
    "No quests yet",
  );
  pass("empty tree renders safely without a percentage or NaN");
  await page.unrouteAll({ behavior: "wait" });

  assert.deepEqual(errors, []);
  pass("no uncaught browser errors");

  // Record only unmocked interactions against the running PostgreSQL-backed app.
  await page.setViewportSize({ width: 1120, height: 820 });
  const frames = [];
  async function frame(label, duration) {
    const path = resolve(
      output,
      "frames",
      `${String(frames.length).padStart(2, "0")}-${label}.png`,
    );
    await page.screenshot({ path, animations: "disabled" });
    frames.push({ path, duration });
  }
  await page.goto(baseURL);
  await visible(page.locator(".tree-card").first());
  await page.evaluate(() => document.fonts.ready);
  await frame("explorer", 2000);
  await page.locator(".tracks-section").scrollIntoViewIfNeeded();
  await frame("tracks", 1800);
  await page.getByRole("link", { name: /Frontend Mastery with React/ }).hover();
  await frame("choose-react", 900);
  await page.getByRole("link", { name: /Frontend Mastery with React/ }).click();
  await visible(heading("Frontend Mastery with React"));
  await frame("react-roadmap", 2200);
  await page.locator(".quest-row").last().scrollIntoViewIfNeeded();
  await frame("quest-statuses", 2300);
  await page.evaluate(() => scrollTo(0, 0));
  await page.reload();
  await visible(heading("Frontend Mastery with React"));
  await frame("refresh-persists", 1400);
  await page.getByRole("link", { name: "All skill trees" }).click();
  await visible(page.locator(".tree-card").first());
  await frame("back-to-explorer", 1500);
  await page
    .getByRole("link", { name: /Backend & REST API Architecture/ })
    .click();
  await visible(heading("Backend & REST API Architecture"));
  await frame("another-track", 2000);
  await writeFile(
    resolve(output, "frames.json"),
    JSON.stringify(frames, null, 2),
  );
  await writeFile(
    resolve(output, "checks.json"),
    JSON.stringify(
      { checks, browserErrors: errors, recordedFrames: frames.length },
      null,
      2,
    ),
  );
  console.log(
    `${checks.length} browser checks passed; ${frames.length} real-app frames recorded.`,
  );
} finally {
  await browser.close();
}
