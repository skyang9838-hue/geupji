/**
 * Local development Postgres (embedded, no Docker, no cloud).
 * Keeps running until Ctrl+C. Data lives in ./.pgdata (gitignored).
 *
 *   npm run db:dev
 *
 * The production database is Neon; its URL never goes in .env.local.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(".pgdata");
const PORT = 54329;

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "geupji",
  password: "geupji",
  port: PORT,
  persistent: true,
});

async function main() {
  const fresh = !existsSync(path.join(DATA_DIR, "PG_VERSION"));
  if (fresh) await pg.initialise();
  await pg.start();
  if (fresh) await pg.createDatabase("geupji");
  console.log(`dev postgres ready on postgresql://geupji:geupji@localhost:${PORT}/geupji`);

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch(async (error) => {
  console.error(error);
  await pg.stop().catch(() => {});
  process.exit(1);
});
