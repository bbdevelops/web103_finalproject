import { createPool } from "./db/pool.js";
import { createApp } from "./app.js";

const pool = createPool();
const port = Number(process.env.PORT ?? 3001);
const server = createApp({ pool }).listen(port, "127.0.0.1", () => {
  console.log(`SkillForge API is running at http://localhost:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  });
}
