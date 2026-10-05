import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchDashboard } from "../api/dashboard";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { errorMessage, formatCurrency, formatLabel } from "../utils/format";

export function DashboardPage() {
  const stats = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });

  if (stats.isLoading) return <LoadingState label="Loading dashboard" />;
  if (stats.isError) return <ErrorState message={errorMessage(stats.error)} onRetry={() => stats.refetch()} />;
  if (!stats.data) return null;

  const cards = [
    ["Total vendors", stats.data.totalVendors],
    ["Active vendors", stats.data.activeVendors],
    ["Open requirements", stats.data.openRequirements],
    ["Expiring documents", stats.data.expiringDocuments],
    ["Average rating", stats.data.averageVendorRating.toFixed(2)],
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-accent">Overview</p>
        <h2 className="text-2xl font-semibold">Operations dashboard</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Recent requirements</h3>
          <div className="mt-4 space-y-3">
            {stats.data.recentRequirements.length === 0 ? (
              <p className="text-sm text-ink-soft">No work requirements yet.</p>
            ) : (
              stats.data.recentRequirements.map((requirement) => (
                <Link key={requirement.id} to={`/work-requirements/${requirement.id}`} className="block rounded-xl border border-line px-3 py-3 hover:bg-paper">
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
        <Card>
          <h3 className="font-semibold">Top recommended vendors</h3>
          <div className="mt-4 space-y-3">
            {stats.data.topRecommendations.length === 0 ? (
              <p className="text-sm text-ink-soft">Generate recommendations on a work requirement to populate this list.</p>
            ) : (
              stats.data.topRecommendations.map((item) => (
                <Link
                  key={item.id}
                  to={`/work-requirements/${item.workRequirement.id}/recommendations`}
                  className="block rounded-xl border border-line px-3 py-3 hover:bg-paper"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.vendor.name}</p>
                      <p className="text-sm text-ink-soft">
                        {item.workRequirement.title} · {formatLabel(item.recommendationLevel)}
                      </p>
                    </div>
                    <p className="text-lg font-semibold">{item.score}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
