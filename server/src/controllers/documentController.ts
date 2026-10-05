import type { Request, Response } from "express";
import { documentService } from "../services/documentService";
import { sendSuccess } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { parseInput } from "../utils/validate";
import { vendorDocumentParamSchema, vendorIdParamSchema } from "../validators/common";
import { documentBodySchema, documentUpdateSchema } from "../validators/document";

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(vendorIdParamSchema, req.params);
  sendSuccess(res, await documentService.list(params.vendorId));
});

export const getDocument = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(vendorDocumentParamSchema, req.params);
  sendSuccess(res, await documentService.getById(params.vendorId, params.documentId));
});

export const createDocument = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(vendorIdParamSchema, req.params);
  const input = parseInput(documentBodySchema, req.body);
  sendSuccess(res, await documentService.create(params.vendorId, input), 201);
});

export const updateDocument = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(vendorDocumentParamSchema, req.params);
  const input = parseInput(documentUpdateSchema, req.body);
  sendSuccess(res, await documentService.update(params.vendorId, params.documentId, input));
});

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  const params = parseInput(vendorDocumentParamSchema, req.params);
  await documentService.remove(params.vendorId, params.documentId);
  sendSuccess(res, { deleted: true });
});
