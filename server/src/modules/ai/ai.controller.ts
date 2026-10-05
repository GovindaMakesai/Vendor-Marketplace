import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { parseInput } from "../../utils/validate";
import { idParamSchema } from "../../validators/common";
import { aiExplanationService } from "./ai.service";

export const createAiSummary = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(idParamSchema, req.params);
  sendSuccess(res, await aiExplanationService.summarizeRequirement(params.id));
});
