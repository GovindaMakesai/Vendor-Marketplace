import { prisma } from "../lib/prisma";
import { startOfUtcDay } from "../utils/dates";
import { round2, toNumber } from "../utils/numbers";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const VENDOR_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
const REQUIREMENT_STATUSES = ["DRAFT", "OPEN", "RECOMMENDATIONS_GENERATED", "AWARDED", "CLOSED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const DOCUMENT_STATUSES = ["VALID", "EXPIRED", "PENDING", "REJECTED"] as const;

function series(rows: Array<{ label: string; count: number }>, order: readonly string[]) {
  const counts = new Map(rows.map((row) => [row.label, row.count]));
  return order.map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

export class DashboardService {
  async stats() {
    const today = startOfUtcDay();
    const horizon = new Date(today.getTime() + THIRTY_DAYS_MS);

    const [
      totalVendors,
      activeVendors,
      inactiveVendors,
      suspendedVendors,
      openRequirements,
      recommendationsGenerated,
      expiringDocuments,
      ratingAggregate,
      recentRequirements,
      topRecommendations,
    ] = await prisma.$transaction([
      prisma.vendor.count(),
      prisma.vendor.count({ where: { status: "ACTIVE" } }),
      prisma.vendor.count({ where: { status: "INACTIVE" } }),
      prisma.vendor.count({ where: { status: "SUSPENDED" } }),
      prisma.workRequirement.count({ where: { status: "OPEN" } }),
      prisma.workRequirement.count({ where: { status: "RECOMMENDATIONS_GENERATED" } }),
      prisma.vendorDocument.count({
        where: {
          expiryDate: { gte: today, lte: horizon },
          status: { not: "REJECTED" },
        },
      }),
      prisma.vendor.aggregate({ _avg: { rating: true } }),
      prisma.workRequirement.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          location: true,
          priority: true,
          status: true,
          estimatedValue: true,
          createdAt: true,
        },
      }),
      prisma.recommendation.findMany({
        where: { rank: 1 },
        orderBy: { score: "desc" },
        take: 5,
        include: {
          vendor: { select: { id: true, name: true, category: true, city: true, rating: true } },
          workRequirement: { select: { id: true, title: true, location: true } },
        },
      }),
    ]);

    const [vendorsByStatus, requirementsByStatus, requirementsByPriority, vendorsByCategory, documentsByStatus] = await Promise.all([
      prisma.vendor.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.workRequirement.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.workRequirement.groupBy({ by: ["priority"], _count: { _all: true } }),
      prisma.vendor.groupBy({ by: ["category"], _count: { _all: true } }),
      prisma.vendorDocument.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    return {
      totalVendors,
      activeVendors,
      inactiveVendors,
      suspendedVendors,
      openRequirements,
      recommendationsGenerated,
      expiringDocuments,
      averageVendorRating: round2(toNumber(ratingAggregate._avg.rating)),
      vendorsByStatus: series(
        vendorsByStatus.map((row) => ({ label: row.status, count: row._count._all })),
        VENDOR_STATUSES,
      ),
      requirementsByStatus: series(
        requirementsByStatus.map((row) => ({ label: row.status, count: row._count._all })),
        REQUIREMENT_STATUSES,
      ),
      requirementsByPriority: series(
        requirementsByPriority.map((row) => ({ label: row.priority, count: row._count._all })),
        PRIORITIES,
      ),
      vendorsByCategory: vendorsByCategory
        .map((row) => ({ label: row.category, count: row._count._all }))
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
        .slice(0, 6),
      documentsByStatus: series(
        documentsByStatus.map((row) => ({ label: row.status, count: row._count._all })),
        DOCUMENT_STATUSES,
      ),
      recentRequirements: recentRequirements.map((requirement) => ({
        ...requirement,
        estimatedValue: toNumber(requirement.estimatedValue),
      })),
      topRecommendations: topRecommendations.map((recommendation) => ({
        id: recommendation.id,
        rank: recommendation.rank,
        score: toNumber(recommendation.score),
        recommendationLevel: recommendation.recommendationLevel,
        vendor: {
          id: recommendation.vendor.id,
          name: recommendation.vendor.name,
          category: recommendation.vendor.category,
          city: recommendation.vendor.city,
          rating: toNumber(recommendation.vendor.rating),
        },
        workRequirement: recommendation.workRequirement,
      })),
    };
  }
}

export const dashboardService = new DashboardService();
