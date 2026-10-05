import { z } from "zod";
import { limitSchema, optionalQueryString, pageSchema } from "./common";

export const vendorStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);

export const vendorBodySchema = z.object({
  name: z.string().trim().min(2).max(160),
  vendorType: z.string().trim().min(2).max(80),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(2000),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().min(6).max(40),
  address: z.string().trim().min(3).max(240),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  rating: z.coerce.number().min(0).max(5),
  status: vendorStatusSchema.default("ACTIVE"),
});

export const vendorUpdateSchema = vendorBodySchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

export const listVendorsQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
  search: optionalQueryString,
  category: optionalQueryString,
  vendorType: optionalQueryString,
  status: z
    .union([vendorStatusSchema, z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  city: optionalQueryString,
  sortBy: z.enum(["name", "rating", "createdAt", "city", "category"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});
