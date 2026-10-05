export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Intelligent Vendor Recommendation Platform API",
    version: "1.0.0",
    description:
      "REST API for vendor management, compliance metadata, work requirements, and deterministic vendor recommendations. AI summaries explain stored scores and never assign them.",
  },
  servers: [{ url: "/api" }],
  tags: [
    { name: "Auth" },
    { name: "Vendors" },
    { name: "Documents" },
    { name: "Work Requirements" },
    { name: "Recommendations" },
    { name: "Dashboard" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
      Vendor: {
        type: "object",
        properties: {
          name: { type: "string" },
          vendorType: { type: "string" },
          category: { type: "string" },
          description: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          country: { type: "string" },
          rating: { type: "number", minimum: 0, maximum: 5 },
          status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"] },
        },
      },
      Document: {
        type: "object",
        properties: {
          documentType: {
            type: "string",
            enum: ["TAX_REGISTRATION", "INSURANCE", "TRADE_LICENSE", "SAFETY_CERTIFICATE", "AGREEMENT", "OTHER"],
          },
          documentNumber: { type: "string" },
          issuedDate: { type: "string", format: "date-time" },
          expiryDate: { type: "string", format: "date-time" },
          status: { type: "string", enum: ["VALID", "EXPIRED", "PENDING", "REJECTED"] },
          fileName: { type: "string" },
          fileUrl: { type: "string" },
          notes: { type: "string" },
        },
      },
      WorkRequirement: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          location: { type: "string" },
          estimatedValue: { type: "number" },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
          expectedStartDate: { type: "string", format: "date-time" },
          status: {
            type: "string",
            enum: ["DRAFT", "OPEN", "RECOMMENDATIONS_GENERATED", "AWARDED", "CLOSED"],
          },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register an operations user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: { name: { type: "string" }, email: { type: "string" }, password: { type: "string" } },
              },
            },
          },
        },
        responses: { "201": { description: "Account created" }, "409": { description: "Email already exists" } },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and receive a JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: { email: { type: "string" }, password: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Authenticated" }, "401": { description: "Invalid credentials" } },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Current user" }, "401": { description: "Unauthorized" } },
      },
    },
    "/vendors": {
      get: {
        tags: ["Vendors"],
        summary: "List vendors",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "vendorType", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "city", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string" } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
        ],
        responses: { "200": { description: "Paginated vendors" } },
      },
      post: {
        tags: ["Vendors"],
        summary: "Create a vendor",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Vendor" } } } },
        responses: { "201": { description: "Vendor created" } },
      },
    },
    "/vendors/{id}": {
      get: {
        tags: ["Vendors"],
        summary: "Get a vendor",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Vendor" }, "404": { description: "Not found" } },
      },
      put: {
        tags: ["Vendors"],
        summary: "Update a vendor",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Vendor" } } } },
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Vendors"],
        summary: "Delete a vendor and its documents",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/vendors/{vendorId}/documents": {
      get: {
        tags: ["Documents"],
        summary: "List vendor documents",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "vendorId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Documents" } },
      },
      post: {
        tags: ["Documents"],
        summary: "Store document metadata",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "vendorId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Document" } } } },
        responses: { "201": { description: "Document stored" } },
      },
    },
    "/vendors/{vendorId}/documents/{documentId}": {
      get: {
        tags: ["Documents"],
        summary: "Get a document",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "vendorId", in: "path", required: true, schema: { type: "string" } },
          { name: "documentId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Document" } },
      },
      put: {
        tags: ["Documents"],
        summary: "Update document metadata",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "vendorId", in: "path", required: true, schema: { type: "string" } },
          { name: "documentId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Document" } } } },
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Documents"],
        summary: "Delete document metadata",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "vendorId", in: "path", required: true, schema: { type: "string" } },
          { name: "documentId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/work-requirements": {
      get: {
        tags: ["Work Requirements"],
        summary: "List work requirements",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "priority", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "location", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Paginated requirements" } },
      },
      post: {
        tags: ["Work Requirements"],
        summary: "Create a work requirement",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/WorkRequirement" } } },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/work-requirements/{id}": {
      get: {
        tags: ["Work Requirements"],
        summary: "Get a work requirement",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Requirement" } },
      },
      put: {
        tags: ["Work Requirements"],
        summary: "Update a work requirement",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/WorkRequirement" } } },
        },
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Work Requirements"],
        summary: "Delete a work requirement",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/work-requirements/{id}/recommendations": {
      post: {
        tags: ["Recommendations"],
        summary: "Generate deterministic recommendations",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "201": { description: "Ranked recommendations" } },
      },
      get: {
        tags: ["Recommendations"],
        summary: "List stored recommendations",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
          { name: "minScore", in: "query", schema: { type: "number" } },
        ],
        responses: { "200": { description: "Recommendations with score breakdowns" } },
      },
    },
    "/work-requirements/{id}/ai-summary": {
      post: {
        tags: ["Recommendations"],
        summary: "Explain stored recommendations",
        description: "Uses OpenAI when configured. Falls back to a deterministic summary. The model cannot change scores or ranks.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Summary, strengths, risks, trade-offs, and generatedBy" } },
      },
    },
    "/dashboard/stats": {
      get: {
        tags: ["Dashboard"],
        summary: "Operational counts and recent activity",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Dashboard statistics" } },
      },
    },
  },
};
