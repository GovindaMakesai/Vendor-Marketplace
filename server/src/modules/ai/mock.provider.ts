import { buildFallbackSummary } from "./ai.fallback";
import type { AiExplanationContent, AiExplanationInput } from "./ai.types";

export class MockSummaryProvider {
  explain(input: AiExplanationInput): Promise<AiExplanationContent> {
    const base = buildFallbackSummary(input);
    const { recommendation, vendor } = input;
    const strong: string[] = [];
    if (recommendation.categoryScore >= 30) strong.push("category");
    if (recommendation.locationScore >= 20) strong.push("location");
    if (recommendation.ratingScore >= 16) strong.push("rating");
    const fit = strong.length > 0 ? strong.join(" and ") : "the stored score breakdown";
    const complianceNote =
      recommendation.warnings.length > 0
        ? "Review the recorded warnings before award."
        : recommendation.complianceScore < 20
          ? "Compliance is the main weaker area and should be verified before award."
          : "No compliance warning was recorded.";

    return Promise.resolve({
      ...base,
      summary: `${vendor.name} is currently ranked #${recommendation.rank} with a score of ${recommendation.score}/100. The stored result is strongest on ${fit}. ${complianceNote}`,
    });
  }
}
