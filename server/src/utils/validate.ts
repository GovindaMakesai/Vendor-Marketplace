import { z, type ZodType, type ZodTypeDef } from "zod";
import { AppError } from "./AppError";

export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function parseInput<T extends ZodType<unknown, ZodTypeDef, unknown>>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Request validation failed", formatZodError(result.error));
  }
  return result.data;
}
