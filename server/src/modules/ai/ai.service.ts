import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";
import { stringArray, toNumber } from "../../utils/numbers";
import { buildFallbackSummary } from "./ai.fallback";
import { MockSummaryProvider } from "./mock.provider";
import { OpenAiSummaryProvider, type OpenAiResponsesClient } from "./openai.provider";
import { aiExplanationSchema } from "./ai.schema";
import type { AiExplanationInput, AiRuntime, AiSummaryResult } from "./ai.types";
import { PrismaAiUsageStore, usageDate, type AiUsageStore } from "./ai.usage";

function fallback(input: AiExplanationInput, fallbackReason: string): AiSummaryResult {
  return { ...buildFallbackSummary(input), generatedBy: "fallback", fallbackReason };
}

function isTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "APIConnectionTimeoutError" || error.name === "TimeoutError" || /timed out|timeout/i.test(error.message);
}

function failureReason(error: unknown): string {
  if (error instanceof Error && error.message === "malformed_response") return "malformed_response";
  if (isTimeout(error)) return "timeout";
  return "api_error";
}

export class AiExplanationService {
  private readonly mockProvider = new MockSummaryProvider();

  constructor(
    private readonly runtime: AiRuntime,
    private readonly usage: AiUsageStore,
    private readonly openAiClient?: OpenAiResponsesClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async summarizeRequirement(workRequirementId: string): Promise<AiSummaryResult> {
    const input = await this.loadInput(workRequirementId);
    return this.summarize(input);
  }

  async summarize(input: AiExplanationInput): Promise<AiSummaryResult> {
    if (!this.runtime.enabled) {
      return fallback(input, "ai_disabled");
    }

    if (this.runtime.provider === "mock") {
      const started = Date.now();
      const raw = await this.mockProvider.explain(input);
      const parsed = aiExplanationSchema.safeParse(raw);
      if (!parsed.success) {
        this.log("fallback", "mock", "invalid_response", Date.now() - started);
        return fallback(input, "invalid_response");
      }
      this.log("success", "mock", undefined, Date.now() - started);
      return { ...parsed.data, generatedBy: "mock" };
    }

    if (!this.runtime.apiKey) {
      this.log("fallback", "openai", "missing_api_key", 0);
      return fallback(input, "missing_api_key");
    }

    let allowed = false;
    try {
      allowed = await this.usage.tryConsume(usageDate(this.now()), this.runtime.dailyLimit);
    } catch {
      this.log("fallback", "openai", "usage_check_failed", 0);
      return fallback(input, "usage_check_failed");
    }
    if (!allowed) {
      this.log("fallback", "openai", "daily_ai_limit_reached", 0);
      return fallback(input, "daily_ai_limit_reached");
    }

    const provider = new OpenAiSummaryProvider(
      {
        apiKey: this.runtime.apiKey,
        model: this.runtime.model,
        timeoutMs: this.runtime.timeoutMs,
        maxOutputTokens: this.runtime.maxOutputTokens,
      },
      this.openAiClient,
    );
    const started = Date.now();
    try {
      const raw = await provider.explain(input);
      const parsed = aiExplanationSchema.safeParse(raw);
      const durationMs = Date.now() - started;
      if (!parsed.success) {
        this.log("fallback", "openai", "invalid_response", durationMs);
        return fallback(input, "invalid_response");
      }
      this.log("success", "openai", undefined, durationMs);
      return { ...parsed.data, generatedBy: "openai" };
    } catch (error) {
      const reason = failureReason(error);
      this.log("fallback", "openai", reason, Date.now() - started);
      return fallback(input, reason);
    }
  }

  private log(outcome: "success" | "fallback", provider: string, reason: string | undefined, durationMs: number) {
    const reasonText = reason ? ` reason=${reason}` : "";
    const status = outcome === "success" ? "AI summary generated successfully" : "AI summary fallback";
    logger.info(`${status} provider=${provider} model=${provider === "mock" ? "none" : this.runtime.model} durationMs=${durationMs}${reasonText}`);
  }

  private async loadInput(workRequirementId: string): Promise<AiExplanationInput> {
    const requirement = await prisma.workRequirement.findUnique({ where: { id: workRequirementId } });
    if (!requirement) throw new AppError(404, "NOT_FOUND", "Work requirement not found");

    const records = await prisma.recommendation.findMany({
      where: { workRequirementId },
      include: { vendor: true },
      orderBy: { rank: "asc" },
    });
    if (records.length === 0) {
      throw new AppError(400, "RECOMMENDATIONS_REQUIRED", "Generate recommendations before requesting an AI summary.");
    }

    const top = records[0];
    return {
      workRequirement: {
        title: requirement.title,
        category: requirement.category,
        location: requirement.location,
        estimatedValue: String(toNumber(requirement.estimatedValue)),
        priority: requirement.priority,
        expectedStartDate: requirement.expectedStartDate.toISOString().slice(0, 10),
      },
      recommendation: {
        rank: top.rank,
        score: toNumber(top.score),
        level: top.recommendationLevel,
        categoryScore: toNumber(top.categoryScore),
        locationScore: toNumber(top.locationScore),
        ratingScore: toNumber(top.ratingScore),
        complianceScore: toNumber(top.complianceScore),
        statusScore: toNumber(top.statusScore),
        reasons: stringArray(top.reasons),
        warnings: stringArray(top.warnings),
      },
      vendor: {
        name: top.vendor.name,
        vendorType: top.vendor.vendorType,
        category: top.vendor.category,
        city: top.vendor.city,
        rating: toNumber(top.vendor.rating),
        status: top.vendor.status,
      },
      ranking: records.slice(0, 3).map((record) => ({
        rank: record.rank,
        name: record.vendor.name,
        score: toNumber(record.score),
        level: record.recommendationLevel,
      })),
    };
  }
}

export const aiExplanationService = new AiExplanationService(runtimeFromEnv(), new PrismaAiUsageStore());

export function runtimeFromEnv(): AiRuntime {
  return {
    enabled: env.AI_ENABLED,
    provider: env.AI_PROVIDER,
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    dailyLimit: env.AI_DAILY_REQUEST_LIMIT,
    maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS,
    timeoutMs: env.AI_TIMEOUT_MS,
  };
}
