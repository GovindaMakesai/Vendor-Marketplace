import OpenAI from "openai";
import { z } from "zod";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { buildFallbackSummary, type AiSummary, type SummaryInput } from "./fallbackSummary";

const aiPayloadSchema = z.object({
  summary: z.string().min(1),
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  tradeoffs: z.array(z.string()),
  recommendation: z.string().min(1),
});

export type SummaryCompleter = (input: SummaryInput) => Promise<unknown>;

const SYSTEM_PROMPT = [
  "You explain vendor recommendations for an operations team.",
  "Use only the supplied data. If information is missing, state that it is unavailable.",
  "Do not change scores, ranks, eligibility, or compliance status.",
  "Do not invent documents, certifications, vendor capabilities, or locations.",
  "Do not claim a vendor is compliant unless the supplied compliance score and reasons support it.",
  "Return JSON with keys summary, strengths, risks, tradeoffs, and recommendation.",
  "strengths, risks, and tradeoffs must be arrays of short strings.",
].join(" ");

function fallback(input: SummaryInput): AiSummary {
  return { ...buildFallbackSummary(input), generatedBy: "fallback" };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("AI response was not valid JSON");
  }
}

async function callOpenAI(input: SummaryInput): Promise<unknown> {
  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    timeout: 20_000,
    maxRetries: 0,
  });
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: JSON.stringify({
        instruction: "Summarise the already calculated recommendation. Do not recalculate scores.",
        workRequirement: input.requirement,
        recommendations: input.recommendations.slice(0, 5),
      }),
    },
  ];

  try {
    const response = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages,
      response_format: { type: "json_object" },
    });
    return extractJson(response.choices[0]?.message?.content ?? "");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/response_format|json_object|unsupported/i.test(message)) {
      throw error;
    }
    const response = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages,
    });
    return extractJson(response.choices[0]?.message?.content ?? "");
  }
}

export async function createAiSummary(input: SummaryInput, complete?: SummaryCompleter): Promise<AiSummary> {
  if (!env.OPENAI_API_KEY && !complete) {
    return fallback(input);
  }

  try {
    const raw = complete ? await complete(input) : await callOpenAI(input);
    const parsed = aiPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      logger.error("AI summary returned an invalid payload");
      return fallback(input);
    }
    return { ...parsed.data, generatedBy: "openai" };
  } catch (error) {
    logger.error("AI summary failed, using deterministic fallback", error);
    return fallback(input);
  }
}
