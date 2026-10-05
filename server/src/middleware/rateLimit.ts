import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";

function skipRateLimit(_req: Request, _res: Response, next: NextFunction) {
  next();
}

export const authRateLimit = env.NODE_ENV === "test" ? skipRateLimit : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many authentication attempts. Try again later.",
      details: [],
    },
  },
});
