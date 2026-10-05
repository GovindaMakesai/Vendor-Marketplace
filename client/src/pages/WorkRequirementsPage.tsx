import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { fetchRequirements } from "../api/workRequirements";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Input } from "../components/Input";
import { LoadingState } from "../components/LoadingState";
import { Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { Table, Td, Th, THead } from "../components/Table";
import { errorMessage, formatCurrency, formatDate } from "../utils/format";

export function WorkRequirementsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [applied, setApplied] = useState({ status: "", priority: "", category: "", location: "" });

  const requirements = useQuery({
    queryKey: ["requirements", page, applied],
    queryFn: () => fetchRequirements({ page, limit: 8, ...applied }),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-accent">Work</p>
          <h2 className="text-2xl font-semibold">Requirements</h2>
        </div>
        <Link to="/work-requirements/new">
          <Button>New requirement</Button>
        </Link>
      </div>
      <form
        className="grid gap-3 rounded-2xl border border-line bg-card p-4 md:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setApplied({ status, priority, category, location });
        }}
      >
        <Select label="Status" name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {["DRAFT", "OPEN", "RECOMMENDATIONS_GENERATED", "AWARDED", "CLOSED"].map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
        <Select label="Priority" name="priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option value="">All priorities</option>
          {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Input label="Category" name="category" value={category} onChange={(event) => setCategory(event.target.value)} />
        <Input label="Location" name="location" value={location} onChange={(event) => setLocation(event.target.value)} />
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            Apply filters
          </Button>
        </div>
      </form>
      {requirements.isLoading ? <LoadingState label="Loading requirements" /> : null}
      {requirements.isError ? <ErrorState message={errorMessage(requirements.error)} onRetry={() => requirements.refetch()} /> : null}
      {requirements.data && requirements.data.items.length === 0 ? (
        <EmptyState title="No requirements yet" description="Create a work requirement to generate a ranked vendor list." />
      ) : null}
      {requirements.data && requirements.data.items.length > 0 ? (
        <div className="rounded-2xl border border-line bg-card p-2">
          <Table>
            <THead>
              <tr>
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Location</Th>
                <Th>Value</Th>
                <Th>Priority</Th>
                <Th>Start</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </THead>
            <tbody>
              {requirements.data.items.map((requirement) => (
                <tr key={requirement.id} className="border-b border-line last:border-0">
                  <Td className="font-medium">{requirement.title}</Td>
                  <Td>{requirement.category}</Td>
                  <Td>{requirement.location}</Td>
                  <Td>{formatCurrency(requirement.estimatedValue)}</Td>
                  <Td>
                    <Badge value={requirement.priority} />
                  </Td>
                  <Td>{formatDate(requirement.expectedStartDate)}</Td>
                  <Td>
                    <Badge value={requirement.status} />
                  </Td>
                  <Td>
                    <Link className="font-semibold text-accent" to={`/work-requirements/${requirement.id}`}>
                      Open
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="px-3 pb-2">
            <Pagination
              page={requirements.data.pagination.page}
              totalPages={requirements.data.pagination.totalPages}
              total={requirements.data.pagination.total}
              onPageChange={setPage}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
