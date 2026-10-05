import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { isProduction } from "../config/env";
import { AppError } from "../utils/AppError";
import { formatZodError } from "../utils/validate";
import { logger } from "../utils/logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} was not found`,
      details: [],
    },
  });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: formatZodError(error),
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).json({
      success: false,
      error: {
        code: "CONFLICT",
        message: "A record with the same unique value already exists",
        details: [],
      },
    });
    return;
  }

  const syntaxError = error as { type?: string; status?: number };
  if (syntaxError?.type === "entity.parse.failed") {
    res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: "Request body must be valid JSON", details: [] },
    });
    return;
  }

  logger.error("Unhandled request error", error);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      details: isProduction || !(error instanceof Error) ? [] : [error.message],
    },
  });
}
