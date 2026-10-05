import { ApiError } from "../api/client";

export function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function toDateInput(value: string) {
  return value.slice(0, 10);
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const detail = error.details
      .map((item) => item.message)
      .filter(Boolean)
      .join(" ");
    return detail || error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Try again.";
}

export function badgeTone(value: string): "good" | "warn" | "bad" | "info" | "neutral" {
  if (["ACTIVE", "VALID", "HIGHLY_RECOMMENDED", "OPEN"].includes(value)) return "good";
  if (["RECOMMENDED", "RECOMMENDATIONS_GENERATED", "HIGH", "CRITICAL"].includes(value)) return "info";
  if (["PENDING", "CONSIDER", "MEDIUM", "DRAFT"].includes(value)) return "warn";
  if (["INACTIVE", "SUSPENDED", "EXPIRED", "REJECTED", "NOT_RECOMMENDED", "CLOSED"].includes(value)) return "bad";
  return "neutral";
}
