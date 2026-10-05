import type { Request, Response } from "express";
import { dashboardService } from "../services/dashboardService";
import { sendSuccess } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await dashboardService.stats());
});
