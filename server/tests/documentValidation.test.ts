import { describe, expect, it } from "vitest";
import { documentBodySchema } from "../src/validators/document";

const document = {
  documentType: "TAX_REGISTRATION",
  documentNumber: "TAX-100",
  status: "VALID",
  fileName: "tax.pdf",
  notes: "Annual registration",
};

describe("document date validation", () => {
  it("rejects a year the database cannot store", () => {
    const result = documentBodySchema.safeParse({
      ...document,
      issuedDate: "19996-08-04",
      expiryDate: "19996-12-12",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain("Use a date between 1900 and 9999");
    }
  });

  it("accepts dates inside the supported range", () => {
    const result = documentBodySchema.safeParse({
      ...document,
      issuedDate: "2024-08-04",
      expiryDate: "2026-12-12",
    });

    expect(result.success).toBe(true);
  });
});
