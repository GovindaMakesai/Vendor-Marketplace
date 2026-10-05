import { describe, expect, it } from "vitest";
import { RecommendationService } from "../src/services/recommendationService";
import { recommendationLevel } from "../src/services/scoring";
import type { ScoreDocument, ScoreVendor } from "../src/types/scoring";

const service = new RecommendationService();
const now = new Date("2026-10-05T00:00:00.000Z");

function document(overrides: Partial<ScoreDocument> & Pick<ScoreDocument, "documentType" | "status" | "expiryDate">): ScoreDocument {
  return {
    documentNumber: `${overrides.documentType}-${overrides.status}`,
    ...overrides,
  };
}

function validSet(expiry = "2027-10-05T00:00:00.000Z"): ScoreDocument[] {
  return [
    document({ documentType: "TAX_REGISTRATION", status: "VALID", expiryDate: new Date(expiry) }),
    document({ documentType: "INSURANCE", status: "VALID", expiryDate: new Date(expiry) }),
    document({ documentType: "TRADE_LICENSE", status: "VALID", expiryDate: new Date(expiry) }),
  ];
}

function vendor(overrides: Partial<ScoreVendor> & Pick<ScoreVendor, "id" | "name">): ScoreVendor {
  return {
    category: "Electrical",
    city: "Sydney",
    state: "New South Wales",
    rating: 4,
    status: "ACTIVE",
    documents: validSet(),
    ...overrides,
  };
}

describe("RecommendationService", () => {
  it("awards a full category and location score for an exact match", () => {
    const [ranked] = service.rank(
      { category: "Electrical", location: "Sydney" },
      [vendor({ id: "1", name: "Harbour Electric Co", rating: 4.8 })],
      now,
    );

    expect(ranked.breakdown.category).toBe(30);
    expect(ranked.breakdown.location).toBe(20);
    expect(ranked.breakdown.rating).toBe(19.2);
    expect(ranked.breakdown.compliance).toBe(20);
    expect(ranked.breakdown.status).toBe(10);
    expect(ranked.score).toBe(99.2);
    expect(ranked.recommendationLevel).toBe("HIGHLY_RECOMMENDED");
    expect(ranked.reasons).toContain("Exact category match");
    expect(ranked.reasons).toContain("Vendor operates in requested location");
    expect(ranked.reasons).toContain("Strong vendor rating");
  });

  it("gives no category points when the category does not match", () => {
    const [ranked] = service.rank(
      { category: "Plumbing", location: "Sydney" },
      [vendor({ id: "1", name: "Harbour Electric Co" })],
      now,
    );

    expect(ranked.breakdown.category).toBe(0);
    expect(ranked.warnings).toContain("Category does not match the requirement");
  });

  it("gives partial location credit for the same state", () => {
    const ranked = service.rank(
      { category: "Electrical", location: "Sydney" },
      [
        vendor({ id: "syd", name: "Harbour Electric Co", city: "Sydney" }),
        vendor({ id: "new", name: "Hunter Grid Co", city: "Newcastle", state: "New South Wales" }),
        vendor({ id: "per", name: "Westline Logistics", city: "Perth", state: "Western Australia", category: "Electrical" }),
      ],
      now,
    );

    expect(ranked.find((item) => item.vendorName === "Harbour Electric Co")?.breakdown.location).toBe(20);
    expect(ranked.find((item) => item.vendorName === "Hunter Grid Co")?.breakdown.location).toBe(10);
    expect(ranked.find((item) => item.vendorName === "Westline Logistics")?.breakdown.location).toBe(0);
    expect(ranked.find((item) => item.vendorName === "Hunter Grid Co")?.reasons).toContain("Vendor operates in the same region");
  });

  it("maps rating from 0-5 onto 0-20", () => {
    const samples = [
      [5, 20],
      [4.5, 18],
      [4, 16],
      [2.5, 10],
      [0, 0],
    ] as const;

    for (const [rating, expected] of samples) {
      const [ranked] = service.rank(
        { category: "Electrical", location: "Sydney" },
        [vendor({ id: String(rating), name: `Vendor ${rating}`, rating })],
        now,
      );
      expect(ranked.breakdown.rating).toBe(expected);
    }
  });

  it("reduces compliance for expired, missing, pending, and rejected documents", () => {
    const cases = [
      {
        name: "Expired",
        documents: [
          document({ documentType: "TAX_REGISTRATION", status: "VALID", expiryDate: new Date("2027-01-01") }),
          document({ documentType: "INSURANCE", status: "EXPIRED", expiryDate: new Date("2026-01-01") }),
          document({ documentType: "TRADE_LICENSE", status: "VALID", expiryDate: new Date("2027-01-01") }),
        ],
        expected: 13.33,
        warning: "Insurance document is expired",
      },
      {
        name: "Missing",
        documents: [
          document({ documentType: "TAX_REGISTRATION", status: "VALID", expiryDate: new Date("2027-01-01") }),
          document({ documentType: "INSURANCE", status: "VALID", expiryDate: new Date("2027-01-01") }),
        ],
        expected: 13.33,
        warning: "Missing trade license",
      },
      {
        name: "Pending",
        documents: [
          document({ documentType: "TAX_REGISTRATION", status: "VALID", expiryDate: new Date("2027-01-01") }),
          document({ documentType: "INSURANCE", status: "PENDING", expiryDate: new Date("2027-01-01") }),
          document({ documentType: "TRADE_LICENSE", status: "VALID", expiryDate: new Date("2027-01-01") }),
        ],
        expected: 16.67,
        warning: "Insurance document is pending review",
      },
      {
        name: "Rejected",
        documents: [
          document({ documentType: "TAX_REGISTRATION", status: "REJECTED", expiryDate: new Date("2027-01-01") }),
          document({ documentType: "INSURANCE", status: "VALID", expiryDate: new Date("2027-01-01") }),
          document({ documentType: "TRADE_LICENSE", status: "VALID", expiryDate: new Date("2027-01-01") }),
        ],
        expected: 13.33,
        warning: "Tax registration document was rejected",
      },
    ];

    for (const item of cases) {
      const [ranked] = service.rank(
        { category: "Electrical", location: "Sydney" },
        [vendor({ id: item.name, name: item.name, documents: item.documents })],
        now,
      );
      expect(ranked.breakdown.compliance).toBe(item.expected);
      expect(ranked.warnings).toContain(item.warning);
    }
  });

  it("warns when valid insurance expires within 30 days without reducing the score", () => {
    const [ranked] = service.rank(
      { category: "Electrical", location: "Sydney" },
      [
        vendor({
          id: "1",
          name: "Harbour Electric Co",
          documents: [
            document({ documentType: "TAX_REGISTRATION", status: "VALID", expiryDate: new Date("2027-10-05") }),
            document({ documentType: "INSURANCE", status: "VALID", expiryDate: new Date("2026-10-20") }),
            document({ documentType: "TRADE_LICENSE", status: "VALID", expiryDate: new Date("2027-10-05") }),
          ],
        }),
      ],
      now,
    );

    expect(ranked.breakdown.compliance).toBe(20);
    expect(ranked.warnings).toContain("Insurance document expires within 30 days");
  });

  it("excludes inactive and suspended vendors", () => {
    const ranked = service.rank(
      { category: "Electrical", location: "Sydney" },
      [
        vendor({ id: "a", name: "Active Vendor", status: "ACTIVE" }),
        vendor({ id: "i", name: "Inactive Vendor", status: "INACTIVE", rating: 5 }),
        vendor({ id: "s", name: "Suspended Vendor", status: "SUSPENDED", rating: 5 }),
      ],
      now,
    );

    expect(ranked.map((item) => item.vendorName)).toEqual(["Active Vendor"]);
  });

  it("breaks ties by rating, then compliance, then name", () => {
    const partialCompliance = [
      document({ documentType: "TAX_REGISTRATION", status: "VALID", expiryDate: new Date("2027-01-01") }),
      document({ documentType: "INSURANCE", status: "PENDING", expiryDate: new Date("2027-01-01") }),
    ];

    const byRating = service.rank(
      { category: "Other", location: "Nowhere" },
      [
        vendor({
          id: "low-rating",
          name: "Lower Rating",
          rating: 2.5,
          city: "Adelaide",
          state: "South Australia",
        }),
        vendor({
          id: "high-rating",
          name: "Higher Rating",
          rating: 5,
          documents: partialCompliance,
          city: "Adelaide",
          state: "South Australia",
        }),
      ],
      now,
    );
    expect(byRating[0].score).toBe(byRating[1].score);
    expect(byRating.map((item) => item.vendorName)).toEqual(["Higher Rating", "Lower Rating"]);

    const byCompliance = service.rank(
      { category: "Electrical", location: "Sydney" },
      [
        vendor({
          id: "weak",
          name: "Weaker Compliance",
          rating: 4,
          documents: partialCompliance,
          city: "Darwin",
          state: "Northern Territory",
        }),
        vendor({
          id: "strong",
          name: "Stronger Compliance",
          rating: 4,
          category: "Civil",
          city: "Sydney",
        }),
      ],
      now,
    );
    expect(byCompliance[0].score).toBe(byCompliance[1].score);
    expect(byCompliance.map((item) => item.vendorName)).toEqual(["Stronger Compliance", "Weaker Compliance"]);

    const byName = service.rank(
      { category: "Electrical", location: "Sydney" },
      [
        vendor({ id: "b", name: "Bravo Vendor", rating: 4 }),
        vendor({ id: "a", name: "Alpha Vendor", rating: 4 }),
      ],
      now,
    );
    expect(byName.map((item) => item.vendorName)).toEqual(["Alpha Vendor", "Bravo Vendor"]);
    expect(byName.map((item) => item.rank)).toEqual([1, 2]);
  });

  it("assigns recommendation levels from the score bands", () => {
    expect(recommendationLevel(100)).toBe("HIGHLY_RECOMMENDED");
    expect(recommendationLevel(80)).toBe("HIGHLY_RECOMMENDED");
    expect(recommendationLevel(79.99)).toBe("RECOMMENDED");
    expect(recommendationLevel(65)).toBe("RECOMMENDED");
    expect(recommendationLevel(64.99)).toBe("CONSIDER");
    expect(recommendationLevel(50)).toBe("CONSIDER");
    expect(recommendationLevel(49.99)).toBe("NOT_RECOMMENDED");
  });
});
