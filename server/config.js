import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});

export const DEMO_GITHUB_ID = "skillforge:alex";
export const ADMIN_GITHUB_ID = "skillforge:admin";
export const demoAuthEnabled =
  process.env.NODE_ENV !== "production" &&
  process.env.DEMO_AUTH_ENABLED !== "false";

export function databaseOptions(overrides = {}) {
  const connectionString = process.env.DATABASE_URL?.trim();
  const host = connectionString
    ? new URL(connectionString).hostname
    : process.env.PGHOST;
  const sslMode =
    process.env.PGSSLMODE ??
    (host?.endsWith("render.com") ? "require" : undefined);
  return {
    ...(connectionString ? { connectionString } : {}),
    ...(sslMode && sslMode !== "disable" ? { ssl: true } : {}),
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    ...overrides,
  };
}
