import OpenAI from "openai";
import { AI_INSTRUCTIONS } from "./ai.prompt";
import { AI_RESPONSE_JSON_SCHEMA } from "./ai.schema";
import type { AiExplanationInput } from "./ai.types";

export type OpenAiResponsesClient = {
  responses: {
    create(body: OpenAI.Responses.ResponseCreateParamsNonStreaming): Promise<{ output_text: string }>;
  };
};

export function openAiClientConfig(apiKey: string, timeoutMs: number): ConstructorParameters<typeof OpenAI>[0] {
  return {
    apiKey,
    timeout: timeoutMs,
    maxRetries: 0,
  };
}

export class OpenAiSummaryProvider {
  constructor(
    private readonly options: {
      apiKey: string;
      model: string;
      timeoutMs: number;
      maxOutputTokens: number;
    },
    private readonly client?: OpenAiResponsesClient,
  ) {}

  async explain(input: AiExplanationInput): Promise<unknown> {
    const client = this.client ?? new OpenAI(openAiClientConfig(this.options.apiKey, this.options.timeoutMs));
    const response = await client.responses.create({
      model: this.options.model,
      store: false,
      max_output_tokens: this.options.maxOutputTokens,
      instructions: AI_INSTRUCTIONS,
      input: JSON.stringify(input),
      reasoning: { effort: "minimal" },
      text: {
        format: {
          type: "json_schema",
          name: "vendor_recommendation_explanation",
          strict: true,
          schema: AI_RESPONSE_JSON_SCHEMA as { [key: string]: unknown },
        },
      },
    });

    const text = response.output_text?.trim();
    if (!text) {
      throw new Error("malformed_response");
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error("malformed_response");
    }
  }
}
