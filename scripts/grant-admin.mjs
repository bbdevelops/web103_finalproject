import { pathToFileURL } from "node:url";
import { createPool } from "../server/db/pool.js";

export async function grantAdmin(pool, githubId) {
  if (!/^[1-9]\d*$/.test(githubId ?? ""))
    throw new Error("Provide a real numeric GitHub ID with --github-id.");
  const { rows } = await pool.query(
    "UPDATE users SET role='admin' WHERE github_id=$1 RETURNING github_id, github_username, role",
    [githubId],
  );
  if (rows.length !== 1)
    throw new Error(
      "That GitHub account must sign in before it can be promoted.",
    );
  return rows[0];
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const githubId = process.argv[process.argv.indexOf("--github-id") + 1];
  const pool = createPool();
  try {
    console.log(JSON.stringify(await grantAdmin(pool, githubId)));
  } catch (error) {
    console.error(
      error.code
        ? "Admin provisioning failed. Check database access; no account was created."
        : error.message,
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
