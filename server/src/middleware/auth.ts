import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";

type TokenPayload = {
  sub?: string;
};

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    const token = header.slice("Bearer ".length).trim();
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    if (!payload.sub) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }
}
