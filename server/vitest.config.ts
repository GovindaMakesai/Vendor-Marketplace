import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/vendor_test",
      DIRECT_URL: "postgresql://user:pass@localhost:5432/vendor_test",
      JWT_SECRET: "test-jwt-secret-value",
      JWT_EXPIRES_IN: "1h",
      CLIENT_URL: "http://localhost:5173",
      PORT: "5000",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "gpt-4o-mini",
    },
  },
});
