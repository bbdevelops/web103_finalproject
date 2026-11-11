import { Router } from "express";
import { requireUser } from "../middleware/user.js";
import {
  httpUrl,
  questFields,
  statuses,
  validId,
  validateQuest,
} from "../validation.js";

export function questRoutes(pool, options) {
  const router = Router();
  const authenticated = requireUser(pool, options);
  router.param("id", (req, res, next, id) =>
    validId(id)
      ? next()
      : res.status(400).json({ error: "Quest ID must be a positive integer." }),
  );
  const canManage = (user, quest) =>
    user.role === "admin" || user.id === quest.created_by_user_id;
  const validate = async (body, partial) => {
    const result = validateQuest(body, partial);
    if (result.values.skill_tree_id) {
      const tree = await pool.query("SELECT id FROM skill_trees WHERE id=$1", [
        result.values.skill_tree_id,
      ]);
      if (!tree.rowCount)
        result.errors.skill_tree_id = "Choose an existing skill tree.";
    }
    return result;
  };
  router.get("/:id", async (req, res) => {
    const {
      rows: [quest],
    } = await pool.query("SELECT * FROM quests WHERE id=$1", [req.params.id]);
    if (!quest)
      return res.status(404).json({ error: "This quest could not be found." });
    const {
      rows: [progress],
    } = await pool.query(
      "SELECT status, xp_earned, completed_at, notes, repository_url FROM user_quests WHERE user_id=$1 AND quest_id=$2",
      [req.user?.id ?? null, quest.id],
    );
    res.json({ quest, progress: progress ?? null });
  });
  router.post("/", authenticated, async (req, res) => {
    const { values, errors } = await validate(req.body ?? {}, false);
    if (Object.keys(errors).length)
      return res
        .status(400)
        .json({ error: "Please check the highlighted fields.", errors });
    const fields = Object.keys(values);
    const {
      rows: [quest],
    } = await pool.query(
      `INSERT INTO quests (${fields.join(",")},created_by_user_id) VALUES (${fields.map((_, i) => `$${i + 1}`).join(",")},$${fields.length + 1}) RETURNING *`,
      [...Object.values(values), req.user.id],
    );
    res.status(201).json({ quest });
  });
  router.patch("/:id", authenticated, async (req, res) => {
    const {
      rows: [existing],
    } = await pool.query("SELECT * FROM quests WHERE id=$1", [req.params.id]);
    if (!existing)
      return res.status(404).json({ error: "This quest could not be found." });
    if (!canManage(req.user, existing))
      return res
        .status(403)
        .json({
          error: "Only the creator or an administrator can change this quest.",
        });
    const { values, errors } = await validate(req.body ?? {}, true);
    if (Object.keys(errors).length)
      return res
        .status(400)
        .json({ error: "Please check the highlighted fields.", errors });
    const fields = questFields.filter((field) => field in values);
    if (!fields.length) return res.json({ quest: existing });
    const {
      rows: [quest],
    } = await pool.query(
      `UPDATE quests SET ${fields.map((field, i) => `${field}=$${i + 1}`).join(",")} WHERE id=$${fields.length + 1} RETURNING *`,
      [...fields.map((field) => values[field]), existing.id],
    );
    if (!quest)
      return res.status(404).json({ error: "This quest could not be found." });
    res.json({ quest });
  });
  router.delete("/:id", authenticated, async (req, res) => {
    const {
      rows: [quest],
    } = await pool.query("SELECT * FROM quests WHERE id=$1", [req.params.id]);
    if (!quest)
      return res.status(404).json({ error: "This quest could not be found." });
    if (!canManage(req.user, quest))
      return res
        .status(403)
        .json({
          error: "Only the creator or an administrator can delete this quest.",
        });
    await pool.query("DELETE FROM quests WHERE id=$1", [quest.id]);
    res.sendStatus(204);
  });
  router.put("/:id/progress", authenticated, async (req, res) => {
    const body = req.body ?? {},
      errors = {};
    if ("status" in body && !statuses.includes(body.status))
      errors.status = "Choose a valid status.";
    for (const field of ["notes", "repository_url"]) {
      if (
        field in body &&
        body[field] !== null &&
        typeof body[field] !== "string"
      )
        errors[field] = "Enter text.";
    }
    if (
      typeof body.repository_url === "string" &&
      body.repository_url.trim() &&
      !httpUrl(body.repository_url.trim())
    )
      errors.repository_url = "Use an HTTP or HTTPS link.";
    if (Object.keys(errors).length)
      return res
        .status(400)
        .json({ error: "Please check the highlighted fields.", errors });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const {
        rows: [quest],
      } = await client.query(
        "SELECT xp_reward FROM quests WHERE id=$1 FOR UPDATE",
        [req.params.id],
      );
      if (!quest) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ error: "This quest could not be found." });
      }
      const {
        rows: [previous],
      } = await client.query(
        "SELECT * FROM user_quests WHERE user_id=$1 AND quest_id=$2",
        [req.user.id, req.params.id],
      );
      const status = body.status ?? previous?.status ?? "backlog";
      const completed = status === "completed";
      const {
        rows: [progress],
      } = await client.query(
        `INSERT INTO user_quests (user_id,quest_id,status,xp_earned,completed_at,notes,repository_url)
         VALUES ($1,$2,$3,$4,CASE WHEN $5::boolean THEN COALESCE($6::timestamptz,now()) ELSE NULL END,$7,$8)
         ON CONFLICT (user_id,quest_id) DO UPDATE SET status=EXCLUDED.status,xp_earned=EXCLUDED.xp_earned,
         completed_at=EXCLUDED.completed_at,notes=EXCLUDED.notes,repository_url=EXCLUDED.repository_url
         RETURNING status,xp_earned,completed_at,notes,repository_url`,
        [
          req.user.id,
          req.params.id,
          status,
          completed
            ? previous?.status === "completed"
              ? previous.xp_earned
              : quest.xp_reward
            : 0,
          completed,
          completed && previous?.status === "completed"
            ? previous.completed_at
            : null,
          "notes" in body
            ? body.notes?.trim() || null
            : (previous?.notes ?? null),
          "repository_url" in body
            ? body.repository_url?.trim() || null
            : (previous?.repository_url ?? null),
        ],
      );
      await client.query("COMMIT");
      res.json({ progress });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
  return router;
}
