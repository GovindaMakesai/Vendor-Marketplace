import { Router } from "express";
import { authRoutes } from "./authRoutes";
import { dashboardRoutes } from "./dashboardRoutes";
import { vendorRoutes } from "./vendorRoutes";
import { workRequirementRoutes } from "./workRequirementRoutes";

export const apiRoutes = Router();

apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/vendors", vendorRoutes);
apiRoutes.use("/work-requirements", workRequirementRoutes);
apiRoutes.use("/dashboard", dashboardRoutes);
