import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboardController";
import { requireAuth } from "../middleware/auth";

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);
dashboardRoutes.get("/stats", getDashboardStats);
