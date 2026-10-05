import { Router } from "express";
import { login, me, register } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { authRateLimit } from "../middleware/rateLimit";

export const authRoutes = Router();

authRoutes.post("/register", authRateLimit, register);
authRoutes.post("/login", authRateLimit, login);
authRoutes.get("/me", requireAuth, me);
