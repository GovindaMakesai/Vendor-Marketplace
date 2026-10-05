import type { VendorDocument } from "../types";
import { api } from "./client";

export type DocumentInput = {
  documentType: string;
  documentNumber: string;
  issuedDate: string;
  expiryDate: string;
  status?: string;
  fileName?: string;
  fileUrl?: string;
  notes?: string;
};

export function fetchDocuments(vendorId: string) {
  return api<VendorDocument[]>(`/vendors/${vendorId}/documents`);
}

export function createDocument(vendorId: string, input: DocumentInput) {
  return api<VendorDocument>(`/vendors/${vendorId}/documents`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateDocument(vendorId: string, documentId: string, input: Partial<DocumentInput>) {
  return api<VendorDocument>(`/vendors/${vendorId}/documents/${documentId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteDocument(vendorId: string, documentId: string) {
  return api<{ deleted: boolean }>(`/vendors/${vendorId}/documents/${documentId}`, { method: "DELETE" });
}
