import { createPool } from "./db/pool.js";
import { createApp } from "./app.js";
import { migrateMedia } from "./db/migrate.js";
import { cloudStorage, startImageCleanup } from "./media.js";

const pool = createPool();
await migrateMedia(pool);
const media = cloudStorage();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
const app = createApp({ pool, media });
const stopImageCleanup = startImageCleanup(pool, media);
const server = app.listen(port, host, () => {
  console.log(`SkillForge is listening at http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      Promise.resolve(stopImageCleanup())
        .then(() => app.locals.sessionStore?.close())
        .then(() => pool.end())
        .finally(() => process.exit(0));
    });
  });
}
