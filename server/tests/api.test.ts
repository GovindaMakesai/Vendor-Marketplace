import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app";

type Row = Record<string, any>;

const state = vi.hoisted(() => ({
  users: [] as Row[],
  vendors: [] as Row[],
  documents: [] as Row[],
  requirements: [] as Row[],
  recommendations: [] as Row[],
  sequence: 1,
}));

function nextId(prefix: string) {
  state.sequence += 1;
  return `${prefix}_${state.sequence}`;
}

function contains(value: string, expected: string) {
  return value.toLowerCase().includes(expected.toLowerCase());
}

function equals(value: string, expected: string) {
  return value.toLowerCase() === expected.toLowerCase();
}

function matchesVendor(vendor: Row, where: any): boolean {
  if (!where) return true;
  if (where.status && vendor.status !== where.status) return false;
  if (where.category?.equals && !equals(vendor.category, where.category.equals)) return false;
  if (where.vendorType?.equals && !equals(vendor.vendorType, where.vendorType.equals)) return false;
  if (where.city?.equals && !equals(vendor.city, where.city.equals)) return false;
  if (where.OR) {
    const matched = where.OR.some((clause: any) => {
      if (clause.name?.contains && contains(vendor.name, clause.name.contains)) return true;
      if (clause.email?.contains && contains(vendor.email, clause.email.contains)) return true;
      if (clause.city?.contains && contains(vendor.city, clause.city.contains)) return true;
      if (clause.category?.contains && contains(vendor.category, clause.category.contains)) return true;
      return false;
    });
    if (!matched) return false;
  }
  return true;
}

function sortRows(rows: Row[], orderBy: any) {
  if (!orderBy) return rows;
  const key = Object.keys(orderBy)[0];
  const direction = orderBy[key] === "desc" ? -1 : 1;
  return [...rows].sort((left, right) => {
    const a = left[key];
    const b = right[key];
    if (a instanceof Date && b instanceof Date) return (a.getTime() - b.getTime()) * direction;
    if (typeof a === "string" && typeof b === "string") return a.localeCompare(b) * direction;
    return (Number(a) - Number(b)) * direction;
  });
}

const prismaMock = vi.hoisted(() => {
  const api: any = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    vendor: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    vendorDocument: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    workRequirement: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    recommendation: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return api;
});

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

function resetMocks() {
  state.users = [];
  state.vendors = [];
  state.documents = [];
  state.requirements = [];
  state.recommendations = [];
  state.sequence = 1;

  prismaMock.user.findUnique.mockImplementation(async ({ where }: any) => {
    if (where.email) return state.users.find((user) => user.email === where.email) ?? null;
    if (where.id) return state.users.find((user) => user.id === where.id) ?? null;
    return null;
  });
  prismaMock.user.create.mockImplementation(async ({ data }: any) => {
    const user = { id: nextId("user"), createdAt: new Date(), updatedAt: new Date(), ...data };
    state.users.push(user);
    return user;
  });

  prismaMock.vendor.create.mockImplementation(async ({ data }: any) => {
    const vendor = { id: nextId("vendor"), createdAt: new Date(), updatedAt: new Date(), ...data };
    state.vendors.push(vendor);
    return vendor;
  });
  prismaMock.vendor.findUnique.mockImplementation(async ({ where }: any) => {
    return state.vendors.find((vendor) => vendor.id === where.id) ?? null;
  });
  prismaMock.vendor.count.mockImplementation(async ({ where }: any = {}) => {
    return state.vendors.filter((vendor) => matchesVendor(vendor, where)).length;
  });
  prismaMock.vendor.findMany.mockImplementation(async ({ where, skip = 0, take, orderBy, include }: any = {}) => {
    let rows = sortRows(state.vendors.filter((vendor) => matchesVendor(vendor, where)), orderBy);
    rows = rows.slice(skip, take === undefined ? undefined : skip + take);
    if (include?.documents) {
      return rows.map((vendor) => ({
        ...vendor,
        documents: state.documents.filter((document) => document.vendorId === vendor.id),
      }));
    }
    return rows;
  });

  prismaMock.vendorDocument.create.mockImplementation(async ({ data }: any) => {
    const document = { id: nextId("doc"), createdAt: new Date(), updatedAt: new Date(), ...data };
    state.documents.push(document);
    return document;
  });

  prismaMock.workRequirement.create.mockImplementation(async ({ data }: any) => {
    const requirement = { id: nextId("req"), createdAt: new Date(), updatedAt: new Date(), ...data };
    state.requirements.push(requirement);
    return requirement;
  });
  prismaMock.workRequirement.findUnique.mockImplementation(async ({ where }: any) => {
    return state.requirements.find((requirement) => requirement.id === where.id) ?? null;
  });
  prismaMock.workRequirement.update.mockImplementation(async ({ where, data }: any) => {
    const requirement = state.requirements.find((item) => item.id === where.id);
    if (!requirement) throw new Error("not found");
    Object.assign(requirement, data, { updatedAt: new Date() });
    return requirement;
  });

  prismaMock.recommendation.deleteMany.mockImplementation(async ({ where }: any) => {
    const before = state.recommendations.length;
    state.recommendations = state.recommendations.filter((item) => item.workRequirementId !== where.workRequirementId);
    return { count: before - state.recommendations.length };
  });
  prismaMock.recommendation.createMany.mockImplementation(async ({ data }: any) => {
    for (const row of data) {
      state.recommendations.push({ id: nextId("rec"), generatedAt: new Date(), ...row });
    }
    return { count: data.length };
  });
  prismaMock.recommendation.findMany.mockImplementation(async ({ where, include, orderBy, take }: any = {}) => {
    let rows = state.recommendations.filter((item) => {
      if (where?.workRequirementId && item.workRequirementId !== where.workRequirementId) return false;
      if (where?.score?.gte !== undefined && Number(item.score) < where.score.gte) return false;
      return true;
    });
    rows = sortRows(rows, orderBy);
    if (take !== undefined) rows = rows.slice(0, take);
    if (include?.vendor) {
      return rows.map((row) => ({
        ...row,
        vendor: state.vendors.find((vendor) => vendor.id === row.vendorId),
      }));
    }
    return rows;
  });

  prismaMock.$transaction.mockImplementation(async (arg: any) => {
    if (typeof arg === "function") return arg(prismaMock);
    return Promise.all(arg);
  });
}

beforeEach(() => {
  resetMocks();
});

async function authToken() {
  const response = await request(app).post("/api/auth/register").send({
    name: "Demo Operator",
    email: "ops@demo.vendor.local",
    password: "DemoOps#2026",
  });
  return response.body.data.token as string;
}

function vendorPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Harbour Electric Co",
    vendorType: "Contractor",
    category: "Electrical",
    description: "Demo electrical contractor used by the API test.",
    email: "harbour.electric@demo.vendor.local",
    phone: "+61 2 5550 1001",
    address: "10 Demo Wharf Road",
    city: "Sydney",
    state: "New South Wales",
    country: "Australia",
    rating: 4.8,
    status: "ACTIVE",
    ...overrides,
  };
}

describe("API", () => {
  it("registers a user and never returns the password hash", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Demo Operator",
      email: "ops@demo.vendor.local",
      password: "DemoOps#2026",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe("ops@demo.vendor.local");
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
    expect(state.users[0].passwordHash).not.toBe("DemoOps#2026");
  });

  it("logs in with the registered password and rejects a wrong password", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Demo Operator",
      email: "ops@demo.vendor.local",
      password: "DemoOps#2026",
    });

    const rejected = await request(app).post("/api/auth/login").send({
      email: "ops@demo.vendor.local",
      password: "wrong-password",
    });
    expect(rejected.status).toBe(401);

    const accepted = await request(app).post("/api/auth/login").send({
      email: "ops@demo.vendor.local",
      password: "DemoOps#2026",
    });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.user.role).toBe("OPERATIONS");
  });

  it("requires authentication before creating a vendor", async () => {
    const unauthenticated = await request(app).post("/api/vendors").send(vendorPayload());
    expect(unauthenticated.status).toBe(401);

    const token = await authToken();
    const created = await request(app).post("/api/vendors").set("Authorization", `Bearer ${token}`).send(vendorPayload());
    expect(created.status).toBe(201);
    expect(created.body.data.name).toBe("Harbour Electric Co");
    expect(created.body.data.rating).toBe(4.8);
  });

  it("lists vendors with category filtering and pagination", async () => {
    const token = await authToken();
    await request(app).post("/api/vendors").set("Authorization", `Bearer ${token}`).send(vendorPayload());
    await request(app)
      .post("/api/vendors")
      .set("Authorization", `Bearer ${token}`)
      .send(vendorPayload({ name: "Pacific Civil Group", category: "Civil", email: "pacific.civil@demo.vendor.local", city: "Melbourne" }));

    const response = await request(app)
      .get("/api/vendors")
      .query({ category: "Electrical", page: 1, limit: 10 })
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].category).toBe("Electrical");
    expect(response.body.data.pagination.total).toBe(1);
  });

  it("creates a work requirement for the authenticated user", async () => {
    const token = await authToken();
    const response = await request(app).post("/api/work-requirements").set("Authorization", `Bearer ${token}`).send({
      title: "Sydney CBD switchboard upgrade",
      description: "Demo electrical requirement created through the API.",
      category: "Electrical",
      location: "Sydney",
      estimatedValue: 185000,
      priority: "HIGH",
      expectedStartDate: "2026-11-01",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.category).toBe("Electrical");
    expect(response.body.data.createdById).toBe(state.users[0].id);
    expect(response.body.data.status).toBe("OPEN");
  });

  it("generates deterministic recommendations and a fallback AI summary", async () => {
    const token = await authToken();
    const first = await request(app)
      .post("/api/vendors")
      .set("Authorization", `Bearer ${token}`)
      .send(vendorPayload({ name: "Alpha Electric", rating: 5, email: "alpha@demo.vendor.local" }));
    const second = await request(app)
      .post("/api/vendors")
      .set("Authorization", `Bearer ${token}`)
      .send(
        vendorPayload({
          name: "Beta Electric",
          rating: 3,
          email: "beta@demo.vendor.local",
          city: "Newcastle",
        }),
      );
    await request(app)
      .post("/api/vendors")
      .set("Authorization", `Bearer ${token}`)
      .send(vendorPayload({ name: "Inactive Electric", rating: 5, status: "INACTIVE", email: "inactive@demo.vendor.local" }));

    for (const vendorId of [first.body.data.id, second.body.data.id]) {
      for (const documentType of ["TAX_REGISTRATION", "INSURANCE", "TRADE_LICENSE"]) {
        await request(app)
          .post(`/api/vendors/${vendorId}/documents`)
          .set("Authorization", `Bearer ${token}`)
          .send({
            documentType,
            documentNumber: `${documentType}-${vendorId}`,
            issuedDate: "2025-01-01",
            expiryDate: "2027-01-01",
            status: "VALID",
          });
      }
    }

    const requirement = await request(app).post("/api/work-requirements").set("Authorization", `Bearer ${token}`).send({
      title: "Sydney electrical works",
      description: "Demo requirement used to verify recommendation generation.",
      category: "Electrical",
      location: "Sydney",
      estimatedValue: 90000,
      priority: "HIGH",
      expectedStartDate: "2026-12-01",
    });

    const generated = await request(app)
      .post(`/api/work-requirements/${requirement.body.data.id}/recommendations`)
      .set("Authorization", `Bearer ${token}`);

    expect(generated.status).toBe(201);
    const names = generated.body.data.recommendations.map((item: { vendor: { name: string } }) => item.vendor.name);
    expect(names).toEqual(["Alpha Electric", "Beta Electric"]);
    expect(generated.body.data.recommendations[0].rank).toBe(1);
    expect(generated.body.data.recommendations[0].breakdown.category).toBe(30);
    expect(generated.body.data.recommendations[0].breakdown.location).toBe(20);
    expect(generated.body.data.recommendations[1].breakdown.location).toBe(10);
    expect(generated.body.data.recommendations[0].score).toBeGreaterThan(generated.body.data.recommendations[1].score);

    const summary = await request(app)
      .post(`/api/work-requirements/${requirement.body.data.id}/ai-summary`)
      .set("Authorization", `Bearer ${token}`);

    expect(summary.status).toBe(200);
    expect(summary.body.data.generatedBy).toBe("fallback");
    expect(summary.body.data.summary).toContain("Alpha Electric");
    expect(summary.body.data.strengths.length).toBeGreaterThan(0);
    expect(JSON.stringify(summary.body)).not.toMatch(/sk-[A-Za-z0-9_-]+/);
  });

  it("rejects an unauthenticated AI summary request", async () => {
    const response = await request(app).post("/api/work-requirements/req_missing/ai-summary");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
    expect(JSON.stringify(response.body)).not.toMatch(/sk-/);
  });

  it("requires stored recommendations before an AI summary", async () => {
    const token = await authToken();
    const requirement = await request(app).post("/api/work-requirements").set("Authorization", `Bearer ${token}`).send({
      title: "Sydney electrical works",
      description: "Requirement without a generated ranking.",
      category: "Electrical",
      location: "Sydney",
      estimatedValue: 90000,
      priority: "HIGH",
      expectedStartDate: "2026-12-01",
    });

    const summary = await request(app)
      .post(`/api/work-requirements/${requirement.body.data.id}/ai-summary`)
      .set("Authorization", `Bearer ${token}`);

    expect(summary.status).toBe(400);
    expect(summary.body.error.code).toBe("RECOMMENDATIONS_REQUIRED");
    expect(summary.body.success).toBe(false);
  });

  it("reports a healthy API", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: "API is healthy" });
  });
});
