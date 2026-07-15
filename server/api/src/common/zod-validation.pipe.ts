import { BadRequestException, PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

/**
 * Validates a body against a Zod schema from @invoixe/types.
 *
 * We stay on Zod rather than class-validator because those schemas are shared
 * with the web client (react-hook-form resolvers); duplicating them as DTO
 * classes would let client and server validation drift apart.
 *
 * The 400 body matches the Express routes exactly.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({ error: "validation_failed", details: parsed.error.flatten() });
    }
    return parsed.data;
  }
}
