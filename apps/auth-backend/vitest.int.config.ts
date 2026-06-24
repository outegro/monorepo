import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

/**
 * Integration tests (testcontainers: Redis/Postgres/RabbitMQ). Slow + need Docker, so
 * separate from the fast unit gate. SWC transpile emits decorator metadata for Nest DI.
 * Run with `pnpm test:int`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.int.spec.ts"],
    globals: false,
    hookTimeout: 180_000,
    testTimeout: 60_000,
    fileParallelism: false,
  },
  plugins: [
    swc.vite({
      jsc: {
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
