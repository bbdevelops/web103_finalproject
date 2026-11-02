import pg from "pg";
import { databaseOptions } from "../config.js";

export function createPool(overrides = {}) {
  const pool = new pg.Pool(databaseOptions(overrides));
  pool.on("error", () => console.error("An idle database connection failed."));
  return pool;
}
