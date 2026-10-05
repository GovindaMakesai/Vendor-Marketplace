import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createRequirement } from "../api/workRequirements";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input, TextArea } from "../components/Input";
import { Select } from "../components/Select";
import type { RequirementInput, RequirementPriority } from "../types";
import { errorMessage } from "../utils/format";

const initial: RequirementInput = {
  title: "",
  description: "",
  category: "",
  location: "",
  estimatedValue: 50000,
  priority: "MEDIUM",
  expectedStartDate: "",
  status: "OPEN",
};

export function WorkRequirementFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<RequirementInput>(initial);
  const mutation = useMutation({
    mutationFn: createRequirement,
    onSuccess: (requirement) => {
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate(`/work-requirements/${requirement.id}`);
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(form);
  }

  return (
    <div className="space-y-5">
      <div>
        <Link to="/work-requirements" className="text-sm font-semibold text-accent">
          Back to requirements
        </Link>
        <h2 className="mt-2 text-2xl font-semibold">New work requirement</h2>
      </div>
      <Card>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Input label="Title" name="title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <TextArea label="Description" name="description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
          </div>
          <Input label="Category" name="category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required />
          <Input label="Location" name="location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} required />
          <Input label="Estimated value" name="estimatedValue" type="number" min="1" step="1" value={form.estimatedValue} onChange={(event) => setForm({ ...form, estimatedValue: Number(event.target.value) })} required />
          <Select label="Priority" name="priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as RequirementPriority })}>
            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </Select>
          <Input label="Expected start date" name="expectedStartDate" type="date" min="1900-01-01" max="9999-12-31" value={form.expectedStartDate} onChange={(event) => setForm({ ...form, expectedStartDate: event.target.value })} required />
          {mutation.isError ? <p className="text-sm text-bad md:col-span-2">{errorMessage(mutation.error)}</p> : null}
          <div>
            <Button type="submit" loading={mutation.isPending}>
              Save requirement
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
