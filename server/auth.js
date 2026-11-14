import { Passport } from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

export const SESSION_COOKIE = "skillforge.sid";
const publicUserColumns = "id, github_username, display_name, avatar_url, role";

export function safeReturnPath(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return "/";
  const parsed = new URL(value, "http://skillforge.local");
  return parsed.origin === "http://skillforge.local"
    ? parsed.pathname + parsed.search + parsed.hash
    : "/";
}

export async function upsertGitHubUser(pool, profile) {
  const { rows } = await pool.query(
    `INSERT INTO users (github_id, github_username, display_name, avatar_url)
     VALUES ($1,$2,$3,$4) ON CONFLICT (github_id) DO UPDATE SET
     github_username = EXCLUDED.github_username, display_name = EXCLUDED.display_name,
     avatar_url = EXCLUDED.avatar_url RETURNING ${publicUserColumns}`,
    [
      String(profile.id),
      profile.username,
      profile.displayName || profile.username,
      profile.photos?.[0]?.value ?? null,
    ],
  );
  return rows[0];
}

export function configureAuth(app, pool, options = {}) {
  const clientOrigin =
    options.clientOrigin ??
    process.env.CLIENT_ORIGIN ??
    "http://127.0.0.1:5173";
  const secret = options.sessionSecret ?? process.env.SESSION_SECRET;
  const clientID = options.clientID ?? process.env.GITHUB_CLIENT_ID;
  const clientSecret = options.clientSecret ?? process.env.GITHUB_CLIENT_SECRET;
  const callbackURL =
    options.callbackURL ??
    process.env.GITHUB_CALLBACK_URL ??
    `${clientOrigin}/auth/callback`;
  const production = process.env.NODE_ENV === "production";
  const passport = new Passport();
  const configured = Boolean(secret && clientID && clientSecret);
  const redirect = (res, path, error) => {
    const target = new URL(safeReturnPath(path), clientOrigin);
    if (error) target.searchParams.set("authError", error);
    res.redirect(target.href);
  };
  if (production) app.set("trust proxy", 1);
  if (secret) {
    const PgStore = connectPgSimple(session);
    const store = new PgStore({
      pool,
      schemaName: options.schemaName,
      tableName: "user_sessions",
      createTableIfMissing: true,
      pruneSessionInterval: production ? 900 : false,
    });
    app.locals.sessionStore = store;
    app.use(
      session({
        name: SESSION_COOKIE,
        secret,
        store,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          sameSite: "lax",
          secure: production,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        },
      }),
    );
    app.use(passport.initialize());
    app.use(passport.session());
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
      try {
        const { rows } = await pool.query(
          `SELECT ${publicUserColumns} FROM users WHERE id = $1`,
          [id],
        );
        done(null, rows[0] ?? false);
      } catch (error) {
        done(error);
      }
    });
  }
  if (configured) {
    const verify = async (_accessToken, _refreshToken, profile, done) => {
      try {
        done(null, await upsertGitHubUser(pool, profile));
      } catch (error) {
        done(error);
      }
    };
    passport.use(
      options.strategyFactory
        ? options.strategyFactory(
            { clientID, clientSecret, callbackURL, state: true },
            verify,
          )
        : new GitHubStrategy(
            { clientID, clientSecret, callbackURL, state: true },
            verify,
          ),
    );
  }
  app.get("/auth/github", (req, res, next) => {
    if (!configured) return redirect(res, req.query.returnTo, "unavailable");
    req.session.returnTo = safeReturnPath(req.query.returnTo);
    passport.authenticate("github")(req, res, next);
  });
  app.get("/auth/callback", (req, res, next) => {
    if (!configured) return redirect(res, "/", "unavailable");
    const returnTo = safeReturnPath(req.session.returnTo);
    delete req.session.returnTo;
    passport.authenticate("github", (error, user) => {
      if (error || !user) return redirect(res, returnTo, "failed");
      req.logIn(user, (loginError) => {
        if (loginError) return next(loginError);
        req.session.save((saveError) =>
          saveError ? next(saveError) : redirect(res, returnTo),
        );
      });
    })(req, res, next);
  });
  app.get("/auth/me", (req, res) =>
    req.user
      ? res.json({ user: req.user })
      : res.status(401).json({ error: "Sign in to continue." }),
  );
  app.post("/auth/logout", (req, res, next) => {
    if (!req.session) return res.sendStatus(204);
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie(SESSION_COOKIE, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: production,
      });
      res.sendStatus(204);
    });
  });
}
