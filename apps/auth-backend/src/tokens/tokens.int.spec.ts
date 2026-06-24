import type { ConfigService } from "@nestjs/config";
import { createLocalJWKSet, exportPKCS8, generateKeyPair, jwtVerify } from "jose";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Env } from "../config/env.validation";
import { RedisService } from "../redis/redis.service";
import { TokensService } from "./tokens.service";

const SID = "11111111-1111-1111-1111-111111111111";

let container: StartedTestContainer;
let redis: RedisService;
let tokens: TokensService;

function fakeConfig(values: Partial<Record<keyof Env, unknown>>): ConfigService<Env, true> {
  const merged: Record<string, unknown> = {
    JWT_ISSUER: "https://id.outegro.com",
    JWT_AUDIENCE: "outegro",
    ACCESS_TTL: 300,
    REFRESH_TTL: 2_592_000,
    ...values,
  };
  return { get: (key: string) => merged[key] } as unknown as ConfigService<Env, true>;
}

beforeAll(async () => {
  container = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();
  const url = `redis://${container.getHost()}:${container.getMappedPort(6379)}`;
  const { privateKey } = await generateKeyPair("ES256");
  const pem = await exportPKCS8(privateKey);

  const config = fakeConfig({ REDIS_URL: url, JWT_PRIVATE_KEY: pem });
  redis = new RedisService(config);
  tokens = new TokensService(config, redis);
  await tokens.onModuleInit();
}, 180_000);

afterAll(async () => {
  await redis?.quit();
  await container?.stop();
});

describe("TokensService (ES256 + Lua rotation)", () => {
  it("signs an access token verifiable against the JWKS, with the right claims", async () => {
    const jwt = await tokens.signAccessToken({
      userId: "u1",
      sessionId: SID,
      roles: ["itmaxxing:pro"],
    });
    const jwks = createLocalJWKSet(tokens.jwks());
    const { payload } = await jwtVerify(jwt, jwks, {
      issuer: "https://id.outegro.com",
      audience: "outegro",
    });
    expect(payload.sub).toBe("u1");
    expect(payload.sid).toBe(SID);
    expect(payload.roles).toEqual(["itmaxxing:pro"]);
  });

  it("rotates a valid refresh token (OK) and keeps the session alive", async () => {
    const token = await tokens.issueRefresh(SID);
    const rotated = await tokens.rotateRefresh(token);
    expect(rotated.result).toBe("OK");
    expect(rotated.token).toBeDefined();
    expect(rotated.token).not.toBe(token);
    expect(await tokens.isSessionAlive(SID)).toBe(true);
  });

  it("detects reuse of an old token and burns the session", async () => {
    const token = await tokens.issueRefresh(SID);
    const first = await tokens.rotateRefresh(token); // OK → token now stale
    expect(first.result).toBe("OK");

    const reuse = await tokens.rotateRefresh(token); // same old token again
    expect(reuse.result).toBe("REUSE");
    expect(await tokens.isSessionAlive(SID)).toBe(false); // session burned
  });

  it("returns DEAD for a revoked/unknown session", async () => {
    await tokens.issueRefresh(SID);
    await tokens.revokeSession(SID);
    expect(await tokens.isSessionAlive(SID)).toBe(false);

    const rotated = await tokens.rotateRefresh(`${SID}.whatever`);
    expect(rotated.result).toBe("DEAD");
  });
});
