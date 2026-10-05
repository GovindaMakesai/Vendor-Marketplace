import { Prisma } from "@prisma/client";
import { AppError } from "./AppError";

export function rethrowPrisma(error: unknown, notFoundMessage: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      throw new AppError(404, "NOT_FOUND", notFoundMessage);
    }
    if (error.code === "P2002") {
      throw new AppError(409, "CONFLICT", "A record with the same unique value already exists");
    }
    if (error.code === "P2003") {
      throw new AppError(400, "BAD_REQUEST", "The request references a record that does not exist");
    }
  }
  throw error;
}
