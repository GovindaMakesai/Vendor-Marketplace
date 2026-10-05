import { prisma } from "../lib/prisma";
import { createAiSummary } from "../ai/aiSummaryService";
import type { SummaryVendor } from "../ai/fallbackSummary";
import { AppError } from "../utils/AppError";
import { stringArray, toNumber } from "../utils/numbers";

export class AiSummaryQueryService {
  async summarize(workRequirementId: string) {
    const requirement = await prisma.workRequirement.findUnique({ where: { id: workRequirementId } });
    if (!requirement) throw new AppError(404, "NOT_FOUND", "Work requirement not found");

    const records = await prisma.recommendation.findMany({
      where: { workRequirementId },
      include: { vendor: true },
      orderBy: { rank: "asc" },
    });

    if (records.length === 0) {
      throw new AppError(400, "BAD_REQUEST", "Generate recommendations before requesting a summary");
    }

    const recommendations: SummaryVendor[] = records.map((record) => ({
      name: record.vendor.name,
      category: record.vendor.category,
      city: record.vendor.city,
      state: record.vendor.state,
      rating: toNumber(record.vendor.rating),
      score: toNumber(record.score),
      rank: record.rank,
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
    }));

    return createAiSummary({
      requirement: {
        title: requirement.title,
        category: requirement.category,
        location: requirement.location,
        priority: requirement.priority,
        estimatedValue: toNumber(requirement.estimatedValue),
      },
      recommendations,
    });
  }
}

export const aiSummaryQueryService = new AiSummaryQueryService();
