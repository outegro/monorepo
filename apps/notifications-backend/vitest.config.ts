import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
    // Integration tests (testcontainers, need docker) run via `test:int`, not the fast unit gate.
    exclude: ["**/node_modules/**", "**/*.int.spec.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
