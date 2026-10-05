import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env, isProduction } from "./config/env";
import { openApiSpec } from "./docs/openapi";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiRoutes } from "./routes";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  const allowedOrigins = new Set([
    env.CLIENT_URL,
    "https://vendor-marketplace-chi.vercel.app",
  ]);
  if (!isProduction) {
    allowedOrigins.add("http://localhost:5173");
    allowedOrigins.add("http://127.0.0.1:5173");
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        // Preview deployments each have their own host. Same-origin /api calls
        // send that host, and the API still requires a JWT.
        if (process.env.VERCEL && origin.endsWith(".vercel.app")) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(isProduction ? "combined" : "dev"));

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, message: "API is healthy" });
  });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get("/api/docs.json", (_req, res) => {
    res.json(openApiSpec);
  });
  app.use("/api", apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
