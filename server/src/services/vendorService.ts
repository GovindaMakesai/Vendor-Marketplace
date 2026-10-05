import type { Prisma, Vendor } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { toNumber } from "../utils/numbers";
import { rethrowPrisma } from "../utils/prismaErrors";
import type { z } from "zod";
import type { listVendorsQuerySchema, vendorBodySchema, vendorUpdateSchema } from "../validators/vendor";

type VendorInput = z.infer<typeof vendorBodySchema>;
type VendorUpdate = z.infer<typeof vendorUpdateSchema>;
type VendorQuery = z.infer<typeof listVendorsQuerySchema>;

export function serializeVendor(vendor: Vendor) {
  return {
    id: vendor.id,
    name: vendor.name,
    vendorType: vendor.vendorType,
    category: vendor.category,
    description: vendor.description,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address,
    city: vendor.city,
    state: vendor.state,
    country: vendor.country,
    rating: toNumber(vendor.rating),
    status: vendor.status,
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
  };
}

function buildWhere(query: VendorQuery): Prisma.VendorWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { category: { equals: query.category, mode: "insensitive" } } : {}),
    ...(query.vendorType ? { vendorType: { equals: query.vendorType, mode: "insensitive" } } : {}),
    ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
            { city: { contains: query.search, mode: "insensitive" } },
            { category: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export class VendorService {
  async list(query: VendorQuery) {
    const where = buildWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [total, vendors] = await prisma.$transaction([
      prisma.vendor.count({ where }),
      prisma.vendor.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
    ]);

    return {
      items: vendors.map(serializeVendor),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async getById(id: string) {
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new AppError(404, "NOT_FOUND", "Vendor not found");
    return serializeVendor(vendor);
  }

  async create(input: VendorInput) {
    const vendor = await prisma.vendor.create({
      data: {
        ...input,
        rating: input.rating,
      },
    });
    return serializeVendor(vendor);
  }

  async update(id: string, input: VendorUpdate) {
    try {
      const vendor = await prisma.vendor.update({ where: { id }, data: input });
      return serializeVendor(vendor);
    } catch (error) {
      rethrowPrisma(error, "Vendor not found");
    }
  }

  async remove(id: string) {
    try {
      await prisma.vendor.delete({ where: { id } });
    } catch (error) {
      rethrowPrisma(error, "Vendor not found");
    }
  }
}

export const vendorService = new VendorService();
