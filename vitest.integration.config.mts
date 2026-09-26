import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

// Integration tests run against the local embedded Postgres (`npm run db:dev`)
// in a separate `geupji_test` database that is created and migrated on start.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.itest.ts", "scripts/**/*.itest.ts"],
    globalSetup: ["./test/integration-setup.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": root },
  },
});
