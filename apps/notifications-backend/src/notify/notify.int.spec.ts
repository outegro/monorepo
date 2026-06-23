import { execFileSync } from "node:child_process";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Exchanges, makeEvent, NotifyTopology, RoutingKeys } from "@outegro/contracts";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RabbitMQContainer, type StartedRabbitMQContainer } from "@testcontainers/rabbitmq";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Middle of the test pyramid: the real consumer against real Postgres + RabbitMQ
 * (testcontainers). Proves the wiring unit tests can't: events flow broker → consumer
 * → DB, idempotency holds across redelivery, and poisoned messages retain in the DLQ.
 */
let pg: StartedPostgreSqlContainer;
let rabbit: StartedRabbitMQContainer;
let app: INestApplication;
let prisma: PrismaService;
let amqp: AmqpConnection;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDeliveryRows(eventId: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await prisma.deliveryLog.findMany({ where: { eventId } });
    if (rows.length > 0) {
      return rows;
    }
    await sleep(250);
  }
  return [];
}

async function dlqDepth(): Promise<number> {
  const q = await amqp.channel.checkQueue(NotifyTopology.deadLetterQueue);
  return q.messageCount;
}

beforeAll(async () => {
  pg = await new PostgreSqlContainer("postgres:18-alpine").withDatabase("notifications").start();
  rabbit = await new RabbitMQContainer("rabbitmq:4-management-alpine").start();

  const databaseUrl = pg.getConnectionUri();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = databaseUrl;
  process.env.RABBITMQ_URL = rabbit.getAmqpUrl();

  // Apply the real migration to the throwaway DB (also validates the migration SQL).
  execFileSync("node_modules/.bin/prisma", ["migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
  prisma = app.get(PrismaService);
  amqp = app.get(AmqpConnection);

  // Let golevelup finish asserting queues/bindings before publishing.
  await sleep(1500);
}, 180_000);

afterAll(async () => {
  await app?.close();
  await rabbit?.stop();
  await pg?.stop();
});

describe("notifications integration (consumer + DLQ)", () => {
  it("delivers a valid event and records it as sent, idempotently", async () => {
    const event = makeEvent(RoutingKeys.NotifyRequested, 1, {
      userId: "u-int",
      template: "login_code",
      channels: ["email"],
      to: { email: "int@example.com" },
      locale: "ru",
      data: { code: "999000" },
    });

    await amqp.publish(Exchanges.Notify, RoutingKeys.NotifyRequested, event);
    const rows = await waitForDeliveryRows(event.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("sent");
    expect(rows[0]?.channel).toBe("email");

    // Redeliver the same event id → still exactly one row (idempotent).
    await amqp.publish(Exchanges.Notify, RoutingKeys.NotifyRequested, event);
    await sleep(1500);
    const again = await prisma.deliveryLog.findMany({ where: { eventId: event.id } });
    expect(again).toHaveLength(1);
  });

  it("dead-letters a poisoned message and retains it in the DLQ", async () => {
    const before = await dlqDepth();
    await amqp.publish(Exchanges.Notify, RoutingKeys.NotifyRequested, { not: "an event" });

    const deadline = Date.now() + 15_000;
    let after = before;
    while (Date.now() < deadline) {
      after = await dlqDepth();
      if (after > before) {
        break;
      }
      await sleep(250);
    }
    expect(after).toBeGreaterThan(before);
  });
});
