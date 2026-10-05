import type { Request, Response } from "express";
import { authService } from "../services/authService";
import { sendSuccess } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { parseInput } from "../utils/validate";
import { loginSchema, registerSchema } from "../validators/auth";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = parseInput(registerSchema, req.body);
  const result = await authService.register(input);
  sendSuccess(res, result, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = parseInput(loginSchema, req.body);
  const result = await authService.login(input);
  sendSuccess(res, result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, { user: req.user });
});
