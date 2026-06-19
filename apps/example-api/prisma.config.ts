import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 config — connection lives here (not in schema.prisma), used by the CLI
 * (migrate / studio). The app runtime connects via @prisma/adapter-pg instead.
 *
 * AUDIT_MINIMAX item #20: refuse to fall back to localhost. If DATABASE_URL is
 * missing where a connection is actually needed (Helm migration-Job), fail loudly.
 *
 * `url` is a lazy getter: `prisma generate` (run by typecheck/build and by CI
 * WITHOUT DATABASE_URL) only needs the schema, so it must not throw at config
 * load. migrate/studio touch `datasource.url` → the getter fires → loud failure.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    get url(): string {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        // Никакого фолбэка на localhost: если DATABASE_URL не задан (Helm
        // migration-Job), миграция должна упасть громко, а не уйти в пустую строку.
        throw new Error("DATABASE_URL is required for Prisma CLI (migrate/studio)");
      }
      return databaseUrl;
    },
  },
});
