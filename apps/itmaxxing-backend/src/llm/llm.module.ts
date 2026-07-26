import { Global, Module } from "@nestjs/common";
import { LlmService } from "./llm.service";

/** Global: the LLM client is a shared, stateless provider used across feature modules. */
@Global()
@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
