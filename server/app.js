import express from "express";
import cors from "cors";
import { treeRoutes } from "./routes/trees.js";

export function createApp({ pool, demoAuth } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }),
  );
  app.use(express.json());
  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });
  app.use("/api/trees", treeRoutes(pool, { demoAuth }));
  app.use((_req, res) =>
    res.status(404).json({ error: "This endpoint could not be found." }),
  );
  app.use((error, _req, res, _next) => {
    if (error.type === "entity.parse.failed")
      return res
        .status(400)
        .json({ error: "Request body must be valid JSON." });
    res
      .status(503)
      .json({ error: "Unable to load your roadmap. Please try again." });
  });
  return app;
}
