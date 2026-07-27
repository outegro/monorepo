import { Global, Module } from "@nestjs/common";
import { TokenVerifierService } from "./token-verifier.service";

/** Global providers shared across feature modules (access-token verification). */
@Global()
@Module({
  providers: [TokenVerifierService],
  exports: [TokenVerifierService],
})
export class CommonModule {}
