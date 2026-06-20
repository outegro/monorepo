import { describe, expect, it } from "vitest";
import { envSchema, validate } from "./env.validation";

const VALID = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://app:app@localhost:5432/x",
  REDIS_URL: "redis://localhost:6379",
  RABBITMQ_URL: "amqp://guest:guest@localhost:5672",
  MINIMAX_API_KEY: "sk-test",
};

describe("env.validation", () => {
  it("accepts a full valid env", () => {
    const result = validate(VALID);
    expect(result.NODE_ENV).toBe("test");
    expect(result.DATABASE_URL).toBe(VALID.DATABASE_URL);
  });

  it("rejects missing DATABASE_URL", () => {
    expect(() => validate({})).toThrow(/Invalid environment/);
  });

  it("requires REDIS_URL, RABBITMQ_URL and MINIMAX_API_KEY", () => {
    const { REDIS_URL: _r, ...noRedis } = VALID;
    const { RABBITMQ_URL: _q, ...noRabbit } = VALID;
    const { MINIMAX_API_KEY: _k, ...noKey } = VALID;
    expect(() => validate(noRedis)).toThrow(/Invalid environment/);
    expect(() => validate(noRabbit)).toThrow(/Invalid environment/);
    expect(() => validate(noKey)).toThrow(/Invalid environment/);
  });

  it("defaults port, model, base url and rate-limit", () => {
    const result = envSchema.parse(VALID);
    expect(result.PORT).toBe(3000);
    expect(result.MINIMAX_MODEL).toBe("MiniMax-M3");
    expect(result.MINIMAX_BASE_URL).toBe("https://api.minimax.io/v1");
    expect(result.GENERATE_RATE_LIMIT).toBe(5);
  });
});
