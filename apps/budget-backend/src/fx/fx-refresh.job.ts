import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { FxService } from "./fx.service";

/**
 * Keeps FX rates warm. The cache is stale after 1h; refreshing every 30 min means a user
 * request almost never pays for a cold fetch, and rates stay current. Best-effort — a failed
 * refresh logs and leaves the last good rates in place (FxService falls back to stale/defaults).
 */
@Injectable()
export class FxRefreshJob {
  private readonly logger = new Logger(FxRefreshJob.name);

  constructor(private readonly fx: FxService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async refresh(): Promise<void> {
    try {
      const entry = await this.fx.refresh();
      this.logger.log(`FX refreshed (source: ${entry.source})`);
    } catch (error) {
      this.logger.warn(`scheduled FX refresh failed: ${String(error)}`);
    }
  }
}
