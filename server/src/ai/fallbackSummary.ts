export type SummaryVendor = {
  name: string;
  category: string;
  city: string;
  state: string;
  rating: number;
  score: number;
  rank: number;
  recommendationLevel: string;
  breakdown: {
    category: number;
    location: number;
    rating: number;
    compliance: number;
    status: number;
  };
  reasons: string[];
  warnings: string[];
};

export type SummaryInput = {
  requirement: {
    title: string;
    category: string;
    location: string;
    priority: string;
    estimatedValue: number;
  };
  recommendations: SummaryVendor[];
};

export type AiSummary = {
  summary: string;
  strengths: string[];
  risks: string[];
  tradeoffs: string[];
  recommendation: string;
  generatedBy: "openai" | "fallback";
};

export function buildFallbackSummary(input: SummaryInput): Omit<AiSummary, "generatedBy"> {
  const top = input.recommendations[0];
  if (!top) {
    return {
      summary: `No eligible vendors were ranked for ${input.requirement.title}.`,
      strengths: [],
      risks: ["No active vendors were available to score."],
      tradeoffs: [],
      recommendation: "Add active vendors that match the category and location, then generate recommendations again.",
    };
  }

  const reasonText = top.reasons.length > 0 ? top.reasons.join(". ") + "." : "No positive reasons were recorded.";
  const second = input.recommendations[1];
  const tradeoffs = second
    ? [
        `${second.name} is rank ${second.rank} with a score of ${second.score}, which is ${roundDifference(top.score, second.score)} points below ${top.name}.`,
      ]
    : ["Only one eligible vendor was ranked, so there is no alternative to compare."];

  if (top.warnings.length > 0) {
    tradeoffs.push(`${top.name} still has ${top.warnings.length} item${top.warnings.length === 1 ? "" : "s"} to review before award.`);
  }

  return {
    summary: `${top.name} is the highest-ranked vendor with a score of ${top.score}. ${reasonText}`,
    strengths: top.reasons,
    risks: top.warnings.length > 0 ? top.warnings : ["No compliance warnings were recorded for the leading vendor."],
    tradeoffs,
    recommendation: `Proceed with ${top.name} for ${input.requirement.title} in ${input.requirement.location}, and review the listed warnings before award.`,
  };
}

function roundDifference(higher: number, lower: number): number {
  return Math.round((higher - lower) * 100) / 100;
}
