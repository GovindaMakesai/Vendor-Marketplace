import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const blankToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const booleanFromEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === "") return undefined;
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    return value;
  }, z.boolean().default(defaultValue));

const envSchema = z.object({
  NODE_ENV: z.preprocess(blankToUndefined, z.string().default("development")),
  PORT: z.preprocess(blankToUndefined, z.coerce.number().int().positive().default(5000)),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  JWT_EXPIRES_IN: z.preprocess(blankToUndefined, z.string().min(1).default("7d")),
  OPENAI_API_KEY: z.preprocess(blankToUndefined, z.string().default("")),
  OPENAI_MODEL: z.preprocess(blankToUndefined, z.string().min(1).default("gpt-5.4-mini")),
  AI_ENABLED: booleanFromEnv(true),
  AI_PROVIDER: z.preprocess(blankToUndefined, z.enum(["openai", "mock"]).default("openai")),
  AI_DAILY_REQUEST_LIMIT: z.preprocess(blankToUndefined, z.coerce.number().int().positive().default(20)),
  AI_MAX_OUTPUT_TOKENS: z.preprocess(blankToUndefined, z.coerce.number().int().positive().default(300)),
  AI_TIMEOUT_MS: z.preprocess(blankToUndefined, z.coerce.number().int().positive().default(15000)),
  CLIENT_URL: z.preprocess(blankToUndefined, z.string().min(1).default("http://localhost:5173")),
});

export const env = envSchema.parse(process.env);

export const isProduction = env.NODE_ENV === "production";
