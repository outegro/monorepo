import { Module } from "@nestjs/common";
import { LiveModule } from "../live/live.module";
import { MessagingModule } from "../messaging/rabbitmq.module";
import { BudgetController } from "./budget.controller";
import { BudgetService } from "./budget.service";
import { BudgetNotifyPublisher } from "./budget-notify.publisher";

@Module({
  imports: [LiveModule, MessagingModule],
  controllers: [BudgetController],
  providers: [BudgetService, BudgetNotifyPublisher],
})
export class BudgetModule {}
