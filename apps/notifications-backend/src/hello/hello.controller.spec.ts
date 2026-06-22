import { describe, expect, it } from "vitest";
import { HelloController } from "./hello.controller";

describe("HelloController", () => {
  it("returns a hello payload", () => {
    const res = new HelloController().hello();
    expect(res.status).toBe("ok");
    expect(res.service).toBe("notifications-backend");
    expect(res.message).toContain("notifications-backend");
  });
});
