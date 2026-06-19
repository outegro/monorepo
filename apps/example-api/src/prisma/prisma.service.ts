import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Env } from "../config/env.validation";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Prisma 7 + @prisma/adapter-pg. Prisma 7 dropped the Rust query engine, so we
 * bring our own driver (node-postgres).
 *
 * AUDIT_MINIMAX item #75: pool size is bounded explicitly. Default pg pool is
 * 10 — on 6 backends × 2 replicas that's 120 connections, CNPG's default
 * max_connections is 100. Set max=5 to stay safe; tune if needed.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get("DATABASE_URL", { infer: true }),
        max: 5,
        idleTimeoutMillis: 30_000,
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
