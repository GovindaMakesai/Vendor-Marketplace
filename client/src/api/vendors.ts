import type { Paginated, Vendor, VendorInput } from "../types";
import { api } from "./client";

export type VendorQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  city?: string;
};

export function fetchVendors(query: VendorQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const suffix = params.size ? `?${params.toString()}` : "";
  return api<Paginated<Vendor>>(`/vendors${suffix}`);
}

export function fetchVendor(id: string) {
  return api<Vendor>(`/vendors/${id}`);
}

export function createVendor(input: VendorInput) {
  return api<Vendor>("/vendors", { method: "POST", body: JSON.stringify(input) });
}

export function updateVendor(id: string, input: Partial<VendorInput>) {
  return api<Vendor>(`/vendors/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteVendor(id: string) {
  return api<{ deleted: boolean }>(`/vendors/${id}`, { method: "DELETE" });
}
