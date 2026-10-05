import { Router } from "express";
import { generateRecommendations, listRecommendations } from "../controllers/recommendationController";
import {
  createRequirement,
  deleteRequirement,
  getRequirement,
  listRequirements,
  updateRequirement,
} from "../controllers/workRequirementController";
import { requireAuth } from "../middleware/auth";

export const workRequirementRoutes = Router();

workRequirementRoutes.use(requireAuth);
workRequirementRoutes.get("/", listRequirements);
workRequirementRoutes.post("/", createRequirement);
workRequirementRoutes.get("/:id", getRequirement);
workRequirementRoutes.put("/:id", updateRequirement);
workRequirementRoutes.delete("/:id", deleteRequirement);
workRequirementRoutes.post("/:id/recommendations", generateRecommendations);
workRequirementRoutes.get("/:id/recommendations", listRecommendations);
