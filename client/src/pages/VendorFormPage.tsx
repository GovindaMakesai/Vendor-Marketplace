import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createVendor } from "../api/vendors";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input, TextArea } from "../components/Input";
import { Select } from "../components/Select";
import type { VendorInput, VendorStatus } from "../types";
import { errorMessage } from "../utils/format";

const initial: VendorInput = {
  name: "",
  vendorType: "Contractor",
  category: "",
  description: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "Australia",
  rating: 4,
  status: "ACTIVE",
};

export function VendorFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VendorInput>(initial);
  const mutation = useMutation({
    mutationFn: createVendor,
    onSuccess: (vendor) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate(`/vendors/${vendor.id}`);
    },
  });

  function update<K extends keyof VendorInput>(key: K, value: VendorInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(form);
  }

  return (
    <div className="space-y-5">
      <div>
        <Link to="/vendors" className="text-sm font-semibold text-accent">
          Back to vendors
        </Link>
        <h2 className="mt-2 text-2xl font-semibold">New vendor</h2>
      </div>
      <Card>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <Input label="Name" name="name" value={form.name} onChange={(event) => update("name", event.target.value)} required />
          <Input label="Type" name="vendorType" value={form.vendorType} onChange={(event) => update("vendorType", event.target.value)} required />
          <Input label="Category" name="category" value={form.category} onChange={(event) => update("category", event.target.value)} required />
          <Input label="Email" name="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
          <Input label="Phone" name="phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} required />
          <Input label="Rating (0-5)" name="rating" type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(event) => update("rating", Number(event.target.value))} required />
          <Select label="Status" name="status" value={form.status} onChange={(event) => update("status", event.target.value as VendorStatus)}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </Select>
          <Input label="Country" name="country" value={form.country} onChange={(event) => update("country", event.target.value)} required />
          <Input label="Address" name="address" value={form.address} onChange={(event) => update("address", event.target.value)} required />
          <Input label="City" name="city" value={form.city} onChange={(event) => update("city", event.target.value)} required />
          <Input label="State" name="state" value={form.state} onChange={(event) => update("state", event.target.value)} required />
          <div className="md:col-span-2">
            <TextArea label="Description" name="description" value={form.description} onChange={(event) => update("description", event.target.value)} required />
          </div>
          {mutation.isError ? <p className="text-sm text-bad md:col-span-2">{errorMessage(mutation.error)}</p> : null}
          <div className="md:col-span-2">
            <Button type="submit" loading={mutation.isPending}>
              Save vendor
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
