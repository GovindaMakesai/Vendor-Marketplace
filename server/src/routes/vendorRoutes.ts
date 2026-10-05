import { Router } from "express";
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from "../controllers/documentController";
import { createVendor, deleteVendor, getVendor, listVendors, updateVendor } from "../controllers/vendorController";
import { requireAuth } from "../middleware/auth";

export const vendorRoutes = Router();

vendorRoutes.use(requireAuth);
vendorRoutes.get("/", listVendors);
vendorRoutes.post("/", createVendor);
vendorRoutes.get("/:id", getVendor);
vendorRoutes.put("/:id", updateVendor);
vendorRoutes.delete("/:id", deleteVendor);

vendorRoutes.get("/:vendorId/documents", listDocuments);
vendorRoutes.post("/:vendorId/documents", createDocument);
vendorRoutes.get("/:vendorId/documents/:documentId", getDocument);
vendorRoutes.put("/:vendorId/documents/:documentId", updateDocument);
vendorRoutes.delete("/:vendorId/documents/:documentId", deleteDocument);
