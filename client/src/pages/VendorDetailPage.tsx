import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createDocument, deleteDocument, fetchDocuments, updateDocument, type DocumentInput } from "../api/documents";
import { deleteVendor, fetchVendor, updateVendor } from "../api/vendors";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Input, TextArea } from "../components/Input";
import { LoadingState } from "../components/LoadingState";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { Table, Td, Th, THead } from "../components/Table";
import type { VendorDocument, VendorInput, VendorStatus } from "../types";
import { errorMessage, formatDate, toDateInput } from "../utils/format";

const emptyDocument: DocumentInput = {
  documentType: "TAX_REGISTRATION",
  documentNumber: "",
  issuedDate: "",
  expiryDate: "",
  status: "VALID",
  fileName: "",
  notes: "",
};

export function VendorDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const vendor = useQuery({ queryKey: ["vendor", id], queryFn: () => fetchVendor(id), enabled: Boolean(id) });
  const documents = useQuery({ queryKey: ["documents", id], queryFn: () => fetchDocuments(id), enabled: Boolean(id) });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<VendorInput | null>(null);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState<DocumentInput>(emptyDocument);
  const [editingDocument, setEditingDocument] = useState<VendorDocument | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveVendor = useMutation({
    mutationFn: (input: VendorInput) => updateVendor(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", id] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setEditing(false);
    },
  });
  const removeVendor = useMutation({
    mutationFn: () => deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/vendors");
    },
  });
  const saveDocument = useMutation({
    mutationFn: (input: DocumentInput) =>
      editingDocument ? updateDocument(id, editingDocument.id, input) : createDocument(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setDocumentOpen(false);
      setEditingDocument(null);
    },
  });
  const removeDocument = useMutation({
    mutationFn: (documentId: string) => deleteDocument(id, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (vendor.isLoading) return <LoadingState label="Loading vendor" />;
  if (vendor.isError) return <ErrorState message={errorMessage(vendor.error)} onRetry={() => vendor.refetch()} />;
  if (!vendor.data) return null;

  const record = vendor.data;
  const currentForm = form ?? {
    name: record.name,
    vendorType: record.vendorType,
    category: record.category,
    description: record.description,
    email: record.email,
    phone: record.phone,
    address: record.address,
    city: record.city,
    state: record.state,
    country: record.country,
    rating: record.rating,
    status: record.status,
  };

  function startEdit() {
    setForm(currentForm);
    setEditing(true);
  }

  function onSaveVendor(event: FormEvent) {
    event.preventDefault();
    if (form) saveVendor.mutate(form);
  }

  function openCreateDocument() {
    setEditingDocument(null);
    setDocumentForm(emptyDocument);
    setDocumentOpen(true);
  }

  function openEditDocument(document: VendorDocument) {
    setEditingDocument(document);
    setDocumentForm({
      documentType: document.documentType,
      documentNumber: document.documentNumber,
      issuedDate: toDateInput(document.issuedDate),
      expiryDate: toDateInput(document.expiryDate),
      status: document.status,
      fileName: document.fileName ?? "",
      notes: document.notes ?? "",
    });
    setDocumentOpen(true);
  }

  const required = ["TAX_REGISTRATION", "INSURANCE", "TRADE_LICENSE"];
  const present = new Set<string>((documents.data ?? []).filter((document) => document.status === "VALID").map((document) => document.documentType));
  const compliance = required.filter((type) => !present.has(type));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/vendors" className="text-sm font-semibold text-accent">
            Back to vendors
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold">{record.name}</h2>
            <Badge value={record.status} />
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {record.vendorType} · {record.category} · Rating {record.rating.toFixed(1)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={startEdit}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold">Profile</h3>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{record.description}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-soft">Email</dt>
              <dd>{record.email}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Phone</dt>
              <dd>{record.phone}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Address</dt>
              <dd>
                {record.address}, {record.city}, {record.state}, {record.country}
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Compliance</dt>
              <dd>{compliance.length === 0 ? "Required documents are valid" : `Needs attention: ${compliance.length} required document${compliance.length === 1 ? "" : "s"}`}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h3 className="font-semibold">Required documents</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {required.map((type) => (
              <li key={type} className="flex items-center justify-between gap-3">
                <span>{type === "TAX_REGISTRATION" ? "Tax registration" : type === "INSURANCE" ? "Insurance" : "Trade license"}</span>
                {present.has(type as "TAX_REGISTRATION" | "INSURANCE" | "TRADE_LICENSE") ? <Badge value="VALID" /> : <span className="text-xs font-semibold text-bad">Not valid</span>}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Documents</h3>
          <Button onClick={openCreateDocument}>Add document</Button>
        </div>
        {documents.isLoading ? <div className="mt-4"><LoadingState label="Loading documents" /></div> : null}
        {documents.isError ? <div className="mt-4"><ErrorState message={errorMessage(documents.error)} onRetry={() => documents.refetch()} /></div> : null}
        {documents.data && documents.data.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No documents stored" description="Add tax, insurance, and trade license metadata. Files are not uploaded." />
          </div>
        ) : null}
        {documents.data && documents.data.length > 0 ? (
          <div className="mt-4">
            <Table>
              <THead>
                <tr>
                  <Th>Type</Th>
                  <Th>Number</Th>
                  <Th>Issued</Th>
                  <Th>Expiry</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </THead>
              <tbody>
                {documents.data.map((document) => (
                  <tr key={document.id} className="border-b border-line last:border-0">
                    <Td>{document.documentType.replaceAll("_", " ")}</Td>
                    <Td>{document.documentNumber}</Td>
                    <Td>{formatDate(document.issuedDate)}</Td>
                    <Td>{formatDate(document.expiryDate)}</Td>
                    <Td>
                      <Badge value={document.status} />
                    </Td>
                    <Td>
                      <div className="flex gap-3">
                        <button type="button" className="font-semibold text-accent" onClick={() => openEditDocument(document)}>
                          Edit
                        </button>
                        <button type="button" className="font-semibold text-bad" onClick={() => removeDocument.mutate(document.id)}>
                          Delete
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : null}
        {removeDocument.isError ? <p className="mt-3 text-sm text-bad">{errorMessage(removeDocument.error)}</p> : null}
      </Card>

      <Modal title="Edit vendor" open={editing} onClose={() => setEditing(false)}>
        <form onSubmit={onSaveVendor} className="grid gap-3 sm:grid-cols-2">
          <Input label="Name" name="name" value={form?.name ?? ""} onChange={(event) => setForm({ ...currentForm, ...form, name: event.target.value })} required />
          <Input label="Category" name="category" value={form?.category ?? ""} onChange={(event) => setForm({ ...currentForm, ...form, category: event.target.value })} required />
          <Input label="City" name="city" value={form?.city ?? ""} onChange={(event) => setForm({ ...currentForm, ...form, city: event.target.value })} required />
          <Input label="State" name="state" value={form?.state ?? ""} onChange={(event) => setForm({ ...currentForm, ...form, state: event.target.value })} required />
          <Input label="Rating" name="rating" type="number" min="0" max="5" step="0.1" value={form?.rating ?? 0} onChange={(event) => setForm({ ...currentForm, ...form, rating: Number(event.target.value) })} required />
          <Select label="Status" name="status" value={form?.status ?? "ACTIVE"} onChange={(event) => setForm({ ...currentForm, ...form, status: event.target.value as VendorStatus })}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
          <div className="sm:col-span-2">
            <TextArea label="Description" name="description" value={form?.description ?? ""} onChange={(event) => setForm({ ...currentForm, ...form, description: event.target.value })} required />
          </div>
          {saveVendor.isError ? <p className="text-sm text-bad sm:col-span-2">{errorMessage(saveVendor.error)}</p> : null}
          <Button type="submit" loading={saveVendor.isPending}>
            Save changes
          </Button>
        </form>
      </Modal>

      <Modal title={editingDocument ? "Edit document" : "Add document"} open={documentOpen} onClose={() => setDocumentOpen(false)}>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            saveDocument.mutate(documentForm);
          }}
        >
          <Select label="Type" name="documentType" value={documentForm.documentType} onChange={(event) => setDocumentForm({ ...documentForm, documentType: event.target.value })}>
            {["TAX_REGISTRATION", "INSURANCE", "TRADE_LICENSE", "SAFETY_CERTIFICATE", "AGREEMENT", "OTHER"].map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          <Input label="Number" name="documentNumber" value={documentForm.documentNumber} onChange={(event) => setDocumentForm({ ...documentForm, documentNumber: event.target.value })} required />
          <Input label="Issued" name="issuedDate" type="date" min="1900-01-01" max="9999-12-31" value={documentForm.issuedDate} onChange={(event) => setDocumentForm({ ...documentForm, issuedDate: event.target.value })} required />
          <Input label="Expiry" name="expiryDate" type="date" min="1900-01-01" max="9999-12-31" value={documentForm.expiryDate} onChange={(event) => setDocumentForm({ ...documentForm, expiryDate: event.target.value })} required />
          <Select label="Status" name="status" value={documentForm.status} onChange={(event) => setDocumentForm({ ...documentForm, status: event.target.value })}>
            <option value="VALID">Valid</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired</option>
          </Select>
          <Input label="File name" name="fileName" value={documentForm.fileName} onChange={(event) => setDocumentForm({ ...documentForm, fileName: event.target.value })} />
          <div className="sm:col-span-2">
            <TextArea label="Notes" name="notes" value={documentForm.notes} onChange={(event) => setDocumentForm({ ...documentForm, notes: event.target.value })} />
          </div>
          {saveDocument.isError ? <p className="text-sm text-bad sm:col-span-2">{errorMessage(saveDocument.error)}</p> : null}
          <Button type="submit" loading={saveDocument.isPending}>
            Save document
          </Button>
        </form>
      </Modal>

      <Modal title="Delete vendor" open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <p className="text-sm text-ink-soft">This removes the vendor, stored document metadata, and any recommendations that reference them.</p>
        {removeVendor.isError ? <p className="mt-3 text-sm text-bad">{errorMessage(removeVendor.error)}</p> : null}
        <div className="mt-4 flex gap-2">
          <Button variant="danger" loading={removeVendor.isPending} onClick={() => removeVendor.mutate()}>
            Delete vendor
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
