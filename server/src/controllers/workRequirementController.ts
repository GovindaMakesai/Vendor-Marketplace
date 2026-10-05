import type { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { workRequirementService } from "../services/workRequirementService";
import { sendSuccess } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { parseInput } from "../utils/validate";
import { idParamSchema } from "../validators/common";
import {
  listRequirementsQuerySchema,
  workRequirementBodySchema,
  workRequirementUpdateSchema,
} from "../validators/workRequirement";

export const listRequirements = asyncHandler(async (req: Request, res: Response) => {
  const query = parseInput(listRequirementsQuerySchema, req.query);
  sendSuccess(res, await workRequirementService.list(query));
});

export const getRequirement = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(idParamSchema, req.params);
  sendSuccess(res, await workRequirementService.getById(params.id));
});

export const createRequirement = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  const input = parseInput(workRequirementBodySchema, req.body);
  sendSuccess(res, await workRequirementService.create(req.user.id, input), 201);
});

export const updateRequirement = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(idParamSchema, req.params);
  const input = parseInput(workRequirementUpdateSchema, req.body);
  sendSuccess(res, await workRequirementService.update(params.id, input));
});

export const deleteRequirement = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(idParamSchema, req.params);
  await workRequirementService.remove(params.id);
  sendSuccess(res, { deleted: true });
});
