export type AiProviderName = "openai" | "mock";

export type AiExplanationInput = {
  workRequirement: {
    title: string;
    category: string;
    location: string;
    estimatedValue: string;
    priority: string;
    expectedStartDate: string;
  };
  recommendation: {
    rank: number;
    score: number;
    level: string;
    categoryScore: number;
    locationScore: number;
    ratingScore: number;
    complianceScore: number;
    statusScore: number;
    reasons: string[];
    warnings: string[];
  };
  vendor: {
    name: string;
    vendorType: string;
    category: string;
    city: string;
    rating: number;
    status: string;
  };
  ranking: Array<{
    rank: number;
    name: string;
    score: number;
    level: string;
  }>;
};

export type AiExplanationContent = {
  summary: string;
  strengths: string[];
  risks: string[];
  tradeoffs: string[];
  recommendation: string;
};

export type AiSummaryResult = AiExplanationContent & {
  generatedBy: "openai" | "fallback" | "mock";
  fallbackReason?: string;
};

export type AiRuntime = {
  enabled: boolean;
  provider: AiProviderName;
  apiKey: string;
  model: string;
  dailyLimit: number;
  maxOutputTokens: number;
  timeoutMs: number;
};
