import { describe, expect, it } from "vitest";
import { envSchema, validate } from "./env.validation";

describe("env.validation", () => {
  it("defaults NODE_ENV and PORT", () => {
    const env = envSchema.parse({});
    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
  });

  it("returns the validated env", () => {
    expect(validate({ NODE_ENV: "test" }).NODE_ENV).toBe("test");
  });
});
