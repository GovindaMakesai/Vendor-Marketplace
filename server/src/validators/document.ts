import { z } from "zod";
import { calendarDateSchema } from "./calendarDate";

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

const documentFieldsSchema = z.object({
  documentType: documentTypeSchema,
  documentNumber: z.string().trim().min(2).max(80),
  issuedDate: calendarDateSchema,
  expiryDate: calendarDateSchema,
  status: documentStatusSchema.optional(),
  fileName: z.string().trim().max(180).optional(),
  fileUrl: optionalUrl,
  notes: z.string().trim().max(1000).optional(),
});

function expiryOnOrAfterIssued(
  value: { issuedDate?: Date; expiryDate?: Date },
  context: z.RefinementCtx,
) {
  if (value.issuedDate && value.expiryDate && value.expiryDate < value.issuedDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expiryDate"],
      message: "Expiry date must be on or after the issued date",
    });
  }
}

export const documentBodySchema = documentFieldsSchema.superRefine(expiryOnOrAfterIssued);

export const documentUpdateSchema = documentFieldsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  })
  .superRefine(expiryOnOrAfterIssued);
