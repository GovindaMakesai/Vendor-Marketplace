import { z } from "zod";

export const documentTypeSchema = z.enum([
  "TAX_REGISTRATION",
  "INSURANCE",
  "TRADE_LICENSE",
  "SAFETY_CERTIFICATE",
  "AGREEMENT",
  "OTHER",
]);

export const documentStatusSchema = z.enum(["VALID", "EXPIRED", "PENDING", "REJECTED"]);

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .refine((value) => value === undefined || value.length === 0 || z.string().url().safeParse(value).success, {
    message: "File URL must be a valid URL",
  });

export const documentBodySchema = z.object({
  documentType: documentTypeSchema,
  documentNumber: z.string().trim().min(2).max(80),
  issuedDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  status: documentStatusSchema.optional(),
  fileName: z.string().trim().max(180).optional(),
  fileUrl: optionalUrl,
  notes: z.string().trim().max(1000).optional(),
});

export const documentUpdateSchema = documentBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});
