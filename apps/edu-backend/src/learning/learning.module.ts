import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { NotifyModule } from "../notify/notify.module";
import { LearningController } from "./learning.controller";
import { LearningService } from "./learning.service";

/** CatalogModule → CatalogRepository (chapter context); NotifyModule → Telegram nudges. */
@Module({
  imports: [CatalogModule, NotifyModule],
  controllers: [LearningController],
  providers: [LearningService, JwtAuthGuard],
})
export class LearningModule {}
