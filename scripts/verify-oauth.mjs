import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const deployedProof = await readFile(
  resolve(".artifacts/m5/deployment-checks.json"),
  "utf8",
)
  .then(JSON.parse)
  .catch(() => null);
const origin = new URL(
  process.env.PREVIEW_URL ?? deployedProof?.origin ?? "http://127.0.0.1:5173",
).origin;
const output = resolve(".artifacts/m5");
await mkdir(output, { recursive: true });
const installedChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const context = await chromium.launchPersistentContext(
  resolve(output, "oauth-profile"),
  {
    executablePath:
      process.env.CHROME_PATH ??
      (existsSync(installedChrome) ? installedChrome : undefined),
    headless: false,
    viewport: { width: 1280, height: 900 },
  },
);
try {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`${origin}/trees/1`);
  await page
    .getByRole("button", { name: "Sign in with GitHub", exact: true })
    .click();
  console.log(
    "Complete GitHub sign-in in the opened Chrome window. No password or token is logged.",
  );
  await page.waitForURL(
    (url) => url.origin === origin && url.pathname === "/trees/1",
    { timeout: 600000 },
  );
  assert.equal(new URL(page.url()).searchParams.has("authError"), false);
  await page.getByRole("button", { name: "Sign out", exact: true }).waitFor();
  const me = await context.request.get(`${origin}/auth/me`);
  assert.equal(me.status(), 200);
  await page.reload();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page
    .getByRole("button", { name: "Sign in with GitHub", exact: true })
    .waitFor();
  assert.equal((await context.request.get(`${origin}/auth/me`)).status(), 401);
  await page.goto(`${origin}/dashboard`);
  await page.waitForURL(
    (url) => url.origin === origin && url.pathname === "/dashboard",
    { timeout: 600000 },
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).waitFor();
  await page
    .getByRole("heading", { name: "Your developer dashboard", exact: true })
    .waitFor();
  await context.storageState({ path: resolve(output, "oauth-storage.json") });
  await writeFile(
    resolve(output, "oauth-checks.json"),
    JSON.stringify(
      {
        realGitHubSignIn: true,
        origin,
        returnedToTree: true,
        refreshPersistence: true,
        logout: true,
        signedInAgainForRecording: true,
        protectedDashboardReturn: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS real GitHub OAuth, return path, refresh persistence, logout, and reauthentication.",
  );
} finally {
  await context.close();
}
