import { defineConfig, devices } from "@playwright/test";

/**
 * AUDIT_MINIMAX #66: e2e should test the prod build, not `pnpm dev`. We
 * prebuild before running tests. Use this in CI:
 *   pnpm --filter @outegro/example-frontend build && pnpm --filter @outegro/example-frontend e2e
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
