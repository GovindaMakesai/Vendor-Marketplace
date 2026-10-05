import type { VendorDocument } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { startOfUtcDay } from "../utils/dates";
import { resolveDocumentStatus } from "../utils/documentStatus";
import { rethrowPrisma } from "../utils/prismaErrors";
import type { documentBodySchema, documentUpdateSchema } from "../validators/document";

type DocumentInput = z.infer<typeof documentBodySchema>;
type DocumentUpdate = z.infer<typeof documentUpdateSchema>;

export function serializeDocument(document: VendorDocument) {
  const status = resolveDocumentStatus(document.expiryDate, document.status);
  return {
    id: document.id,
    vendorId: document.vendorId,
    documentType: document.documentType,
    documentNumber: document.documentNumber,
    issuedDate: document.issuedDate,
    expiryDate: document.expiryDate,
    status,
    fileName: document.fileName,
    fileUrl: document.fileUrl,
    notes: document.notes,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function assertVendor(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
  if (!vendor) throw new AppError(404, "NOT_FOUND", "Vendor not found");
}

async function refreshExpired(vendorId: string) {
  await prisma.vendorDocument.updateMany({
    where: {
      vendorId,
      status: { not: "EXPIRED" },
      expiryDate: { lt: startOfUtcDay() },
    },
    data: { status: "EXPIRED" },
  });
}

export class DocumentService {
  async list(vendorId: string) {
    await assertVendor(vendorId);
    await refreshExpired(vendorId);
    const documents = await prisma.vendorDocument.findMany({
      where: { vendorId },
      orderBy: [{ documentType: "asc" }, { expiryDate: "desc" }],
    });
    return documents.map(serializeDocument);
  }

  async getById(vendorId: string, documentId: string) {
    await assertVendor(vendorId);
    await refreshExpired(vendorId);
    const document = await prisma.vendorDocument.findFirst({ where: { id: documentId, vendorId } });
    if (!document) throw new AppError(404, "NOT_FOUND", "Document not found");
    return serializeDocument(document);
  }

  async create(vendorId: string, input: DocumentInput) {
    await assertVendor(vendorId);
    const status = resolveDocumentStatus(input.expiryDate, input.status);
    try {
      const document = await prisma.vendorDocument.create({
        data: {
          vendorId,
          documentType: input.documentType,
          documentNumber: input.documentNumber,
          issuedDate: input.issuedDate,
          expiryDate: input.expiryDate,
          status,
          fileName: input.fileName || null,
          fileUrl: input.fileUrl || null,
          notes: input.notes || null,
        },
      });
      return serializeDocument(document);
    } catch (error) {
      rethrowPrisma(error, "Document not found");
    }
  }

  async update(vendorId: string, documentId: string, input: DocumentUpdate) {
    const existing = await prisma.vendorDocument.findFirst({ where: { id: documentId, vendorId } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Document not found");

    const expiryDate = input.expiryDate ?? existing.expiryDate;
    const requestedStatus = input.status ?? existing.status;
    const status = resolveDocumentStatus(expiryDate, requestedStatus);

    try {
      const document = await prisma.vendorDocument.update({
        where: { id: documentId },
        data: {
          ...input,
          expiryDate,
          status,
          fileName: input.fileName === undefined ? undefined : input.fileName || null,
          fileUrl: input.fileUrl === undefined ? undefined : input.fileUrl || null,
          notes: input.notes === undefined ? undefined : input.notes || null,
        },
      });
      return serializeDocument(document);
    } catch (error) {
      rethrowPrisma(error, "Document not found");
    }
  }

  async remove(vendorId: string, documentId: string) {
    const existing = await prisma.vendorDocument.findFirst({ where: { id: documentId, vendorId } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Document not found");
    await prisma.vendorDocument.delete({ where: { id: documentId } });
  }
}

export const documentService = new DocumentService();
