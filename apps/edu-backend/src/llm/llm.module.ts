import { Global, Module } from "@nestjs/common";
import { LlmService } from "./llm.service";

/** Global so catalog/learning can inject the LLM client without re-importing. */
@Global()
@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
