import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

/**
 * Integration tests (testcontainers: Postgres + RabbitMQ). Slow + require Docker, so
 * they're separate from the fast unit gate. Run with `pnpm test:int`.
 *
 * These boot the real Nest DI container, which needs emitted decorator metadata —
 * esbuild (vitest's default) doesn't produce it, so transpile via SWC with
 * decoratorMetadata. react.runtime=automatic handles the react-email .tsx templates.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.int.spec.ts"],
    globals: false,
    hookTimeout: 180_000,
    testTimeout: 60_000,
    // Containers + a single Nest app are shared across the file — run serially.
    fileParallelism: false,
  },
  plugins: [
    swc.vite({
      jsc: {
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
          react: { runtime: "automatic" },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
