import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { aiSummaryRateLimit } from "../../middleware/rateLimit";
import { createAiSummary } from "./ai.controller";

export const aiRoutes = Router();

aiRoutes.post("/work-requirements/:id/ai-summary", requireAuth, aiSummaryRateLimit, createAiSummary);
