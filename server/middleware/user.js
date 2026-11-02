import { DEMO_GITHUB_ID, demoAuthEnabled } from "../config.js";

export function optionalUser(pool, { demoAuth = demoAuthEnabled } = {}) {
  return async (req, _res, next) => {
    if (!req.user && demoAuth) {
      const { rows } = await pool.query(
        `SELECT id, github_username, display_name, avatar_url, role
        FROM users WHERE github_id = $1`,
        [DEMO_GITHUB_ID],
      );
      req.user = rows[0] ?? null;
    }
    next();
  };
}

export function requireUser(pool, options) {
  const resolveUser = optionalUser(pool, options);
  return async (req, res, next) => {
    await resolveUser(req, res, () => {});
    if (!req.user)
      return res.status(401).json({ error: "Sign in to continue." });
    next();
  };
}
