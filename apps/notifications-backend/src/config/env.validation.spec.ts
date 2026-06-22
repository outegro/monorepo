import { describe, expect, it } from "vitest";
import { envSchema, validate } from "./env.validation";

const VALID = { NODE_ENV: "test", DATABASE_URL: "postgresql://u:p@localhost:5432/x" };

describe("env.validation", () => {
  it("accepts a valid env and defaults PORT", () => {
    const env = envSchema.parse(VALID);
    expect(env.NODE_ENV).toBe("test");
    expect(env.PORT).toBe(3000);
  });

  it("rejects a missing DATABASE_URL", () => {
    expect(() => validate({ NODE_ENV: "test" })).toThrow(/Invalid environment/);
  });
});
