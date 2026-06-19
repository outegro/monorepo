import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/** Global: PrismaService is injected by both health and feature modules. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
