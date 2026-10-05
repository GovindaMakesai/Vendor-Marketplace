import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const vendorIdParamSchema = z.object({
  vendorId: z.string().min(1),
});

export const vendorDocumentParamSchema = z.object({
  vendorId: z.string().min(1),
  documentId: z.string().min(1),
});

export const optionalQueryString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const pageSchema = z.coerce.number().int().positive().default(1);
export const limitSchema = z.coerce.number().int().positive().max(100).default(10);
