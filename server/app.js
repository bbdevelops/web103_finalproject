import express from "express";
import cors from "cors";
import { treeRoutes } from "./routes/trees.js";
import { questRoutes } from "./routes/quests.js";
import { configureAuth } from "./auth.js";
import { optionalUser, requireUser } from "./middleware/user.js";

export function createApp({ pool, demoAuth = false, auth = {} } = {}) {
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
      res.json({ summary, trees });
    },
  );
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
