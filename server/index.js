import { createPool } from "./db/pool.js";
import { createApp } from "./app.js";

const pool = createPool();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
const app = createApp({ pool });
const server = app.listen(port, host, () => {
  console.log(`SkillForge is listening at http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      Promise.resolve(app.locals.sessionStore?.close())
        .then(() => pool.end())
        .finally(() => process.exit(0));
    });
  });
}
