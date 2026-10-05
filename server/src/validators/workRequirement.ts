import { z } from "zod";
import { limitSchema, optionalQueryString, pageSchema } from "./common";

export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const requirementStatusSchema = z.enum([
  "DRAFT",
  "OPEN",
  "RECOMMENDATIONS_GENERATED",
  "AWARDED",
  "CLOSED",
]);

export const workRequirementBodySchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(4000),
  category: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(120),
  estimatedValue: z.coerce.number().positive().max(1_000_000_000),
  priority: prioritySchema,
  expectedStartDate: z.coerce.date(),
  status: requirementStatusSchema.optional(),
});

export const workRequirementUpdateSchema = workRequirementBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const listRequirementsQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  status: z
    .union([requirementStatusSchema, z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  priority: z
    .union([prioritySchema, z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  category: optionalQueryString,
  location: optionalQueryString,
});

export const recommendationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
});
