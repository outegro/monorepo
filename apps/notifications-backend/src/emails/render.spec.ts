import { describe, expect, it } from "vitest";
import { renderNotification } from "./render";

describe("renderNotification", () => {
  it("renders the login code (ru) into subject + html + text", async () => {
    const msg = await renderNotification("login_code", "ru", { code: "123456" });
    expect(msg).not.toBeNull();
    expect(msg?.subject).toBe("Код входа в Outegro");
    expect(msg?.html).toContain("123456");
    expect(msg?.text).toContain("123456");
  });

  it("localizes the subject (en)", async () => {
    const msg = await renderNotification("login_code", "en", { code: "000000" });
    expect(msg?.subject).toBe("Your Outegro sign-in code");
  });

  it("uses the fallback message for an empty security_alert", async () => {
    const msg = await renderNotification("security_alert", "ru", {});
    expect(msg?.html).toContain("Зафиксирована новая активность");
  });

  it("returns null for an unknown template", async () => {
    // @ts-expect-error — exercising the runtime guard for an off-contract template
    const msg = await renderNotification("nope", "ru", {});
    expect(msg).toBeNull();
  });
});
