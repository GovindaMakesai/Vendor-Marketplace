import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteRequirement, fetchRequirement, generateRecommendations, updateRequirement } from "../api/workRequirements";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ErrorState } from "../components/ErrorState";
import { Input, TextArea } from "../components/Input";
import { LoadingState } from "../components/LoadingState";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import type { RequirementInput, RequirementPriority, RequirementStatus } from "../types";
import { errorMessage, formatCurrency, formatDate, toDateInput } from "../utils/format";

export function WorkRequirementDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requirement = useQuery({ queryKey: ["requirement", id], queryFn: () => fetchRequirement(id), enabled: Boolean(id) });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<RequirementInput | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = useMutation({
    mutationFn: (input: RequirementInput) => updateRequirement(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirement", id] });
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setEditing(false);
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteRequirement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/work-requirements");
    },
  });
  const generate = useMutation({
    mutationFn: () => generateRecommendations(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requirement", id] });
      queryClient.invalidateQueries({ queryKey: ["recommendations", id] });
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate(`/work-requirements/${id}/recommendations`);
    },
  });

  if (requirement.isLoading) return <LoadingState label="Loading requirement" />;
  if (requirement.isError) return <ErrorState message={errorMessage(requirement.error)} onRetry={() => requirement.refetch()} />;
  if (!requirement.data) return null;

  const record = requirement.data;
  const locked = record.status === "AWARDED" || record.status === "CLOSED";

  function startEdit() {
    setForm({
      title: record.title,
      description: record.description,
      category: record.category,
      location: record.location,
      estimatedValue: record.estimatedValue,
      priority: record.priority,
      expectedStartDate: toDateInput(record.expectedStartDate),
      status: record.status,
    });
    setEditing(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (form) save.mutate(form);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/work-requirements" className="text-sm font-semibold text-accent">
            Back to requirements
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold">{record.title}</h2>
            <Badge value={record.status} />
            <Badge value={record.priority} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={startEdit}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
          <Button loading={generate.isPending} disabled={locked} onClick={() => generate.mutate()}>
            Generate recommendations
          </Button>
        </div>
      </div>
      {generate.isError ? <ErrorState message={errorMessage(generate.error)} /> : null}
      <Card>
        <p className="text-sm leading-6 text-ink-soft">{record.description}</p>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-ink-soft">Category</dt>
            <dd className="font-medium">{record.category}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Location</dt>
            <dd className="font-medium">{record.location}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Estimated value</dt>
            <dd className="font-medium">{formatCurrency(record.estimatedValue)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Expected start</dt>
            <dd className="font-medium">{formatDate(record.expectedStartDate)}</dd>
          </div>
        </dl>
        <div className="mt-5">
          <Link className="text-sm font-semibold text-accent" to={`/work-requirements/${record.id}/recommendations`}>
            View ranked vendors
          </Link>
        </div>
      </Card>

      <Modal title="Edit requirement" open={editing} onClose={() => setEditing(false)}>
        <form onSubmit={onSubmit} className="grid gap-3">
          <Input label="Title" name="title" value={form?.title ?? ""} onChange={(event) => setForm({ ...(form as RequirementInput), title: event.target.value })} required />
          <TextArea label="Description" name="description" value={form?.description ?? ""} onChange={(event) => setForm({ ...(form as RequirementInput), description: event.target.value })} required />
          <Input label="Category" name="category" value={form?.category ?? ""} onChange={(event) => setForm({ ...(form as RequirementInput), category: event.target.value })} required />
          <Input label="Location" name="location" value={form?.location ?? ""} onChange={(event) => setForm({ ...(form as RequirementInput), location: event.target.value })} required />
          <Input label="Estimated value" name="estimatedValue" type="number" min="1" value={form?.estimatedValue ?? 0} onChange={(event) => setForm({ ...(form as RequirementInput), estimatedValue: Number(event.target.value) })} required />
          <Select label="Priority" name="priority" value={form?.priority ?? "MEDIUM"} onChange={(event) => setForm({ ...(form as RequirementInput), priority: event.target.value as RequirementPriority })}>
            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </Select>
          <Input label="Expected start" name="expectedStartDate" type="date" min="1900-01-01" max="9999-12-31" value={form?.expectedStartDate ?? ""} onChange={(event) => setForm({ ...(form as RequirementInput), expectedStartDate: event.target.value })} required />
          <Select label="Status" name="status" value={form?.status ?? "OPEN"} onChange={(event) => setForm({ ...(form as RequirementInput), status: event.target.value as RequirementStatus })}>
            {["DRAFT", "OPEN", "RECOMMENDATIONS_GENERATED", "AWARDED", "CLOSED"].map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
          {save.isError ? <p className="text-sm text-bad">{errorMessage(save.error)}</p> : null}
          <Button type="submit" loading={save.isPending}>
            Save changes
          </Button>
        </form>
      </Modal>

      <Modal title="Delete requirement" open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <p className="text-sm text-ink-soft">Stored recommendations for this requirement will also be removed.</p>
        {remove.isError ? <p className="mt-3 text-sm text-bad">{errorMessage(remove.error)}</p> : null}
        <div className="mt-4 flex gap-2">
          <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
            Delete requirement
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
