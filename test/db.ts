import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export const TEST_DATABASE_URL = "postgresql://geupji:geupji@localhost:54329/geupji_test";

export function testPrisma(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: TEST_DATABASE_URL })) });
}

export async function resetDb(db: PrismaClient): Promise<void> {
  await db.$executeRawUnsafe(
    'TRUNCATE "Trade", "Complex", "Edition", "IngestRun", "PendingFetch" RESTART IDENTITY CASCADE',
  );
}
