import type { Prisma, Vendor, VendorDocument } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { rankVendors } from "./scoring";
import type { RankedVendor, ScoreVendor } from "../types/scoring";
import { AppError } from "../utils/AppError";
import { stringArray, toNumber } from "../utils/numbers";

const recommendationInclude = {
  vendor: true,
} satisfies Prisma.RecommendationInclude;

type StoredRecommendation = Prisma.RecommendationGetPayload<{ include: typeof recommendationInclude }>;

function toScoreVendor(vendor: Vendor & { documents: VendorDocument[] }): ScoreVendor {
  return {
    id: vendor.id,
    name: vendor.name,
    category: vendor.category,
    city: vendor.city,
    state: vendor.state,
    rating: toNumber(vendor.rating),
    status: vendor.status,
    documents: vendor.documents.map((document) => ({
      documentType: document.documentType,
      documentNumber: document.documentNumber,
      expiryDate: document.expiryDate,
      status: document.status,
    })),
  };
}

export function serializeRecommendation(record: StoredRecommendation) {
  return {
    id: record.id,
    workRequirementId: record.workRequirementId,
    rank: record.rank,
    score: toNumber(record.score),
    recommendationLevel: record.recommendationLevel,
    breakdown: {
      category: toNumber(record.categoryScore),
      location: toNumber(record.locationScore),
      rating: toNumber(record.ratingScore),
      compliance: toNumber(record.complianceScore),
      status: toNumber(record.statusScore),
    },
    reasons: stringArray(record.reasons),
    warnings: stringArray(record.warnings),
    generatedAt: record.generatedAt,
    vendor: {
      id: record.vendor.id,
      name: record.vendor.name,
      vendorType: record.vendor.vendorType,
      category: record.vendor.category,
      city: record.vendor.city,
      state: record.vendor.state,
      country: record.vendor.country,
      rating: toNumber(record.vendor.rating),
      status: record.vendor.status,
    },
  };
}

export class RecommendationService {
  rank(requirement: { category: string; location: string }, vendors: ScoreVendor[], now = new Date()): RankedVendor[] {
    return rankVendors(requirement, vendors, now);
  }

  async generate(workRequirementId: string) {
    const requirement = await prisma.workRequirement.findUnique({ where: { id: workRequirementId } });
    if (!requirement) {
      throw new AppError(404, "NOT_FOUND", "Work requirement not found");
    }
    if (requirement.status === "AWARDED" || requirement.status === "CLOSED") {
      throw new AppError(409, "CONFLICT", "Recommendations cannot be regenerated for awarded or closed requirements");
    }

    const vendors = await prisma.vendor.findMany({ include: { documents: true }, orderBy: { name: "asc" } });
    const ranked = this.rank(
      { category: requirement.category, location: requirement.location },
      vendors.map(toScoreVendor),
    );

    await prisma.$transaction(async (tx) => {
      await tx.recommendation.deleteMany({ where: { workRequirementId } });
      if (ranked.length > 0) {
        await tx.recommendation.createMany({
          data: ranked.map((row) => ({
            workRequirementId,
            vendorId: row.vendorId,
            score: row.score,
            rank: row.rank,
            recommendationLevel: row.recommendationLevel,
            categoryScore: row.breakdown.category,
            locationScore: row.breakdown.location,
            ratingScore: row.breakdown.rating,
            complianceScore: row.breakdown.compliance,
            statusScore: row.breakdown.status,
            reasons: row.reasons,
            warnings: row.warnings,
          })),
        });
      }
      await tx.workRequirement.update({
        where: { id: workRequirementId },
        data: { status: "RECOMMENDATIONS_GENERATED" },
      });
    });

    return this.list(workRequirementId, {});
  }

  async list(workRequirementId: string, query: { limit?: number; minScore?: number }) {
    const requirement = await prisma.workRequirement.findUnique({ where: { id: workRequirementId } });
    if (!requirement) {
      throw new AppError(404, "NOT_FOUND", "Work requirement not found");
    }

    const records = await prisma.recommendation.findMany({
      where: {
        workRequirementId,
        ...(query.minScore !== undefined ? { score: { gte: query.minScore } } : {}),
      },
      include: recommendationInclude,
      orderBy: { rank: "asc" },
      ...(query.limit !== undefined ? { take: query.limit } : {}),
    });

    return {
      workRequirementId,
      count: records.length,
      recommendations: records.map(serializeRecommendation),
    };
  }
}

export const recommendationService = new RecommendationService();
