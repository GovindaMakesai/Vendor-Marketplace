import type { DashboardStats } from "../types";
import { api } from "./client";

export function fetchDashboard() {
  return api<DashboardStats>("/dashboard/stats");
}
