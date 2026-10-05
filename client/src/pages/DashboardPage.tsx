import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchDashboard } from "../api/dashboard";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { BarList } from "../components/charts/BarList";
import { DonutChart } from "../components/charts/DonutChart";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useAuth } from "../hooks/auth-context";
import type { ChartPoint } from "../types";
import { errorMessage, formatCurrency, formatLabel } from "../utils/format";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#0f6f6a",
  INACTIVE: "#c4b8a5",
  SUSPENDED: "#a33b32",
  DRAFT: "#c4b8a5",
  OPEN: "#0f6f6a",
  RECOMMENDATIONS_GENERATED: "#1f7a4d",
  AWARDED: "#9a5424",
  CLOSED: "#5c6b78",
  VALID: "#1f7a4d",
  EXPIRED: "#a33b32",
  PENDING: "#9a6700",
  REJECTED: "#5c6b78",
  LOW: "#8aa8a6",
  MEDIUM: "#0f6f6a",
  HIGH: "#9a5424",
  CRITICAL: "#a33b32",
};

const CATEGORY_COLORS = ["#0f6f6a", "#1f7a4d", "#9a5424", "#9a6700", "#3d6f8f", "#5c6b78"];

function colorFor(label: string, index = 0) {
  return STATUS_COLORS[label] ?? CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

function bars(points: ChartPoint[], preserveLabel = false) {
  return points.map((point, index) => ({
    label: point.label,
    value: point.count,
    color: colorFor(point.label, index),
    preserveLabel,
  }));
}

export function DashboardPage() {
  const { user } = useAuth();
  const stats = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });

  if (stats.isLoading) return <LoadingState label="Loading dashboard" />;
  if (stats.isError) return <ErrorState message={errorMessage(stats.error)} onRetry={() => stats.refetch()} />;
  if (!stats.data) return null;

  const data = stats.data;
  const firstName = user?.name.split(" ")[0] ?? "there";
  const cards = [
    { label: "Total vendors", value: data.totalVendors, hint: "Every record on file", href: "/vendors" },
    { label: "Active vendors", value: data.activeVendors, hint: "Eligible to be ranked", href: "/vendors" },
    { label: "Open requirements", value: data.openRequirements, hint: "Waiting for a ranking", href: "/work-requirements" },
    { label: "Ranked requirements", value: data.recommendationsGenerated, hint: "Recommendations stored", href: "/work-requirements" },
    { label: "Expiring documents", value: data.expiringDocuments, hint: "Due within 30 days" },
  ];

  return (
    <div className="space-y-6">
      <section className="rise overflow-hidden rounded-3xl bg-ink px-6 py-6 text-white shadow-sm sm:px-8">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">
          <span className="pulse-dot h-2 w-2 rounded-full bg-teal-300" />
          Live operations view
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Hello, {firstName}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
          {data.activeVendors} active vendors can be ranked. Charts below summarise stored records. Scores and ranks still come from the recommendation engine.
        </p>
        <p className="mt-4 text-sm text-stone-400">
          Average vendor rating <span className="font-semibold text-white"><AnimatedNumber value={data.averageVendorRating} digits={2} /></span>
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card, index) => {
          const body = (
            <>
              <p className="text-sm text-ink-soft">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                <AnimatedNumber value={card.value} />
              </p>
              <p className="mt-2 text-xs text-ink-soft">{card.hint}</p>
            </>
          );
          const className = "rise block h-full transition duration-200 hover:-translate-y-0.5 hover:shadow-md";
          return card.href ? (
            <Link key={card.label} to={card.href} className={className} style={{ animationDelay: `${index * 50}ms` }}>
              <Card className="h-full">{body}</Card>
            </Link>
          ) : (
            <div key={card.label} className={className} style={{ animationDelay: `${index * 50}ms` }}>
              <Card className="h-full">{body}</Card>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rise" style={{ animationDelay: "80ms" }}>
          <h3 className="font-semibold">Vendor availability</h3>
          <p className="mt-1 text-sm text-ink-soft">Only active vendors enter a ranking.</p>
          <div className="mt-5">
            <DonutChart
              caption="Vendor counts by status"
              segments={data.vendorsByStatus.map((point) => ({
                label: point.label,
                value: point.count,
                color: colorFor(point.label),
              }))}
            />
          </div>
        </Card>
        <Card className="rise" style={{ animationDelay: "120ms" }}>
          <h3 className="font-semibold">Requirement pipeline</h3>
          <p className="mt-1 text-sm text-ink-soft">Where each work requirement sits right now.</p>
          <div className="mt-5">
            <BarList items={bars(data.requirementsByStatus)} empty="No work requirements yet." />
          </div>
        </Card>
        <Card className="rise" style={{ animationDelay: "160ms" }}>
          <h3 className="font-semibold">Document health</h3>
          <p className="mt-1 text-sm text-ink-soft">Compliance documents already recorded for vendors.</p>
          <div className="mt-5">
            <BarList items={bars(data.documentsByStatus)} empty="No documents recorded yet." />
          </div>
        </Card>
        <Card className="rise" style={{ animationDelay: "200ms" }}>
          <h3 className="font-semibold">Requirement priority</h3>
          <p className="mt-1 text-sm text-ink-soft">How urgent the current work is.</p>
          <div className="mt-5">
            <BarList items={bars(data.requirementsByPriority)} empty="No work requirements yet." />
          </div>
        </Card>
      </div>

      <Card className="rise" style={{ animationDelay: "240ms" }}>
        <h3 className="font-semibold">Vendors by category</h3>
        <p className="mt-1 text-sm text-ink-soft">The six largest categories on file.</p>
        <div className="mt-5">
          <BarList items={bars(data.vendorsByCategory, true)} empty="Add a vendor to see categories here." />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rise" style={{ animationDelay: "280ms" }}>
          <h3 className="font-semibold">Recent requirements</h3>
          <div className="mt-4 space-y-3">
            {data.recentRequirements.length === 0 ? (
              <p className="text-sm text-ink-soft">No work requirements yet.</p>
            ) : (
              data.recentRequirements.map((requirement) => (
                <Link key={requirement.id} to={`/work-requirements/${requirement.id}`} className="block rounded-xl border border-line px-3 py-3 transition duration-200 hover:-translate-y-0.5 hover:bg-paper">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{requirement.title}</p>
                      <p className="text-sm text-ink-soft">
                        {requirement.category} · {requirement.location} · {formatCurrency(requirement.estimatedValue)}
                      </p>
                    </div>
                    <Badge value={requirement.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
        <Card className="rise" style={{ animationDelay: "320ms" }}>
          <h3 className="font-semibold">Leading recommendation scores</h3>
          <p className="mt-1 text-sm text-ink-soft">Rank 1 for each requirement that already has a stored ranking.</p>
          <div className="mt-4">
            {data.topRecommendations.length === 0 ? (
              <p className="text-sm text-ink-soft">Generate recommendations on a work requirement to populate this list.</p>
            ) : (
              <BarList
                items={data.topRecommendations.map((item) => ({
                  label: item.vendor.name,
                  value: item.score,
                  color: "#0f6f6a",
                  detail: `${item.score} · ${formatLabel(item.recommendationLevel)}`,
                  preserveLabel: true,
                }))}
                empty="Generate recommendations on a work requirement to populate this list."
              />
            )}
            <div className="mt-4 space-y-2">
              {data.topRecommendations.map((item) => (
                <Link key={item.id} to={`/work-requirements/${item.workRequirement.id}/recommendations`} className="block text-sm text-accent hover:underline">
                  {item.vendor.name} · {item.workRequirement.title}
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
