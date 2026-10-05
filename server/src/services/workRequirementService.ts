import type { Prisma, WorkRequirement } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { toNumber } from "../utils/numbers";
import { rethrowPrisma } from "../utils/prismaErrors";
import type {
  listRequirementsQuerySchema,
  workRequirementBodySchema,
  workRequirementUpdateSchema,
} from "../validators/workRequirement";

type RequirementInput = z.infer<typeof workRequirementBodySchema>;
type RequirementUpdate = z.infer<typeof workRequirementUpdateSchema>;
type RequirementQuery = z.infer<typeof listRequirementsQuerySchema>;

export function serializeRequirement(requirement: WorkRequirement) {
  return {
    id: requirement.id,
    title: requirement.title,
    description: requirement.description,
    category: requirement.category,
    location: requirement.location,
    estimatedValue: toNumber(requirement.estimatedValue),
    priority: requirement.priority,
    expectedStartDate: requirement.expectedStartDate,
    status: requirement.status,
    createdById: requirement.createdById,
    createdAt: requirement.createdAt,
    updatedAt: requirement.updatedAt,
  };
}

export class WorkRequirementService {
  async list(query: RequirementQuery) {
    const where: Prisma.WorkRequirementWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.category ? { category: { equals: query.category, mode: "insensitive" } } : {}),
      ...(query.location ? { location: { contains: query.location, mode: "insensitive" } } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [total, items] = await prisma.$transaction([
      prisma.workRequirement.count({ where }),
      prisma.workRequirement.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      items: items.map(serializeRequirement),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async getById(id: string) {
    const requirement = await prisma.workRequirement.findUnique({ where: { id } });
    if (!requirement) throw new AppError(404, "NOT_FOUND", "Work requirement not found");
    return serializeRequirement(requirement);
  }

  async create(createdById: string, input: RequirementInput) {
    const requirement = await prisma.workRequirement.create({
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        location: input.location,
        estimatedValue: input.estimatedValue,
        priority: input.priority,
        expectedStartDate: input.expectedStartDate,
        status: input.status ?? "OPEN",
        createdById,
      },
    });
    return serializeRequirement(requirement);
  }

  async update(id: string, input: RequirementUpdate) {
    try {
      const requirement = await prisma.workRequirement.update({ where: { id }, data: input });
      return serializeRequirement(requirement);
    } catch (error) {
      rethrowPrisma(error, "Work requirement not found");
    }
  }

  async remove(id: string) {
    try {
      await prisma.workRequirement.delete({ where: { id } });
    } catch (error) {
      rethrowPrisma(error, "Work requirement not found");
    }
  }
}

export const workRequirementService = new WorkRequirementService();
