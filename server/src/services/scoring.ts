import type { RankedVendor, ScoreRequirement, ScoreVendor, ScoredVendor } from "../types/scoring";
import { REQUIRED_DOCUMENT_TYPES } from "../types/scoring";
import type { DocumentStatusName, DocumentTypeName, RecommendationLevelName } from "../types/scoring";
import { expiresWithinDays } from "../utils/dates";
import { resolveDocumentStatus } from "../utils/documentStatus";
import { round2 } from "../utils/numbers";

const DOCUMENT_SHARE = 20 / 3;

const DOCUMENT_LABELS: Record<DocumentTypeName, string> = {
  TAX_REGISTRATION: "Tax registration",
  INSURANCE: "Insurance",
  TRADE_LICENSE: "Trade license",
  SAFETY_CERTIFICATE: "Safety certificate",
  AGREEMENT: "Agreement",
  OTHER: "Other document",
};

const STATUS_PRIORITY: Record<DocumentStatusName, number> = {
  VALID: 4,
  PENDING: 3,
  EXPIRED: 2,
  REJECTED: 1,
};

export function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function recommendationLevel(score: number): RecommendationLevelName {
  if (score >= 80) return "HIGHLY_RECOMMENDED";
  if (score >= 65) return "RECOMMENDED";
  if (score >= 50) return "CONSIDER";
  return "NOT_RECOMMENDED";
}

/**
 * The requirement stores one location string. The broader region is:
 * 1. text after a comma ("Brisbane, Queensland")
 * 2. the location itself when it equals a vendor state
 * 3. the single state shared by vendors whose city matches the location
 */
export function inferRegion(location: string, vendors: Array<{ city: string; state: string }>): string | null {
  const normalizedLocation = normalizeText(location);
  const parts = normalizedLocation.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(1).join(", ");
  }

  const stateMatch = vendors.find((vendor) => normalizeText(vendor.state) === normalizedLocation);
  if (stateMatch) return normalizeText(stateMatch.state);

  const cityMatches = vendors.filter((vendor) => normalizeText(vendor.city) === normalizedLocation);
  const states = [...new Set(cityMatches.map((vendor) => normalizeText(vendor.state)))];
  return states.length === 1 ? states[0] : null;
}

export function scoreLocation(location: string, city: string, state: string, region: string | null) {
  const normalizedLocation = normalizeText(location);
  const normalizedCity = normalizeText(city);
  const normalizedState = normalizeText(state);
  const primary = normalizedLocation.split(",")[0]?.trim() ?? normalizedLocation;

  if (primary === normalizedCity || normalizedLocation === normalizedCity) {
    return { points: 20, reason: "Vendor operates in requested location" as const };
  }

  if ((region && normalizedState === region) || normalizedLocation === normalizedState || primary === normalizedState) {
    return { points: 10, reason: "Vendor operates in the same region" as const };
  }

  return { points: 0, warning: "Vendor is outside the requested location" as const };
}

function bestDocument(vendor: ScoreVendor, documentType: DocumentTypeName, now: Date) {
  const matches = vendor.documents.filter((document) => document.documentType === documentType);
  if (matches.length === 0) return undefined;

  return [...matches].sort((left, right) => {
    const leftStatus = resolveDocumentStatus(left.expiryDate, left.status, now);
    const rightStatus = resolveDocumentStatus(right.expiryDate, right.status, now);
    if (STATUS_PRIORITY[leftStatus] !== STATUS_PRIORITY[rightStatus]) {
      return STATUS_PRIORITY[rightStatus] - STATUS_PRIORITY[leftStatus];
    }
    const expiryDifference = right.expiryDate.getTime() - left.expiryDate.getTime();
    if (expiryDifference !== 0) return expiryDifference;
    return left.documentNumber.localeCompare(right.documentNumber, "en");
  })[0];
}

function scoreCompliance(vendor: ScoreVendor, now: Date) {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let points = 0;
  let pendingCredit = false;

  for (const documentType of REQUIRED_DOCUMENT_TYPES) {
    const label = DOCUMENT_LABELS[documentType];
    const document = bestDocument(vendor, documentType, now);
    if (!document) {
      warnings.push(`Missing ${label.toLowerCase()}`);
      continue;
    }

    const status = resolveDocumentStatus(document.expiryDate, document.status, now);
    if (status === "VALID") {
      points += DOCUMENT_SHARE;
      if (expiresWithinDays(document.expiryDate, now, 30)) {
        warnings.push(`${label} document expires within 30 days`);
      }
    } else if (status === "PENDING") {
      points += DOCUMENT_SHARE / 2;
      pendingCredit = true;
      warnings.push(`${label} document is pending review`);
    } else if (status === "EXPIRED") {
      warnings.push(`${label} document is expired`);
    } else {
      warnings.push(`${label} document was rejected`);
    }
  }

  for (const document of vendor.documents) {
    if (REQUIRED_DOCUMENT_TYPES.includes(document.documentType as (typeof REQUIRED_DOCUMENT_TYPES)[number])) {
      continue;
    }
    const status = resolveDocumentStatus(document.expiryDate, document.status, now);
    const label = DOCUMENT_LABELS[document.documentType];
    if (status === "EXPIRED") warnings.push(`${label} document is expired`);
    if (status === "REJECTED") warnings.push(`${label} document was rejected`);
  }

  const rounded = round2(points);
  if (rounded === 20) {
    reasons.push("All required compliance documents are valid");
  } else if (pendingCredit) {
    reasons.push("Pending documents received partial compliance credit");
  }

  return { points: rounded, reasons, warnings };
}

export function scoreVendor(
  requirement: ScoreRequirement,
  vendor: ScoreVendor,
  now: Date,
  region: string | null,
): ScoredVendor | null {
  if (vendor.status !== "ACTIVE") return null;

  const reasons: string[] = [];
  const warnings: string[] = [];

  const categoryMatch = normalizeText(vendor.category) === normalizeText(requirement.category);
  const category = categoryMatch ? 30 : 0;
  if (categoryMatch) reasons.push("Exact category match");
  else warnings.push("Category does not match the requirement");

  const location = scoreLocation(requirement.location, vendor.city, vendor.state, region);
  if ("reason" in location && location.reason) reasons.push(location.reason);
  if ("warning" in location && location.warning) warnings.push(location.warning);

  const clampedRating = Math.min(5, Math.max(0, vendor.rating));
  const rating = round2((clampedRating / 5) * 20);
  if (clampedRating >= 4) reasons.push("Strong vendor rating");
  else if (clampedRating >= 2.5) reasons.push("Moderate vendor rating");
  else warnings.push("Low vendor rating");

  const compliance = scoreCompliance(vendor, now);
  reasons.push(...compliance.reasons);
  warnings.push(...compliance.warnings);

  reasons.push("Vendor status is active");

  const breakdown = {
    category,
    location: location.points,
    rating,
    compliance: compliance.points,
    status: 10,
  };
  const score = round2(breakdown.category + breakdown.location + breakdown.rating + breakdown.compliance + breakdown.status);

  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    rating: clampedRating,
    score,
    recommendationLevel: recommendationLevel(score),
    breakdown,
    reasons,
    warnings,
  };
}

export function rankVendors(requirement: ScoreRequirement, vendors: ScoreVendor[], now = new Date()): RankedVendor[] {
  const region = inferRegion(requirement.location, vendors);
  const scored = vendors
    .map((vendor) => scoreVendor(requirement, vendor, now, region))
    .filter((vendor): vendor is ScoredVendor => vendor !== null);

  scored.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.rating !== left.rating) return right.rating - left.rating;
    if (right.breakdown.compliance !== left.breakdown.compliance) {
      return right.breakdown.compliance - left.breakdown.compliance;
    }
    return left.vendorName.localeCompare(right.vendorName, "en", { sensitivity: "base" });
  });

  return scored.map((vendor, index) => ({ ...vendor, rank: index + 1 }));
}
