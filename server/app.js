import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { extname } from "node:path";
import { treeRoutes } from "./routes/trees.js";
import { questRoutes } from "./routes/quests.js";
import { configureAuth } from "./auth.js";
import { optionalUser, requireUser } from "./middleware/user.js";
import { resetCatalog } from "./db/reset.js";

export function createApp({
  pool,
  demoAuth = false,
  auth = {},
  serveClient = process.env.NODE_ENV === "production",
  clientDirectory = fileURLToPath(new URL("../client/dist/", import.meta.url)),
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    cors({
      origin:
        auth.clientOrigin ??
        process.env.CLIENT_ORIGIN ??
        "http://127.0.0.1:5173",
      credentials: true,
    }),
  );
  app.use(express.json());
  // Reject cross-origin writes independently of whether controls are visible.
  app.use((req, res, next) => {
    const allowed =
      auth.clientOrigin ?? process.env.CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== allowed
    )
      return res
        .status(403)
        .json({ error: "This request origin is not allowed." });
    next();
  });
  configureAuth(app, pool, auth);
  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });
  app.use("/api", optionalUser(pool, { demoAuth }));
  app.use("/api", (req, res, next) => {
    if (
      req.body != null &&
      (Array.isArray(req.body) || typeof req.body !== "object")
    )
      return res.status(400).json({ error: "Request body must be an object." });
    next();
  });
  app.use("/api/trees", treeRoutes(pool, { demoAuth }));
  app.use("/api/quests", questRoutes(pool, { demoAuth }));
  app.get(
    "/api/me/progress",
    requireUser(pool, { demoAuth }),
    async (req, res) => {
      const {
        rows: [summary],
      } = await pool.query(
        `SELECT COALESCE(SUM(xp_earned),0)::integer AS total_xp,
      (SELECT COUNT(*)::integer FROM quests) AS total_quests,
      COUNT(*) FILTER (WHERE status='completed')::integer AS completed_quests,
      COUNT(*) FILTER (WHERE status='in_progress')::integer AS in_progress_quests
      FROM user_quests WHERE user_id=$1`,
        [req.user.id],
      );
      const { rows: trees } = await pool.query(
        `SELECT t.id,t.title,COUNT(q.id)::integer AS quest_count,
      COUNT(uq.quest_id) FILTER (WHERE uq.status='completed')::integer AS completed_count
      FROM skill_trees t LEFT JOIN quests q ON q.skill_tree_id=t.id
      LEFT JOIN user_quests uq ON uq.quest_id=q.id AND uq.user_id=$1 GROUP BY t.id ORDER BY t.id`,
        [req.user.id],
      );
      const { rows: recent_completions } = await pool.query(
        `SELECT q.id AS quest_id, q.title AS quest_title, t.id AS skill_tree_id,
         t.title AS tree_title, uq.completed_at, uq.xp_earned, uq.repository_url
         FROM user_quests uq JOIN quests q ON q.id=uq.quest_id
         JOIN skill_trees t ON t.id=q.skill_tree_id
         WHERE uq.user_id=$1 AND uq.status='completed'
         ORDER BY uq.completed_at DESC, q.id DESC LIMIT 10`,
        [req.user.id],
      );
      res.json({ summary, trees, recent_completions });
    },
  );
  app.post("/api/reset", requireUser(pool, { demoAuth }), async (req, res) => {
    if (req.user.role !== "admin")
      return res
        .status(403)
        .json({ error: "Only administrators can reset the database." });
    try {
      await resetCatalog(pool);
      res.json({ ok: true });
    } catch {
      res
        .status(503)
        .json({
          error:
            "Reset did not finish. Existing data was preserved. Please try again.",
        });
    }
  });
  app.use(["/api", "/auth"], (_req, res) =>
    res.status(404).json({ error: "This endpoint could not be found." }),
  );
  if (serveClient) {
    app.use(express.static(clientDirectory, { index: false }));
    app.get("/{*splat}", (req, res, next) => {
      if (
        req.path.startsWith("/assets/") ||
        extname(req.path) ||
        !req.accepts("html")
      )
        return next();
      res.sendFile("index.html", { root: clientDirectory }, (error) => {
        if (error) next(error);
      });
    });
  }
  app.use((_req, res) =>
    res.status(404).json({ error: "This endpoint could not be found." }),
  );
  app.use((error, _req, res, next) => {
    if (res.headersSent) return next(error);
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
