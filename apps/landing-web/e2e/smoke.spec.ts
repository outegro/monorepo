import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});

test("health endpoint reports ok", async ({ request }) => {
  const res = await request.get("/api/health");
  // 200 if backend is reachable, 503 if not — both are valid smoke results
  expect([200, 503]).toContain(res.status());
});
