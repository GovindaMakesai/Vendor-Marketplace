export type UserRole = "ADMIN" | "OPERATIONS";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type VendorStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type Vendor = {
  id: string;
  name: string;
  vendorType: string;
  category: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  rating: number;
  status: VendorStatus;
  createdAt: string;
  updatedAt: string;
};

export type DocumentType =
  | "TAX_REGISTRATION"
  | "INSURANCE"
  | "TRADE_LICENSE"
  | "SAFETY_CERTIFICATE"
  | "AGREEMENT"
  | "OTHER";

export type DocumentStatus = "VALID" | "EXPIRED" | "PENDING" | "REJECTED";

export type VendorDocument = {
  id: string;
  vendorId: string;
  documentType: DocumentType;
  documentNumber: string;
  issuedDate: string;
  expiryDate: string;
  status: DocumentStatus;
  fileName: string | null;
  fileUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RequirementPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RequirementStatus = "DRAFT" | "OPEN" | "RECOMMENDATIONS_GENERATED" | "AWARDED" | "CLOSED";

export type WorkRequirement = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  estimatedValue: number;
  priority: RequirementPriority;
  expectedStartDate: string;
  status: RequirementStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type RecommendationLevel = "HIGHLY_RECOMMENDED" | "RECOMMENDED" | "CONSIDER" | "NOT_RECOMMENDED";

export type ScoreBreakdown = {
  category: number;
  location: number;
  rating: number;
  compliance: number;
  status: number;
};

export type Recommendation = {
  id: string;
  workRequirementId: string;
  rank: number;
  score: number;
  recommendationLevel: RecommendationLevel;
  breakdown: ScoreBreakdown;
  reasons: string[];
  warnings: string[];
  generatedAt: string;
  vendor: {
    id: string;
    name: string;
    vendorType: string;
    category: string;
    city: string;
    state: string;
    country: string;
    rating: number;
    status: string;
  };
};

export type AiSummary = {
  summary: string;
  strengths: string[];
  risks: string[];
  tradeoffs: string[];
  recommendation: string;
  generatedBy: "openai" | "fallback" | "mock";
  fallbackReason?: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};

export type DashboardStats = {
  totalVendors: number;
  activeVendors: number;
  inactiveVendors: number;
  suspendedVendors: number;
  openRequirements: number;
  recommendationsGenerated: number;
  expiringDocuments: number;
  averageVendorRating: number;
  recentRequirements: Array<{
    id: string;
    title: string;
    category: string;
    location: string;
    priority: string;
    status: string;
    estimatedValue: number;
    createdAt: string;
  }>;
  topRecommendations: Array<{
    id: string;
    rank: number;
    score: number;
    recommendationLevel: string;
    vendor: { id: string; name: string; category: string; city: string; rating: number };
    workRequirement: { id: string; title: string; location: string };
  }>;
};

export type VendorInput = {
  name: string;
  vendorType: string;
  category: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  rating: number;
  status: VendorStatus;
};

export type RequirementInput = {
  title: string;
  description: string;
  category: string;
  location: string;
  estimatedValue: number;
  priority: RequirementPriority;
  expectedStartDate: string;
  status?: RequirementStatus;
};
