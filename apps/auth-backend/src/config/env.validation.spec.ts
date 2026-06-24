import { describe, expect, it } from "vitest";
import { envSchema, validate } from "./env.validation";

const VALID = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://u:p@localhost:5432/x",
  JWT_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----",
};

describe("env.validation", () => {
  it("accepts a valid env and defaults PORT + token TTLs", () => {
    const env = envSchema.parse(VALID);
    expect(env.NODE_ENV).toBe("test");
    expect(env.PORT).toBe(3000);
    expect(env.ACCESS_TTL).toBe(300);
    expect(env.REFRESH_COOKIE).toBe("outegro_refresh");
  });

  it("rejects a missing DATABASE_URL", () => {
    expect(() => validate({ NODE_ENV: "test", JWT_PRIVATE_KEY: "x" })).toThrow(
      /Invalid environment/,
    );
  });

  it("rejects a missing JWT_PRIVATE_KEY", () => {
    expect(() => validate({ NODE_ENV: "test", DATABASE_URL: "postgresql://u:p@h:5432/x" })).toThrow(
      /Invalid environment/,
    );
  });
});
