import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/utils/AppError";
import { AiExplanationService } from "../src/modules/ai/ai.service";
import { OpenAiSummaryProvider, openAiClientConfig, type OpenAiResponsesClient } from "../src/modules/ai/openai.provider";
import type { AiExplanationInput, AiRuntime } from "../src/modules/ai/ai.types";
import type { AiUsageStore } from "../src/modules/ai/ai.usage";

const prismaMock = vi.hoisted(() => ({
  workRequirement: { findUnique: vi.fn() },
  recommendation: { findMany: vi.fn() },
}));

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

const input: AiExplanationInput = {
  workRequirement: {
    title: "Sydney CBD switchboard upgrade",
    category: "Electrical",
    location: "Sydney",
    estimatedValue: "185000",
    priority: "HIGH",
    expectedStartDate: "2026-12-01",
  },
  recommendation: {
    rank: 1,
    score: 88,
    level: "HIGHLY_RECOMMENDED",
    categoryScore: 30,
    locationScore: 20,
    ratingScore: 18,
    complianceScore: 10,
    statusScore: 10,
    reasons: ["Exact category match", "Same operating location", "High vendor rating"],
    warnings: ["Insurance expires soon"],
  },
  vendor: {
    name: "Vendor A",
    vendorType: "Contractor",
    category: "Electrical",
    city: "Sydney",
    rating: 4.5,
    status: "ACTIVE",
  },
  ranking: [
    { rank: 1, name: "Vendor A", score: 88, level: "HIGHLY_RECOMMENDED" },
    { rank: 2, name: "Vendor B", score: 82, level: "HIGHLY_RECOMMENDED" },
    { rank: 3, name: "Vendor C", score: 76, level: "RECOMMENDED" },
  ],
};

const validModelPayload = {
  summary: "Vendor A is currently ranked first because the stored category and location scores are at the maximum and the rating is strong. Compliance is the weaker area.",
  strengths: ["Exact category and location match", "Strong rating"],
  risks: ["Compliance documentation needs review"],
  tradeoffs: ["Operational fit is strong while compliance is weaker"],
  recommendation: "Verify the outstanding compliance items before award.",
};

class MemoryUsageStore implements AiUsageStore {
  counts = new Map<string, number>();

  async tryConsume(usageDate: string, limit: number) {
    const next = (this.counts.get(usageDate) ?? 0) + 1;
    if (next > limit) return false;
    this.counts.set(usageDate, next);
    return true;
  }
}

function runtime(overrides: Partial<AiRuntime> = {}): AiRuntime {
  return {
    enabled: true,
    provider: "openai",
    apiKey: "sk-test-should-not-leak",
    model: "configured-model",
    dailyLimit: 20,
    maxOutputTokens: 300,
    timeoutMs: 15000,
    ...overrides,
  };
}

function clientWith(create: OpenAiResponsesClient["responses"]["create"]): OpenAiResponsesClient {
  return { responses: { create } };
}

describe("OpenAI provider", () => {
  it("requests one structured response and does not enable tools", async () => {
    const create = vi.fn(async () => ({ output_text: JSON.stringify(validModelPayload) }));
    const provider = new OpenAiSummaryProvider(
      { apiKey: "sk-test-should-not-leak", model: "configured-model", timeoutMs: 15000, maxOutputTokens: 300 },
      clientWith(create),
    );

    const result = await provider.explain(input);

    expect(result).toMatchObject({ summary: expect.stringContaining("ranked first") });
    expect(create).toHaveBeenCalledTimes(1);
    const body = create.mock.calls[0][0];
    expect(body.model).toBe("configured-model");
    expect(body.store).toBe(false);
    expect(body.max_output_tokens).toBe(300);
    expect(body.tools).toBeUndefined();
    expect(body.text?.format).toMatchObject({ type: "json_schema", strict: true });
    expect(JSON.stringify(body.input)).not.toContain("documentNumber");
    expect(openAiClientConfig("sk-test-should-not-leak", 15000).maxRetries).toBe(0);
  });

  it("rejects a malformed response", async () => {
    const provider = new OpenAiSummaryProvider(
      { apiKey: "sk-test-should-not-leak", model: "configured-model", timeoutMs: 15000, maxOutputTokens: 300 },
      clientWith(async () => ({ output_text: "not-json" })),
    );
    await expect(provider.explain(input)).rejects.toThrow("malformed_response");
  });

  it("propagates a timeout", async () => {
    const timeout = new Error("request timed out");
    timeout.name = "APIConnectionTimeoutError";
    const provider = new OpenAiSummaryProvider(
      { apiKey: "sk-test-should-not-leak", model: "configured-model", timeoutMs: 15000, maxOutputTokens: 300 },
      clientWith(async () => {
        throw timeout;
      }),
    );
    await expect(provider.explain(input)).rejects.toBe(timeout);
  });

  it("propagates an API error", async () => {
    const provider = new OpenAiSummaryProvider(
      { apiKey: "sk-test-should-not-leak", model: "configured-model", timeoutMs: 15000, maxOutputTokens: 300 },
      clientWith(async () => {
        throw new Error("upstream unavailable sk-test-should-not-leak");
      }),
    );
    await expect(provider.explain(input)).rejects.toThrow("upstream unavailable");
  });
});

describe("AI explanation service", () => {
  const logs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    logs.length = 0;
    vi.spyOn(console, "log").mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });
    vi.spyOn(console, "error").mockImplementation((message?: unknown) => {
      logs.push(String(message));
    });
  });

  it("uses the OpenAI provider when it is selected", async () => {
    const create = vi.fn(async () => ({ output_text: JSON.stringify(validModelPayload) }));
    const service = new AiExplanationService(runtime(), new MemoryUsageStore(), clientWith(create));
    const summary = await service.summarize(input);
    expect(summary.generatedBy).toBe("openai");
    expect(summary.fallbackReason).toBeUndefined();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("uses the mock provider without calling OpenAI", async () => {
    const create = vi.fn();
    const usage = new MemoryUsageStore();
    const service = new AiExplanationService(runtime({ provider: "mock" }), usage, clientWith(create));
    const summary = await service.summarize(input);
    expect(summary.generatedBy).toBe("mock");
    expect(summary.summary).toContain("Vendor A");
    expect(summary.summary).toContain("Review the recorded warnings");
    expect(summary.summary).not.toContain("does not");
    expect(create).not.toHaveBeenCalled();
    expect(usage.counts.size).toBe(0);
  });

  it("uses the fallback when the API key is missing", async () => {
    const create = vi.fn();
    const service = new AiExplanationService(runtime({ apiKey: "" }), new MemoryUsageStore(), clientWith(create));
    const summary = await service.summarize(input);
    expect(summary.generatedBy).toBe("fallback");
    expect(summary.fallbackReason).toBe("missing_api_key");
    expect(summary.summary).toContain("Vendor A ranked #1");
    expect(summary.summary).toContain("88/100");
    expect(summary.strengths).toContain("Strong category match");
    expect(summary.risks).toContain("Compliance requires review");
    expect(create).not.toHaveBeenCalled();
  });

  it("uses the fallback when the API fails and does not retry", async () => {
    const create = vi.fn(async () => {
      throw new Error("upstream unavailable sk-test-should-not-leak");
    });
    const service = new AiExplanationService(runtime(), new MemoryUsageStore(), clientWith(create));
    const summary = await service.summarize(input);
    expect(summary.generatedBy).toBe("fallback");
    expect(summary.fallbackReason).toBe("api_error");
    expect(JSON.stringify(summary)).not.toContain("sk-test-should-not-leak");
    expect(create).toHaveBeenCalledTimes(1);
    expect(logs.join("\n")).not.toContain("sk-test-should-not-leak");
  });

  it("uses the fallback when the response is malformed", async () => {
    const create = vi.fn(async () => ({ output_text: "{not json" }));
    const service = new AiExplanationService(runtime(), new MemoryUsageStore(), clientWith(create));
    const summary = await service.summarize(input);
    expect(summary.generatedBy).toBe("fallback");
    expect(summary.fallbackReason).toBe("malformed_response");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("uses the fallback when structured output fails validation", async () => {
    const create = vi.fn(async () => ({ output_text: JSON.stringify({ summary: "" }) }));
    const service = new AiExplanationService(runtime(), new MemoryUsageStore(), clientWith(create));
    const summary = await service.summarize(input);
    expect(summary.generatedBy).toBe("fallback");
    expect(summary.fallbackReason).toBe("invalid_response");
  });

  it("uses the fallback on timeout", async () => {
    const timeout = new Error("request timed out");
    timeout.name = "APIConnectionTimeoutError";
    const create = vi.fn(async () => {
      throw timeout;
    });
    const service = new AiExplanationService(runtime(), new MemoryUsageStore(), clientWith(create));
    const summary = await service.summarize(input);
    expect(summary.fallbackReason).toBe("timeout");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("stops at the daily limit and allows the next calendar date", async () => {
    const create = vi.fn(async () => ({ output_text: JSON.stringify(validModelPayload) }));
    const usage = new MemoryUsageStore();
    let current = new Date("2026-10-05T10:00:00.000Z");
    const service = new AiExplanationService(runtime({ dailyLimit: 20 }), usage, clientWith(create), () => current);

    for (let requestNumber = 1; requestNumber <= 20; requestNumber += 1) {
      const summary = await service.summarize(input);
      expect(summary.generatedBy).toBe("openai");
    }
    const blocked = await service.summarize(input);
    expect(blocked.generatedBy).toBe("fallback");
    expect(blocked.fallbackReason).toBe("daily_ai_limit_reached");
    expect(create).toHaveBeenCalledTimes(20);

    current = new Date("2026-10-06T10:00:00.000Z");
    const nextDay = await service.summarize(input);
    expect(nextDay.generatedBy).toBe("openai");
    expect(create).toHaveBeenCalledTimes(21);
  });

  it("does not call OpenAI when recommendations are missing", async () => {
    prismaMock.workRequirement.findUnique.mockResolvedValue({
      id: "req_1",
      title: "Sydney electrical works",
      category: "Electrical",
      location: "Sydney",
      estimatedValue: 90000,
      priority: "HIGH",
      expectedStartDate: new Date("2026-12-01T00:00:00.000Z"),
    });
    prismaMock.recommendation.findMany.mockResolvedValue([]);
    const create = vi.fn();
    const service = new AiExplanationService(runtime(), new MemoryUsageStore(), clientWith(create));
    await expect(service.summarizeRequirement("req_1")).rejects.toBeInstanceOf(AppError);
    await expect(service.summarizeRequirement("req_1")).rejects.toMatchObject({ code: "RECOMMENDATIONS_REQUIRED" });
    expect(create).not.toHaveBeenCalled();
  });
});
