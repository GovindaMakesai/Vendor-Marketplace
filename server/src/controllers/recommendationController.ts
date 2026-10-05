import type { Request, Response } from "express";
import { recommendationService } from "../services/recommendationService";
import { sendSuccess } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { parseInput } from "../utils/validate";
import { idParamSchema } from "../validators/common";
import { recommendationQuerySchema } from "../validators/workRequirement";

export const generateRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(idParamSchema, req.params);
  sendSuccess(res, await recommendationService.generate(params.id), 201);
});

export const listRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(idParamSchema, req.params);
  const query = parseInput(recommendationQuerySchema, req.query);
  sendSuccess(res, await recommendationService.list(params.id, query));
});
