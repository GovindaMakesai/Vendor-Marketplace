export const REQUIRED_DOCUMENT_TYPES = ["TAX_REGISTRATION", "INSURANCE", "TRADE_LICENSE"] as const;

export type DocumentTypeName =
  | "TAX_REGISTRATION"
  | "INSURANCE"
  | "TRADE_LICENSE"
  | "SAFETY_CERTIFICATE"
  | "AGREEMENT"
  | "OTHER";

export type DocumentStatusName = "VALID" | "EXPIRED" | "PENDING" | "REJECTED";

export type VendorStatusName = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type RecommendationLevelName =
  | "HIGHLY_RECOMMENDED"
  | "RECOMMENDED"
  | "CONSIDER"
  | "NOT_RECOMMENDED";

export type ScoreDocument = {
  documentType: DocumentTypeName;
  documentNumber: string;
  expiryDate: Date;
  status: DocumentStatusName;
};

export type ScoreVendor = {
  id: string;
  name: string;
  category: string;
  city: string;
  state: string;
  rating: number;
  status: VendorStatusName;
  documents: ScoreDocument[];
};

export type ScoreRequirement = {
  category: string;
  location: string;
};

export type ScoreBreakdown = {
  category: number;
  location: number;
  rating: number;
  compliance: number;
  status: number;
};

export type ScoredVendor = {
  vendorId: string;
  vendorName: string;
  rating: number;
  score: number;
  recommendationLevel: RecommendationLevelName;
  breakdown: ScoreBreakdown;
  reasons: string[];
  warnings: string[];
};

export type RankedVendor = ScoredVendor & {
  rank: number;
};
