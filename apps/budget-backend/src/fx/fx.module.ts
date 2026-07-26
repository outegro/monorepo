import { Global, Module } from "@nestjs/common";
import { FxService } from "./fx.service";
import { FxRefreshJob } from "./fx-refresh.job";

/** Global: FX rates are shared, read-only system data used by every month calc. */
@Global()
@Module({
  providers: [FxService, FxRefreshJob],
  exports: [FxService],
})
export class FxModule {}
