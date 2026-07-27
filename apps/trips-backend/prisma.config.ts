import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 config — connection lives here (not in schema.prisma), used by the CLI
 * (migrate / studio). The app runtime connects via @prisma/adapter-pg instead.
 *
 * `url` is a lazy getter: `prisma generate` (run by build/CI WITHOUT DATABASE_URL)
 * only needs the schema, so it must not throw at config load. migrate/studio touch
 * `datasource.url` → the getter fires → loud failure if DATABASE_URL is missing.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    get url(): string {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error("DATABASE_URL is required for Prisma CLI (migrate/studio)");
      }
      return databaseUrl;
    },
    /**
     * Only used by `prisma migrate diff --from-migrations`, which replays the migration
     * folder into a throwaway database to work out the delta. Local development concern
     * only — unset in CI and in the cluster, where `migrate deploy` just applies files.
     */
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
