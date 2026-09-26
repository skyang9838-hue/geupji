import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct connection; runtime queries go through the
    // pooled DATABASE_URL via the pg driver adapter (lib/db.ts).
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
