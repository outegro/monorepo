import { execFileSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RabbitMQContainer, type StartedRabbitMQContainer } from "@testcontainers/rabbitmq";
import { createLocalJWKSet, jwtVerify } from "jose";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../prisma/prisma.service";
import { TokensService } from "../tokens/tokens.service";
import { AuthService } from "./auth.service";

/**
 * Full login flow against real Postgres + Redis + RabbitMQ (testcontainers): request →
 * read the code from the outbox → verify → JWKS-verify the access token → rotate → prove
 * old-token reuse burns the session. Exercises the wiring the mock unit tests cannot:
 * the transactional outbox, Lua rotation, and JWKS round-trip.
 */
let pg: StartedPostgreSqlContainer;
let redis: StartedTestContainer;
let rabbit: StartedRabbitMQContainer;
let app: INestApplication;
let prisma: PrismaService;
let auth: AuthService;
let tokens: TokensService;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const EMAIL = "flow@example.com";

/** Pull the plaintext login code out of the outbox event we just enqueued. */
async function readLatestCode(): Promise<string> {
  const row = await prisma.outboxEvent.findFirst({
    where: { routingKey: "notify.requested" },
    orderBy: { occurredAt: "desc" },
  });
  const payload = row?.payload as { data?: { template?: string; data?: { code?: string } } };
  if (payload?.data?.template !== "login_code" || !payload.data.data?.code) {
    throw new Error("login code not found in outbox");
  }
  return payload.data.data.code;
}

beforeAll(async () => {
  pg = await new PostgreSqlContainer("postgres:18-alpine").withDatabase("auth").start();
  redis = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).start();
  rabbit = await new RabbitMQContainer("rabbitmq:4-management-alpine").start();

  const databaseUrl = pg.getConnectionUri();
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = databaseUrl;
  process.env.REDIS_URL = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
  process.env.RABBITMQ_URL = rabbit.getAmqpUrl();
  process.env.JWT_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  execFileSync("node_modules/.bin/prisma", ["migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  // Import AppModule AFTER env is set — ConfigModule.forRoot() validates at module
  // evaluation time, so a static top-level import would run before these env vars exist.
  const { AppModule } = await import("../app.module.js");
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
  prisma = app.get(PrismaService);
  auth = app.get(AuthService);
  tokens = app.get(TokensService);
  await sleep(1000); // let AMQP assert exchanges
}, 180_000);

afterAll(async () => {
  await app?.close();
  await rabbit?.stop();
  await redis?.stop();
  await pg?.stop();
});

describe("auth integration (email-code login flow)", () => {
  it("requests a code, creates the user, and enqueues outbox events", async () => {
    await auth.requestCode(EMAIL);

    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    expect(user).not.toBeNull();

    const events = await prisma.outboxEvent.findMany();
    const keys = events.map((e) => e.routingKey).sort();
    expect(keys).toContain("auth.user.created");
    expect(keys).toContain("notify.requested");
  });

  it("verifies the code and issues a JWKS-verifiable access token + live session", async () => {
    const code = await readLatestCode();
    const result = await auth.verifyCode(EMAIL, code, { ip: "1.2.3.4", country: "PL" });

    const jwks = createLocalJWKSet(tokens.jwks());
    const { payload } = await jwtVerify(result.accessToken, jwks, {
      issuer: "https://id.outegro.com",
      audience: "outegro",
    });
    expect(payload.sid).toBe(result.sessionId);
    expect(await tokens.isSessionAlive(result.sessionId)).toBe(true);

    // The user is now email-verified and has exactly one active session.
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    expect(user?.emailVerified).toBe(true);
  });

  it("rotates the refresh token and burns the session on reuse of the old one", async () => {
    await auth.requestCode(EMAIL);
    const code = await readLatestCode();
    const first = await auth.verifyCode(EMAIL, code, {});

    const rotated = await auth.refresh(first.refreshToken, {});
    expect(rotated.refreshToken).not.toBe(first.refreshToken);
    expect(rotated.sessionId).toBe(first.sessionId);

    // Replaying the now-stale token is reuse → 401 and the session is killed.
    await expect(auth.refresh(first.refreshToken, {})).rejects.toThrow();
    expect(await tokens.isSessionAlive(first.sessionId)).toBe(false);
  });

  it("drains the outbox to RabbitMQ (publishedAt set)", async () => {
    const deadline = Date.now() + 15_000;
    let pending = 1;
    while (Date.now() < deadline) {
      pending = await prisma.outboxEvent.count({ where: { publishedAt: null } });
      if (pending === 0) {
        break;
      }
      await sleep(500);
    }
    expect(pending).toBe(0);
  });
});
