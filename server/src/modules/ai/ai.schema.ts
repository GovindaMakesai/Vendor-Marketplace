import { z } from "zod";

const shortText = z.string().trim().min(1).max(400);

export const aiExplanationSchema = z.object({
  summary: z.string().trim().min(1).max(1200),
  strengths: z.array(shortText).max(3),
  risks: z.array(shortText).max(3),
  tradeoffs: z.array(shortText).max(3),
  recommendation: z.string().trim().min(1).max(800),
});

export const AI_RESPONSE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    tradeoffs: { type: "array", items: { type: "string" } },
    recommendation: { type: "string" },
  },
  required: ["summary", "strengths", "risks", "tradeoffs", "recommendation"],
} as const;
