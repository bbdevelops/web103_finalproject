import { Router } from "express";
import { optionalUser } from "../middleware/user.js";

export function treeRoutes(pool, options) {
  const router = Router();
  router.use(optionalUser(pool, options));

  router.get("/", async (req, res) => {
    const userId = req.user?.id ?? null;
    const { rows: trees } = await pool.query(
      `SELECT t.id, t.title, t.description,
      COUNT(q.id)::integer AS quest_count,
      COUNT(uq.quest_id) FILTER (WHERE uq.status = 'completed')::integer AS completed_count
      FROM skill_trees t LEFT JOIN quests q ON q.skill_tree_id = t.id
      LEFT JOIN user_quests uq ON uq.quest_id = q.id AND uq.user_id = $1
      GROUP BY t.id ORDER BY t.id`,
      [userId],
    );
    const {
      rows: [summary],
    } = await pool.query(
      `SELECT
      COALESCE(SUM(xp_earned), 0)::integer AS total_xp,
      (SELECT COUNT(*)::integer FROM quests) AS total_quests,
      COUNT(*) FILTER (WHERE status = 'completed')::integer AS completed_quests,
      COUNT(*) FILTER (WHERE status = 'in_progress')::integer AS in_progress_quests
      FROM user_quests WHERE user_id = $1`,
      [userId],
    );
    res.json({ trees, summary, user: req.user ?? null });
  });

  router.get("/:id", async (req, res) => {
    if (
      !/^[1-9]\d*$/.test(req.params.id) ||
      Number(req.params.id) > 2147483647
    ) {
      return res
        .status(400)
        .json({ error: "Tree ID must be a positive integer." });
    }
    const {
      rows: [tree],
    } = await pool.query(
      "SELECT id, title, description FROM skill_trees WHERE id = $1",
      [req.params.id],
    );
    if (!tree)
      return res
        .status(404)
        .json({ error: "This skill tree could not be found." });
    const { rows: quests } = await pool.query(
      `SELECT q.*,
      COALESCE(uq.status, 'backlog') AS status
      FROM quests q LEFT JOIN user_quests uq ON uq.quest_id = q.id AND uq.user_id = $1
      WHERE q.skill_tree_id = $2 ORDER BY q.position, q.id`,
      [req.user?.id ?? null, tree.id],
    );
    tree.quest_count = quests.length;
    tree.completed_count = quests.filter(
      (quest) => quest.status === "completed",
    ).length;
    res.json({ tree, quests, user: req.user ?? null });
  });

  return router;
}
