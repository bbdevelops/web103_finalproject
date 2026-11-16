import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import "../server/config.js";
import { createPool } from "../server/db/pool.js";

const bin =
  process.env.PG_BIN ??
  (process.platform === "win32" ? "C:/Program Files/PostgreSQL/18/bin" : "");
const executable = (name) =>
  bin ? join(bin, name + (process.platform === "win32" ? ".exe" : "")) : name;
function run(name, args, env) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(executable(name), args, {
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", () => {});
    child.on("error", () =>
      reject(
        new Error(
          `Could not launch ${name}. Install PostgreSQL 18 clients or configure PG_BIN.`,
        ),
      ),
    );
    child.on("close", (code) =>
      code === 0
        ? resolveRun(output)
        : reject(
            new Error(
              `${name} failed. Check private database configuration; no database data was changed.`,
            ),
          ),
    );
  });
}
const env = { ...process.env };
if (env.DATABASE_URL) {
  const url = new URL(env.DATABASE_URL);
  Object.assign(env, {
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGSSLMODE: url.searchParams.get("sslmode") ?? env.PGSSLMODE ?? "require",
  });
}
let backupPool, backupClient;
try {
  const version = await run("pg_dump", ["--version"], env);
  if (!/PostgreSQL\) 18\./.test(version))
    throw new Error("Use PostgreSQL 18 backup clients for this database.");
  const output = resolve(".artifacts/m5/backups");
  await mkdir(output, { recursive: true });
  const file = join(
    output,
    `skillforge-${new Date().toISOString().replaceAll(":", "-")}.dump`,
  );
  if (existsSync(file)) throw new Error("Backup path already exists.");
  backupPool = createPool({ max: 1 });
  backupClient = await backupPool.connect();
  await backupClient.query("BEGIN");
  // Keep image references stable across the dump and private asset downloads.
  await backupClient.query("SELECT pg_advisory_xact_lock(103005)");
  await backupClient.query(
    "SELECT pg_advisory_xact_lock(103005, hashtext(current_schema()))",
  );
  await run(
    "pg_dump",
    ["--format=custom", "--no-owner", "--no-privileges", "--file", file],
    env,
  );
  const contents = await run("pg_restore", ["--list", file], env);
  for (const table of ["users", "skill_trees", "quests", "user_quests"])
    if (!contents.includes(`TABLE DATA public ${table} `))
      throw new Error(
        `Backup is missing ${table}; keep it private and investigate before resetting.`,
      );
  const metadata = {
    file,
    bytes: (await stat(file)).size,
    sha256: createHash("sha256")
      .update(await readFile(file))
      .digest("hex"),
    verifiedTables: ["users", "skill_trees", "quests", "user_quests"],
    createdAt: new Date().toISOString(),
  };
  const {
    rows: [mediaTable],
  } = await backupClient.query("SELECT to_regclass('quest_images') AS name");
  metadata.images = [];
  if (mediaTable.name) {
    if (!contents.includes("TABLE DATA public quest_images "))
      throw new Error("Backup is missing quest images.");
    metadata.verifiedTables.push("quest_images", "image_deletion_jobs");
    const { rows: images } = await backupClient.query(
      "SELECT * FROM quest_images ORDER BY quest_id",
    );
    const imageDirectory = file + "-images";
    if (images.length) await mkdir(imageDirectory);
    for (const image of images) {
      const response = await fetch(image.secure_url, {
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok)
        throw new Error(
          "Image backup failed. Do not reset until all images are backed up.",
        );
      const bytes = Buffer.from(await response.arrayBuffer());
      const imageFile = join(imageDirectory, `${image.quest_id}.webp`);
      await writeFile(imageFile, bytes);
      metadata.images.push({
        ...image,
        file: imageFile,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
  }
  metadata.mediaVerified = true;
  await backupClient.query("COMMIT");
  await writeFile(
    join(output, "latest.json"),
    JSON.stringify(metadata, null, 2),
  );
  console.log(JSON.stringify(metadata, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (backupClient) {
    await backupClient.query("ROLLBACK").catch(() => {});
    backupClient.release();
  }
  await backupPool?.end();
}
