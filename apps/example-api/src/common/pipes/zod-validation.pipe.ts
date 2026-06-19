import { type ArgumentMetadata, BadRequestException, type PipeTransform } from "@nestjs/common";
import { type ZodType, z } from "zod";

/**
 * Validate a handler argument against a Zod schema.
 * Usage: @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput
 *
 * Передай любую Zod-схему (определи рядом с хендлером или в отдельном dto-файле).
 */
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Validation failed",
        error: "Bad Request",
        issues: z.treeifyError(result.error),
      });
    }
    return result.data;
  }
}
