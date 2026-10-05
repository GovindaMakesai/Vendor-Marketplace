import type { Request, Response } from "express";
import { vendorService } from "../services/vendorService";
import { sendSuccess } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { parseInput } from "../utils/validate";
import { idParamSchema } from "../validators/common";
import { listVendorsQuerySchema, vendorBodySchema, vendorUpdateSchema } from "../validators/vendor";

export const listVendors = asyncHandler(async (req: Request, res: Response) => {
  const query = parseInput(listVendorsQuerySchema, req.query);
  sendSuccess(res, await vendorService.list(query));
});

export const getVendor = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(idParamSchema, req.params);
  sendSuccess(res, await vendorService.getById(params.id));
});

export const createVendor = asyncHandler(async (req: Request, res: Response) => {
  const input = parseInput(vendorBodySchema, req.body);
  sendSuccess(res, await vendorService.create(input), 201);
});

export const updateVendor = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(idParamSchema, req.params);
  const input = parseInput(vendorUpdateSchema, req.body);
  sendSuccess(res, await vendorService.update(params.id, input));
});

export const deleteVendor = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(idParamSchema, req.params);
  await vendorService.remove(params.id);
  sendSuccess(res, { deleted: true });
});
