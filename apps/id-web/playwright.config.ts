import { defineConfig, devices } from "@playwright/test";

/**
 * e2e runs against the prod build, not `next dev`. Prebuild first:
 *   pnpm --filter @outegro/id-web build && pnpm --filter @outegro/id-web e2e
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
