import type { AiExplanationContent, AiExplanationInput } from "./ai.types";

const DIMENSIONS = [
  { key: "category", label: "category", max: 30 },
  { key: "location", label: "location", max: 20 },
  { key: "rating", label: "rating", max: 20 },
  { key: "compliance", label: "compliance", max: 20 },
  { key: "status", label: "status", max: 10 },
] as const;

function scoreOf(input: AiExplanationInput, key: (typeof DIMENSIONS)[number]["key"]): number {
  const recommendation = input.recommendation;
  if (key === "category") return recommendation.categoryScore;
  if (key === "location") return recommendation.locationScore;
  if (key === "rating") return recommendation.ratingScore;
  if (key === "compliance") return recommendation.complianceScore;
  return recommendation.statusScore;
}

function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : String(Math.round(score * 100) / 100);
}

function weakestDimension(input: AiExplanationInput) {
  return DIMENSIONS.map((dimension) => ({
    ...dimension,
    score: scoreOf(input, dimension.key),
  })).sort((left, right) => left.score / left.max - right.score / right.max)[0];
}

export function buildFallbackSummary(input: AiExplanationInput): AiExplanationContent {
  const { recommendation, vendor } = input;
  const strengths: string[] = [];
  if (recommendation.categoryScore >= 30) strengths.push("Strong category match");
  else if (recommendation.categoryScore > 0) strengths.push("Partial category match");
  if (recommendation.locationScore >= 20) strengths.push("Strong location match");
  else if (recommendation.locationScore >= 10) strengths.push("Partial location match");
  if (recommendation.ratingScore >= 16) strengths.push("High vendor rating");
  else if (recommendation.ratingScore >= 10) strengths.push("Moderate vendor rating");
  if (strengths.length < 3 && recommendation.complianceScore >= 20) {
    strengths.push("Required compliance documents are valid");
  }

  const risks = recommendation.warnings.slice(0, 3);
  if (recommendation.complianceScore < 20 && risks.length < 3 && !risks.some((risk) => /compliance/i.test(risk))) {
    risks.push("Compliance requires review");
  }
  if (risks.length === 0) {
    risks.push("No compliance warnings were recorded.");
  }

  const weakest = weakestDimension(input);
  const strongFit = recommendation.categoryScore >= 20 || recommendation.locationScore >= 10;
  const tradeoffs =
    weakest.key === "compliance" && recommendation.complianceScore < 20 && strongFit
      ? ["Strong operational fit but weaker compliance score"]
      : [`${weakest.label[0].toUpperCase()}${weakest.label.slice(1)} is the weakest scoring dimension at ${formatScore(weakest.score)}/${weakest.max}.`];

  const needsComplianceReview = recommendation.complianceScore < 20 || recommendation.warnings.length > 0;

  return {
    summary: `${vendor.name} ranked #${recommendation.rank} with a score of ${formatScore(recommendation.score)}/100 based on the deterministic recommendation engine.`,
    strengths: strengths.slice(0, 3),
    risks: risks.slice(0, 3),
    tradeoffs: tradeoffs.slice(0, 3),
    recommendation: needsComplianceReview
      ? "Proceed with compliance verification before final award."
      : "Proceed with the current ranking and review the stored score breakdown before award.",
  };
}
