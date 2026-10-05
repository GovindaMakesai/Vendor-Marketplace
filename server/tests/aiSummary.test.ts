import { describe, expect, it } from "vitest";
import { createAiSummary } from "../src/ai/aiSummaryService";
import { buildFallbackSummary, type SummaryInput } from "../src/ai/fallbackSummary";

const input: SummaryInput = {
  requirement: {
    title: "Sydney CBD switchboard upgrade",
    category: "Electrical",
    location: "Sydney",
    priority: "HIGH",
    estimatedValue: 185000,
  },
  recommendations: [
    {
      name: "Harbour Electric Co",
      category: "Electrical",
      city: "Sydney",
      state: "New South Wales",
      rating: 4.8,
      score: 99.2,
      rank: 1,
      recommendationLevel: "HIGHLY_RECOMMENDED",
      breakdown: { category: 30, location: 20, rating: 19.2, compliance: 20, status: 10 },
      reasons: ["Exact category match", "Vendor operates in requested location", "Strong vendor rating"],
      warnings: ["Insurance document expires within 30 days"],
    },
    {
      name: "Metro Spark Services",
      category: "Electrical",
      city: "Sydney",
      state: "New South Wales",
      rating: 4.2,
      score: 96.8,
      rank: 2,
      recommendationLevel: "HIGHLY_RECOMMENDED",
      breakdown: { category: 30, location: 20, rating: 16.8, compliance: 20, status: 10 },
      reasons: ["Exact category match"],
      warnings: [],
    },
  ],
};

describe("AI summary fallback", () => {
  it("builds a deterministic summary from the leading vendor", () => {
    const summary = buildFallbackSummary(input);
    expect(summary.summary).toContain("Harbour Electric Co");
    expect(summary.summary).toContain("99.2");
    expect(summary.strengths).toContain("Exact category match");
    expect(summary.risks).toContain("Insurance document expires within 30 days");
    expect(summary.tradeoffs[0]).toContain("Metro Spark Services");
  });

  it("uses the fallback when no API key is configured", async () => {
    const summary = await createAiSummary(input);
    expect(summary.generatedBy).toBe("fallback");
    expect(summary.summary).toContain("Harbour Electric Co");
  });

  it("uses the fallback when the model response is invalid", async () => {
    const summary = await createAiSummary(input, async () => ({ summary: "" }));
    expect(summary.generatedBy).toBe("fallback");
  });

  it("uses the fallback when the model request fails", async () => {
    const summary = await createAiSummary(input, async () => {
      throw new Error("timeout");
    });
    expect(summary.generatedBy).toBe("fallback");
  });

  it("accepts a valid structured model payload", async () => {
    const summary = await createAiSummary(input, async () => ({
      summary: "Harbour Electric Co leads on the calculated score.",
      strengths: ["Exact category match"],
      risks: ["Insurance document expires within 30 days"],
      tradeoffs: ["Metro Spark Services is close behind"],
      recommendation: "Review the insurance expiry before award.",
    }));
    expect(summary.generatedBy).toBe("openai");
    expect(summary.recommendation).toContain("insurance");
  });
});
