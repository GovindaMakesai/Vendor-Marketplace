import type { AiSummary, Paginated, Recommendation, RequirementInput, WorkRequirement } from "../types";
import { api } from "./client";

export type RequirementQuery = {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  category?: string;
  location?: string;
};

export function fetchRequirements(query: RequirementQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const suffix = params.size ? `?${params.toString()}` : "";
  return api<Paginated<WorkRequirement>>(`/work-requirements${suffix}`);
}

export function fetchRequirement(id: string) {
  return api<WorkRequirement>(`/work-requirements/${id}`);
}

export function createRequirement(input: RequirementInput) {
  return api<WorkRequirement>("/work-requirements", { method: "POST", body: JSON.stringify(input) });
}

export function updateRequirement(id: string, input: Partial<RequirementInput>) {
  return api<WorkRequirement>(`/work-requirements/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteRequirement(id: string) {
  return api<{ deleted: boolean }>(`/work-requirements/${id}`, { method: "DELETE" });
}

export function fetchRecommendations(id: string) {
  return api<{ workRequirementId: string; count: number; recommendations: Recommendation[] }>(
    `/work-requirements/${id}/recommendations`,
  );
}

export function generateRecommendations(id: string) {
  return api<{ workRequirementId: string; count: number; recommendations: Recommendation[] }>(
    `/work-requirements/${id}/recommendations`,
    { method: "POST" },
  );
}

export function generateAiSummary(id: string) {
  return api<AiSummary>(`/work-requirements/${id}/ai-summary`, { method: "POST" });
}
