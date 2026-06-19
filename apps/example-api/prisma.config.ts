import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 config — connection lives here (not in schema.prisma), used by the CLI
 * (migrate / studio). The app runtime connects via @prisma/adapter-pg instead.
 *
 * AUDIT_MINIMAX item #20: refuse to fall back to localhost. If DATABASE_URL is
 * missing in production (Helm Job), the migration MUST fail loudly at boot.
 */
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  // Никакого фолбэка на localhost: если DATABASE_URL не задан (Helm migration-Job),
  // миграция должна упасть громко и сразу, а не уходить в пустую строку.
  throw new Error("DATABASE_URL is required for Prisma CLI (migrate/studio)");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: databaseUrl,
  },
});
