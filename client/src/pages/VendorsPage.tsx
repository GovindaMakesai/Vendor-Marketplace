import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { fetchVendors } from "../api/vendors";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Input } from "../components/Input";
import { LoadingState } from "../components/LoadingState";
import { Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { Table, Td, Th, THead } from "../components/Table";
import { errorMessage } from "../utils/format";

export function VendorsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [applied, setApplied] = useState({ search: "", category: "", status: "", city: "" });

  const vendors = useQuery({
    queryKey: ["vendors", page, applied],
    queryFn: () => fetchVendors({ page, limit: 8, ...applied }),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-accent">Register</p>
          <h2 className="text-2xl font-semibold">Vendors</h2>
        </div>
        <Link to="/vendors/new">
          <Button>New vendor</Button>
        </Link>
      </div>
      <form
        className="grid gap-3 rounded-2xl border border-line bg-card p-4 md:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setApplied({ search, category, status, city });
        }}
      >
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, city" />
        <Input label="Category" name="category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Electrical" />
        <Input label="Location" name="city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Sydney" />
        <Select label="Status" name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            Apply filters
          </Button>
        </div>
      </form>
      {vendors.isLoading ? <LoadingState label="Loading vendors" /> : null}
      {vendors.isError ? <ErrorState message={errorMessage(vendors.error)} onRetry={() => vendors.refetch()} /> : null}
      {vendors.data && vendors.data.items.length === 0 ? (
        <EmptyState title="No vendors match" description="Adjust the filters or add a vendor to the register." />
      ) : null}
      {vendors.data && vendors.data.items.length > 0 ? (
        <div className="rounded-2xl border border-line bg-card p-2">
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Category</Th>
                <Th>Location</Th>
                <Th>Rating</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </THead>
            <tbody>
              {vendors.data.items.map((vendor) => (
                <tr key={vendor.id} className="border-b border-line last:border-0">
                  <Td className="font-medium">{vendor.name}</Td>
                  <Td>{vendor.vendorType}</Td>
                  <Td>{vendor.category}</Td>
                  <Td>
                    {vendor.city}, {vendor.state}
                  </Td>
                  <Td>{vendor.rating.toFixed(1)}</Td>
                  <Td>
                    <Badge value={vendor.status} />
                  </Td>
                  <Td>
                    <Link className="font-semibold text-accent" to={`/vendors/${vendor.id}`}>
                      View
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="px-3 pb-2">
            <Pagination
              page={vendors.data.pagination.page}
              totalPages={vendors.data.pagination.totalPages}
              total={vendors.data.pagination.total}
              onPageChange={setPage}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
