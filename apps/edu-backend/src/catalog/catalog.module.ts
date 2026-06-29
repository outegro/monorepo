import { Module } from "@nestjs/common";
import { AdminGuard } from "../common/admin.guard";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { CatalogController } from "./catalog.controller";
import { CatalogRepository } from "./catalog.repository";
import { CatalogService } from "./catalog.service";

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository, JwtAuthGuard, AdminGuard],
  exports: [CatalogRepository],
})
export class CatalogModule {}
