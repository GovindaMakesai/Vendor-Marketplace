import { Router } from "express";
import { aiRoutes } from "../modules/ai/ai.routes";
import { authRoutes } from "./authRoutes";
import { dashboardRoutes } from "./dashboardRoutes";
import { vendorRoutes } from "./vendorRoutes";
import { workRequirementRoutes } from "./workRequirementRoutes";

export const apiRoutes = Router();

apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/vendors", vendorRoutes);
apiRoutes.use("/work-requirements", workRequirementRoutes);
apiRoutes.use("/dashboard", dashboardRoutes);
apiRoutes.use(aiRoutes);
