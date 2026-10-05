import type { DocumentStatus } from "@prisma/client";
import { isExpired } from "./dates";

const OPERATIONAL_STATUSES = new Set<DocumentStatus>(["PENDING", "REJECTED"]);

export function resolveDocumentStatus(
  expiryDate: Date,
  requested: DocumentStatus | undefined,
  now = new Date(),
): DocumentStatus {
  if (isExpired(expiryDate, now)) {
    return "EXPIRED";
  }
  if (requested && OPERATIONAL_STATUSES.has(requested)) {
    return requested;
  }
  return "VALID";
}
