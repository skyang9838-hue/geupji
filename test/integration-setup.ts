import { execSync } from "node:child_process";
import { Client } from "pg";
import { TEST_DATABASE_URL } from "./db";

export default async function setup() {
  const admin = new Client({ connectionString: "postgresql://geupji:geupji@localhost:54329/postgres" });
  await admin.connect();
  const exists = await admin.query("select 1 from pg_database where datname = 'geupji_test'");
  if (exists.rowCount === 0) await admin.query("create database geupji_test");
  await admin.end();

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DATABASE_URL_UNPOOLED: TEST_DATABASE_URL },
    stdio: "pipe",
  });
}
